import { RunTargetActionReq, RunTargetActionResp, HostResult } from './host_pb'
import { WeiruiKernelError, MemoryOutOfBounds } from './errors'
import type { RobotAppExports } from './app.wasm.d.ts';
import { MuJoCoInstance } from '../../mujoco_wasm/MujocoInstance.ts';
import { globalFileTree } from '../../components/sidebar/FileTree.ts';

let robotAppExports: RobotAppExports | null = null;

export class WeiruiKernel {
    mujocoInstance: MuJoCoInstance;
    wasmInstance: WebAssembly.Instance | null = null;
    robotAppPath: string;
    exports : RobotAppExports | null = null;
    public constructor(robotPath: string, scenePath: string, robotAppPath: string) {
        this.mujocoInstance = new MuJoCoInstance(robotPath)
        this.robotAppPath = robotAppPath;
    }
    public async init() {
        let file_item = globalFileTree.findItemByPath(this.robotAppPath)
        this.wasmInstance = await this.loadWasm(file_item?.content!)
        this.exports = this.wasmInstance.exports as RobotAppExports;
    }
    public async loadWasm(wasm_buffer: ArrayBuffer): Promise<WebAssembly.Instance> {
        const imports: WebAssembly.Imports = {
            // 模块名: "env"
            env: {
                run_target_action: (ptr: number, len: number): number => {
                    return this.RunHostFunc(ptr, len, RunTargetActionReq, this.runTargetAction)
                }
            }
        };
        const module = await WebAssembly.instantiate(wasm_buffer, imports);
        return module.instance;
    }
    readClass<T>(
        clazz: { decode: (bytes: Uint8Array) => T },
        memory: WebAssembly.Memory,
        ptr: number,
        length: number
    ): T | WeiruiKernelError {
        try {
            // Check if we have enough memory
            if (ptr + length > memory.buffer.byteLength) {
                return new MemoryOutOfBounds('Memory access out of bounds');
            }

            // Read the serialized data
            const serializedData = new Uint8Array(memory.buffer, ptr, length);

            // Deserialize the data using the class's decode method
            return clazz.decode(serializedData);
        } catch (error) {
            return new WeiruiKernelError(500, `Deserialization failed: ${(error as Error).message}`);
        }
    }

    runTargetAction(req: RunTargetActionReq): RunTargetActionResp | WeiruiKernelError {
        // Print the parameters for debugging
        console.log('runTargetAction called with:');
        console.log('Servo IDs:', req.servoIdVec);
        console.log('Target radians:', req.targetRadVec);

        // Get servo IDs and target radians
        const servoIds = req.servoIdVec;
        const targetRadians = req.targetRadVec;

        // Validate input lengths
        if (servoIds.length !== targetRadians.length) {
            return new WeiruiKernelError(400, 'Servo ID list and target radians list must have the same length');
        }

        // Apply target actions to Mujoco instance
        for (let i = 0; i < servoIds.length; i++) {
            // Convert from 1-based ID to 0-based index for Mujoco
            const actuatorIndex = servoIds[i] - 1;
            const targetValue = targetRadians[i];
            
            // Set actuator control in Mujoco
            this.mujocoInstance.setActuatorControl(actuatorIndex, targetValue);
        }

        // Get current joint positions
        let pos = this.mujocoInstance.getJointPos()
        console.log("joint pos=", pos);
        
        // Create a response object
        const resp = RunTargetActionResp.create();

        // Echo back the same data
        resp.servoIdVec = req.servoIdVec;
        resp.targetRadVec = req.targetRadVec;

        return resp;
    }

    WriteResp(host_result: HostResult): number {
        const writer = HostResult.encode(host_result);
        const data = writer.finish();
        let app_ptr = robotAppExports!.__new_bytes(data.length);
        const resp_buf = new Uint8Array(robotAppExports!.memory.buffer, app_ptr, data.length);
        resp_buf.set(data)
        return app_ptr;
    }

    RunHostFunc<ReqType, RespType>(
        ptr: number,
        len: number,
        clazz: { decode: (bytes: Uint8Array) => ReqType },
        host_func: (req: ReqType) => RespType | WeiruiKernelError): number {
        if (!this.wasmInstance) {
            console.error('WASM module not loaded');
            return 0;
        }

        // Get memory from the WASM instance
        const memory = this.wasmInstance.exports.memory as WebAssembly.Memory;

        let result = HostResult.create();

        // Read the serialized request from WASM memory
        const runTargetActionReq = this.readClass(clazz, memory, ptr, len);

        if (runTargetActionReq instanceof WeiruiKernelError) {
            console.error('Failed to deserialize RunTargetActionReq:', runTargetActionReq.message);
            result.errorMessage = runTargetActionReq.message;
            result.errorCode = runTargetActionReq.errorCode;
            return this.WriteResp(result);
        }

        // Call the actual implementation
        const runTargetActionResp = host_func(runTargetActionReq);

        if (runTargetActionResp instanceof WeiruiKernelError) {
            console.error('runTargetAction failed:', runTargetActionResp.message);
            result.errorMessage = runTargetActionResp.message;
            result.errorCode = runTargetActionResp.errorCode;
            return this.WriteResp(result);
        }

        // Check if runTargetActionResp has encode method
        if (typeof (runTargetActionResp as any).encode === 'function') {
            const writer = (runTargetActionResp as any).encode();
            const data = writer.finish();
            result.data = data;
        } else {
            console.error('runTargetActionResp does not have encode method');
            result.errorMessage = 'Response object does not have encode method';
            result.errorCode = 500;
            return this.WriteResp(result);
        }

        return this.WriteResp(result);
    }
}
