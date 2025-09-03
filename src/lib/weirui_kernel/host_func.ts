import { RunTargetActionReq, RunTargetActionResp, HostResult } from './host_pb'
import { WeiruiKernelError, MemoryOutOfBounds } from './errors'
import type { RobotAppExports } from './app.wasm.d.ts';
import { MuJoCoInstance } from '@/mujoco_wasm/MujocoInstance';
import { FuncTable } from './func_table.ts';


export class WeiruiKernel {
    wasmInstance: WebAssembly.Instance | null = null;
    robotAppWasm: ArrayBuffer;
    robotAppExports: RobotAppExports | null = null;
    mujocoInstance: MuJoCoInstance | null = null;
    public constructor(robotAppWasm: ArrayBuffer) {
        this.robotAppWasm = robotAppWasm;
    }

    public async init() {
        console.log('[WeiruiKernel] Initializing WASM module');
        this.wasmInstance = await this.loadWasm(this.robotAppWasm);
        console.log('[WeiruiKernel] WASM module loaded, extracting exports: ',
            this.wasmInstance.exports);
        this.robotAppExports = this.wasmInstance.exports as RobotAppExports;
        console.log('[WeiruiKernel] WASM module loaded successfully');
    }

    public start() {
        if (this.robotAppExports) {
            console.log('[WeiruiKernel] Starting main function in WASM module');
            this.robotAppExports!.main();
        }
    }

    public async loadWasm(wasm_buffer: ArrayBuffer): Promise<WebAssembly.Instance> {
        console.log('[WeiruiKernel] Loading WASM module');
        const imports: WebAssembly.Imports = {
            // 模块名: "env"
            env: {
                run_target_action: (ptr: number, len: number): number => {
                    console.log(`[WeiruiKernel] WASM calling run_target_action with ptr: ${ptr}, len: ${len}`);
                    return this.RunHostFunc(ptr, len, RunTargetActionReq, RunTargetActionResp, this.runTargetAction)
                }
            }
        };
        console.log('[WeiruiKernel] Instantiating WASM module');
        const module = await WebAssembly.instantiate(wasm_buffer, imports);
        console.log('[WeiruiKernel] WASM module instantiated successfully');
        return module.instance;
    }
    readClass<T>(
        clazz: { decode: (bytes: Uint8Array) => T },
        memory: WebAssembly.Memory,
        ptr: number,
        length: number
    ): T | WeiruiKernelError {
        try {
            console.log(`[WeiruiKernel] Reading class from WASM memory at ptr: ${ptr}, length: ${length}`);
            // Check if we have enough memory
            if (ptr + length > memory.buffer.byteLength) {
                console.error(`[WeiruiKernel] Memory access out of bounds: ptr(${ptr}) + length(${length}) > buffer size(${memory.buffer.byteLength})`);
                return new MemoryOutOfBounds('Memory access out of bounds');
            }

            // Read the serialized data
            const serializedData = new Uint8Array(memory.buffer, ptr, length);
            console.log(`[WeiruiKernel] Read ${serializedData.length} bytes from WASM memory`);

            // Deserialize the data using the class's decode method
            const result = clazz.decode(serializedData);
            console.log('[WeiruiKernel] Deserialized data successfully');
            return result;
        } catch (error) {
            console.error('[WeiruiKernel] Deserialization failed:', error);
            return new WeiruiKernelError(500, `Deserialization failed: ${(error as Error).message}`);
        }
    }

    runTargetAction(req: RunTargetActionReq): RunTargetActionResp | WeiruiKernelError {
        // Print the parameters for debugging
        console.log('[WeiruiKernel] runTargetAction called with:');
        console.log('[WeiruiKernel] Servo IDs:', req.servoIdVec);
        console.log('[WeiruiKernel] Target radians:', req.targetRadVec);

        // Get servo IDs and target radians
        const servoIds = req.servoIdVec;
        const targetRadians = req.targetRadVec;

        // Validate input lengths
        if (servoIds.length !== targetRadians.length) {
            console.error(`[WeiruiKernel] Servo ID list and target radians list must have the same length: ${servoIds.length} vs ${targetRadians.length}`);
            return new WeiruiKernelError(400, 'Servo ID list and target radians list must have the same length');
        }

        // Apply target actions to Mujoco instance
        console.log(`[WeiruiKernel] Setting ${servoIds.length} actuator controls`);
        FuncTable.setActuatorControls(servoIds.map(id => id - 1), targetRadians);


        // Get current joint positions
        console.log('[WeiruiKernel] Getting joint positions');
        let pos = FuncTable.getJointPos();
        console.log(`[WeiruiKernel] Retrieved ${pos.length} joint positions`);

        // Create a response object
        const resp = RunTargetActionResp.create();
        console.log('[WeiruiKernel] Created response object');

        // Echo back the same data
        resp.servoIdVec = req.servoIdVec;
        resp.targetRadVec = req.targetRadVec;
        console.log('[WeiruiKernel] Populated response with request data');

        return resp;
    }

    WriteResp(host_result: HostResult): number {
        console.log('[WeiruiKernel] Writing response to WASM memory');
        const writer = HostResult.encode(host_result);
        const data = writer.finish();
        console.log(`[WeiruiKernel] Encoded response data: ${data.length} bytes`);
        let app_ptr = this.robotAppExports!.wasm_new_bytes(data.length);
        console.log(`[WeiruiKernel] Allocated ${data.length} bytes in WASM memory at ptr: ${app_ptr}`);
        const resp_buf = new Uint8Array(this.robotAppExports!.memory.buffer, app_ptr, data.length);
        resp_buf.set(data)
        console.log('[WeiruiKernel] Copied response data to WASM memory');
        return app_ptr;
    }

    RunHostFunc<ReqType, RespType>(
        ptr: number,
        len: number,
        reqClazz: { decode: (bytes: Uint8Array) => ReqType },
        respClazz: { encode: (message: RespType) => { finish: () => Uint8Array } },
        host_func: (req: ReqType) => RespType | WeiruiKernelError): number {
        console.log(`[WeiruiKernel] RunHostFunc called with ptr: ${ptr}, len: ${len}`);

        if (!this.wasmInstance) {
            console.error('[WeiruiKernel] WASM module not loaded');
            return 0;
        }

        // Get memory from the WASM instance
        const memory = this.wasmInstance.exports.memory as WebAssembly.Memory;
        console.log(`[WeiruiKernel] WASM memory size: ${memory.buffer.byteLength} bytes`);

        let result = HostResult.create();
        console.log('[WeiruiKernel] Created HostResult object');

        // Read the serialized request from WASM memory
        const runTargetActionReq = this.readClass(reqClazz, memory, ptr, len);

        if (runTargetActionReq instanceof WeiruiKernelError) {
            console.error('[WeiruiKernel] Failed to deserialize RunTargetActionReq:', runTargetActionReq.message);
            result.errorMessage = runTargetActionReq.message;
            result.errorCode = runTargetActionReq.errorCode;
            return this.WriteResp(result);
        }

        // Call the actual implementation
        console.log('[WeiruiKernel] Calling host function');
        const runTargetActionResp = host_func(runTargetActionReq);

        if (runTargetActionResp instanceof WeiruiKernelError) {
            console.error('[WeiruiKernel] runTargetAction failed:', runTargetActionResp.message);
            result.errorMessage = runTargetActionResp.message;
            result.errorCode = runTargetActionResp.errorCode;
            return this.WriteResp(result);
        }

        console.log('[WeiruiKernel] Encoding response');
        const writer = respClazz.encode(runTargetActionResp);
        const data = writer.finish();
        result.data = data;
        console.log(`[WeiruiKernel] Encoded response: ${data.length} bytes`);

        console.log('[WeiruiKernel] Writing response to WASM memory');
        return this.WriteResp(result);
    }
}
