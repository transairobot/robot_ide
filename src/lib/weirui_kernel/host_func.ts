import { RunTargetActionReq, RunTargetActionResp, HostResult } from './host_pb'
import { WeiruiKernelError, MemoryOutOfBounds } from './errors'
import type { RobotAppExports } from './app.wasm.d.ts';
import { MuJoCoInstance } from '@/mujoco_wasm/MujocoInstance';


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
        this.robotAppExports = this.wasmInstance.exports as RobotAppExports;
        console.log('[WeiruiKernel] WASM module loaded successfully');
        
        // 初始化MuJoCo实例 - 这里需要根据实际需求进行调整
        // 目前我们只是添加一个占位符，实际实现可能需要从WASM或其他来源获取模型文件
        // this.mujocoInstance = new MuJoCoInstance(/* model filepath */);
    }

    public async loadWasm(wasm_buffer: ArrayBuffer): Promise<WebAssembly.Instance> {
        console.log('[WeiruiKernel] Loading WASM module');
        const imports: WebAssembly.Imports = {
            // 模块名: "env"
            env: {
                run_target_action: (ptr: number, len: number): number => {
                    console.log(`[WeiruiKernel] WASM calling run_target_action with ptr: ${ptr}, len: ${len}`);
                    return this.RunHostFunc(ptr, len, RunTargetActionReq, this.runTargetAction)
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
        for (let i = 0; i < servoIds.length; i++) {
            // Convert from 1-based ID to 0-based index for Mujoco
            const actuatorIndex = servoIds[i] - 1;
            const targetValue = targetRadians[i];

            // Set actuator control in Mujoco
            console.log(`[WeiruiKernel] Setting actuator ${actuatorIndex} to ${targetValue}`);
            this.mujocoInstance.setActuatorControl(actuatorIndex, targetValue);
        }

        // Get current joint positions
        console.log('[WeiruiKernel] Getting joint positions');
        let pos = this.mujocoInstance.getJointPos()
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
        let app_ptr = this.robotAppExports!.__new_bytes(data.length);
        console.log(`[WeiruiKernel] Allocated ${data.length} bytes in WASM memory at ptr: ${app_ptr}`);
        const resp_buf = new Uint8Array(this.robotAppExports!.memory.buffer, app_ptr, data.length);
        resp_buf.set(data)
        console.log('[WeiruiKernel] Copied response data to WASM memory');
        return app_ptr;
    }

    RunHostFunc<ReqType, RespType>(
        ptr: number,
        len: number,
        clazz: { decode: (bytes: Uint8Array) => ReqType },
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
        const runTargetActionReq = this.readClass(clazz, memory, ptr, len);

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

        // Check if runTargetActionResp has encode method
        if (typeof (runTargetActionResp as any).encode === 'function') {
            console.log('[WeiruiKernel] Encoding response');
            const writer = (runTargetActionResp as any).encode();
            const data = writer.finish();
            result.data = data;
            console.log(`[WeiruiKernel] Encoded response: ${data.length} bytes`);
        } else {
            console.error('[WeiruiKernel] runTargetActionResp does not have encode method');
            result.errorMessage = 'Response object does not have encode method';
            result.errorCode = 500;
            return this.WriteResp(result);
        }

        console.log('[WeiruiKernel] Writing response to WASM memory');
        return this.WriteResp(result);
    }

    /**
     * 获取关节位置
     * @returns Float32Array 关节位置数组
     */
    public getJointPos(): Float32Array {
        if (!this.mujocoInstance) {
            throw new Error('MuJoCo instance not initialized');
        }
        return this.mujocoInstance.getJointPos();
    }

    /**
     * 设置执行器控制值
     * @param actuatorIndices 执行器索引数组
     * @param values 控制值数组
     */
    public setActuatorControls(actuatorIndices: number[], values: number[]): void {
        if (!this.mujocoInstance) {
            throw new Error('MuJoCo instance not initialized');
        }
        this.mujocoInstance.setActuatorControls(actuatorIndices, values);
    }
}
