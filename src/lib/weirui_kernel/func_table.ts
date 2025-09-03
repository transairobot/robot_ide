/// <reference lib="webworker" />

let responseBuffer: SharedArrayBuffer | null = null;
let notificationBuffer: SharedArrayBuffer | null = null;
let notificationView: Int32Array | null = null;
let responseView: Uint8Array | null = null;
let messageId: number = 0;

function syncRequest(type: string, data?: any): any {
    if (!notificationView || !responseBuffer || !responseView) {
        throw new Error("[WeiruiKernel/FuncTable] Shared buffers not initialized, can't make sync request.");
    }

    // 1. Reset notification status
    Atomics.store(notificationView, 0, 0);

    // 2. Send request to main thread
    self.postMessage({ type, data, id: messageId++ });

    // 3. Wait for main thread to respond (with a timeout)
    const result = Atomics.wait(notificationView, 0, 0, 5000); // 5 second timeout

    if (result === 'timed-out') {
        throw new Error(`[WeiruiKernel/FuncTable] Request '${type}' timed out.`);
    }

    // 4. Read and decode response from buffer
    const zero_idx = responseView.indexOf(0);
    const valid_response = responseView.slice(0, zero_idx === -1 ? responseView.length : zero_idx);
    const decodedResponse = new TextDecoder().decode(valid_response);
    const response = JSON.parse(decodedResponse);

    if (!response.success) {
        throw new Error(response.error || `[WeiruiKernel/FuncTable] Unknown error during '${type}' request.`);
    }

    return response.data;
}


export class FuncTable {
    public static init(resBuf: SharedArrayBuffer, notifBuf: SharedArrayBuffer) {
        responseBuffer = resBuf;
        notificationBuffer = notifBuf;
        notificationView = new Int32Array(notificationBuffer);
        responseView = new Uint8Array(responseBuffer);
        console.log('[WeiruiKernel/FuncTable] Initialized with shared buffers.');
    }

    // 添加getJointPos函数用于获取关节位置
    public static getJointPos(): Float32Array {
        console.log('[WeiruiKernel/FuncTable] Requesting joint positions from main thread');
        return syncRequest('getJointPos');
    }

    // 添加setActuatorControls函数用于设置执行器控制
    public static setActuatorControls(actuatorIndices: number[], values: number[]): void {
        console.log('[WeiruiKernel/FuncTable] Requesting to set actuator controls from main thread', actuatorIndices, values);
        const data = { actuatorIndices, values };
        syncRequest('setActuatorControls', data);
    }
}