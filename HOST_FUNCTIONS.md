# Host Functions Implementation Guide

This document explains how to implement host functions in the Weirui Kernel system, which allows WebAssembly (WASM) code running in a worker to call functions in the main thread.

## Overview

Host functions are functions that can be called from WASM code but are actually implemented in the host environment (JavaScript). In our system, this allows WASM code running in a Web Worker to communicate with the main thread to perform operations that are not possible within the WASM environment itself.

## Adding a New Host Function

To add a new host function, you need to make changes in several files:

### 1. Define the Protocol Buffer Messages

First, define the request and response messages in `src/lib/weirui_kernel/host_pb.proto`:

```protobuf
// Example: ConsoleWriteReq for writing to console
message ConsoleWriteReq {
    optional string message = 1;
}
```

After modifying the proto file, regenerate the TypeScript code:

```bash
./protoc.sh
```

### 2. Add the Function to FuncTable

In `src/lib/weirui_kernel/func_table.ts`, add a new static method to the `FuncTable` class:

```typescript
public static consoleWrite(reqBuf: Uint8Array): Uint8Array {
    console.log('[WeiruiKernel/FuncTable] Requesting consoleWrite from main thread');
    const respData = syncRequest('consoleWrite', reqBuf);
    return new Uint8Array(respData);
}
```

### 3. Add the WASM Import Handler

In `src/lib/weirui_kernel/host_func.ts`:

1. Import the new request type:
```typescript
import { HostResult, ConsoleWriteReq } from './host_pb'
```

2. Add the function to the WASM imports:
```typescript
const imports: WebAssembly.Imports = {
    env: {
        console_write: (ptr: number, len: number): number => {
            console.log(`[WeiruiKernel] WASM calling console_write with ptr: ${ptr}, len: ${len}`);
            return this.RunHostFunc(ptr, len, FuncTable.consoleWrite)
        }
    }
};
```

### 4. Add the Main Thread Handler

In `src/lib/weirui_kernel/worker_client.ts`:

1. Import the new request type:
```typescript
import {
  ConsoleWriteReq
} from './host_pb';
```

2. Add a message handler:
```typescript
// 处理 consoleWrite 请求
if (type === 'consoleWrite' && id !== undefined) {
  try {
    const req = ConsoleWriteReq.decode(data as Uint8Array);
    console.log(`[WeiruiKernelWorkerClient] Console output: ${req.message}`);
    this.writeResponseToSAB({ success: true, data: null });
  } catch (err) {
    this.writeResponseToSAB({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
  return;
}
```

## How It Works

1. WASM code calls the imported function (e.g., `console_write`)
2. The host function wrapper (`RunHostFunc`) is invoked in `host_func.ts`
3. The function forwards the call to `FuncTable.consoleWrite`
4. `FuncTable` sends a synchronous message to the main thread via `syncRequest`
5. The worker client in `worker_client.ts` receives the message and processes it
6. The response is sent back through shared buffers
7. The result is returned to the WASM code

## Example Usage in WASM Code

To use the new host function in WASM code, you would:

1. Import the function in your WASM module:
```wat
(import "env" "console_write" (func $console_write (param i32 i32) (result i32)))
```

2. Encode a `ConsoleWriteReq` message and call the function:
```rust
// Example in Rust
let message = "Hello from WASM!";
let req = ConsoleWriteReq { message: message.to_string() };
let encoded = req.encode_to_vec();
let result_ptr = console_write(encoded.as_ptr() as i32, encoded.len() as i32);
```

## Error Handling

All host functions should handle errors gracefully:
- Errors in the main thread should be caught and returned as error responses
- WASM code should check the error code in the `HostResult` response
- Proper error messages should be provided for debugging

## Existing Host Functions

Currently implemented host functions include:
- `run_target_action`: For controlling robot actuators
- `get_actuator_info`: For retrieving information about robot actuators
- `get_joint_info`: For retrieving information about robot joints
- `console_write`: For writing messages to the console (newly implemented)