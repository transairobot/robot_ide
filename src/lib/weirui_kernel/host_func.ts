import { RunTargetActionReq, RunTargetActionResp, HostResult } from './host_pb'
import { WeiruiKernelError, MemoryOutOfBounds } from './errors'
import type { RobotAppExports } from './app.wasm.d.ts';
import * as jspb from "google-protobuf";

let wasmInstance: WebAssembly.Instance | null = null;
let robotAppExports: RobotAppExports | null = null;
async function loadWasm(wasm_buffer: ArrayBuffer) {
    const imports: WebAssembly.Imports = {
        // 模块名: "env"
        env: {
            runTargetAction: (ptr: number, len: number): number => {
                return RunHostFunc(ptr, len, RunTargetActionReq, runTargetAction)
            }
        }
    };
    const module = await WebAssembly.instantiate(wasm_buffer, imports);
    wasmInstance = module.instance;
    robotAppExports = module.instance.exports as RobotAppExports;
}

function readClass<T>(
    clazz: { deserializeBinary: (bytes: Uint8Array) => T },
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

        // Deserialize the data using the class's deserializeBinary method
        return clazz.deserializeBinary(serializedData);
    } catch (error) {
        return new WeiruiKernelError(500, `Deserialization failed: ${(error as Error).message}`);
    }
}

function runTargetAction(req: RunTargetActionReq): RunTargetActionResp | WeiruiKernelError {
    // Print the parameters for debugging
    console.log('runTargetAction called with:');
    console.log('Servo IDs:', req.getServoIdVecList());
    console.log('Target radians:', req.getTargetRadVecList());

    // Create a response object
    const resp = new RunTargetActionResp();

    // For now, just echo back the same data
    resp.setServoIdVecList(req.getServoIdVecList());
    resp.setTargetRadVecList(req.getTargetRadVecList());

    return resp;
}

function WriteResp(host_result: HostResult): number {
    let data = host_result.serializeBinary();
    let app_ptr = robotAppExports!.__new_bytes(data.length);
    const resp_buf = new Uint8Array(robotAppExports!.memory.buffer, app_ptr, length);
    resp_buf.set(data)
    return app_ptr;
}

function RunHostFunc<ReqType, RespType extends { serializeBinary: () => Uint8Array }>(
    ptr: number, 
    len: number,
    clazz: { deserializeBinary: (bytes: Uint8Array) => ReqType },
    host_func: (req: ReqType) => RespType | WeiruiKernelError): number {
    if (!wasmInstance) {
        console.error('WASM module not loaded');
        return 0;
    }

    // Get memory from the WASM instance
    const memory = wasmInstance.exports.memory as WebAssembly.Memory;

    let result = new HostResult();

    // Read the serialized request from WASM memory
    const runTargetActionReq = readClass(clazz, memory, ptr, len);

    if (runTargetActionReq instanceof WeiruiKernelError) {
        console.error('Failed to deserialize RunTargetActionReq:', runTargetActionReq.message);
        result.setErrorMessage(runTargetActionReq.message);
        result.setErrorCode(runTargetActionReq.errorCode);
        return WriteResp(result);
    }

    // Call the actual implementation
    const runTargetActionResp = host_func(runTargetActionReq);

    if (runTargetActionResp instanceof WeiruiKernelError) {
        console.error('runTargetAction failed:', runTargetActionResp.message);
        result.setErrorMessage(runTargetActionResp.message);
        result.setErrorCode(runTargetActionResp.errorCode);
        return WriteResp(result);
    }

    result.setData(runTargetActionResp.serializeBinary());
    return WriteResp(result);
}
