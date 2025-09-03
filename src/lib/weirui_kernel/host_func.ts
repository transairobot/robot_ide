import { HostResult, ConsoleWriteReq } from './host_pb'
import { WeiruiKernelError, MemoryOutOfBounds, InternalError } from './errors'
import type { RobotAppExports } from './app.wasm.d.ts';
import { FuncTable } from './func_table.ts';


export class WeiruiKernel {
    wasmInstance: WebAssembly.Instance | null = null;
    robotAppWasm: ArrayBuffer;
    robotAppExports: RobotAppExports | null = null;

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
                    return this.RunHostFunc(ptr, len, FuncTable.runTargetAction)
                },
                get_actuator_info: (ptr: number, len: number): number => {
                    console.log(`[WeiruiKernel] WASM calling get_actuator_info with ptr: ${ptr}, len: ${len}`);
                    return this.RunHostFunc(ptr, len, FuncTable.getActuatorInfo)
                },
                get_joint_info: (ptr: number, len: number): number => {
                    console.log(`[WeiruiKernel] WASM calling get_joint_info with ptr: ${ptr}, len: ${len}`);
                    return this.RunHostFunc(ptr, len, FuncTable.getJointInfo)
                },
                console_write: (ptr: number, len: number): number => {
                    console.log(`[WeiruiKernel] WASM calling console_write with ptr: ${ptr}, len: ${len}`);
                    return this.RunHostFunc(ptr, len, FuncTable.consoleWrite)
                }
            }
        };
        console.log('[WeiruiKernel] Instantiating WASM module');
        const module = await WebAssembly.instantiate(wasm_buffer, imports);
        console.log('[WeiruiKernel] WASM module instantiated successfully');
        return module.instance;
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

    RunHostFunc(
        ptr: number,
        len: number,
        host_func: (req: Uint8Array) => Uint8Array | WeiruiKernelError
    ): number {
        console.log(`[WeiruiKernel] RunHostFunc called with ptr: ${ptr}, len: ${len}`);

        if (!this.wasmInstance) {
            console.error('[WeiruiKernel] WASM module not loaded');
            const errRes = HostResult.create({ errorCode: 500, errorMessage: "WASM module not loaded" });
            return this.WriteResp(errRes);
        }

        const memory = this.wasmInstance.exports.memory as WebAssembly.Memory;
        let result = HostResult.create();

        if (ptr + len > memory.buffer.byteLength) {
            let error = new MemoryOutOfBounds(`ptr=${ptr} len=${len} exceeds memory size ${memory.buffer.byteLength}`);
            result.errorMessage = error.message;
            result.errorCode = error.errorCode;
            return this.WriteResp(result);
        }
        const reqBuf = new Uint8Array(memory.buffer.slice(ptr, ptr + len));

        console.log('[WeiruiKernel] Calling host function with raw buffer');
        try {
            const respData = host_func(reqBuf);

            if (respData instanceof WeiruiKernelError) {
                result.errorMessage = respData.message;
                result.errorCode = respData.errorCode;
            } else {
                result.data = respData;
                console.log(`[WeiruiKernel] Received response buffer: ${respData.length} bytes`);
            }
        } catch (e) {
            const err = e as Error;
            console.error(`[WeiruiKernel] Error in host function: ${err.message}`);
            let error = new InternalError(err.message);
            result.errorMessage = error.message;
            result.errorCode = error.errorCode;
        }

        console.log('[WeiruiKernel] Writing response to WASM memory');
        return this.WriteResp(result);
    }
}