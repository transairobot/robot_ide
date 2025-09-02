/// <reference lib="webworker" />

// 专门的 worker 文件，用于在 Web Worker 环境中运行
console.log('[WeiruiKernel] Loading kernel_worker.ts');

// 导入核心功能
import { WeiruiKernel } from './host_func.ts';
import type {
    Message, InitData
} from './message';

let globalWeiruiKernel: WeiruiKernel | null = null;

// 添加一个标志来检查 worker 是否正确初始化
let workerInitialized = false;

// 添加一个映射来跟踪待处理的请求
const pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();
let messageId: number = 0;

// Worker message handler
self.onmessage = function (e) {
    console.log(`[WeiruiKernel] onmessage handler called with data:`, e.data);

    // 检查事件数据格式
    if (!e || !e.data) {
        console.error('[WeiruiKernel] Invalid message event data:', e);
        // 即使数据格式无效，也要尝试发送错误响应
        try {
            self.postMessage({ type: 'error', success: false, error: 'Invalid message format' });
        } catch (postError) {
            console.error('[WeiruiKernel] Failed to send error response:', postError);
        }
        return;
    }

    const { type, data, id } = e.data as Message & { id?: number };

    // 如果这是第一条消息，标记 worker 已初始化并发送准备就绪通知
    if (!workerInitialized) {
        workerInitialized = true;
        console.log('[WeiruiKernel] Worker initialized and ready to process messages');
        // 通知主线程 Worker 已准备就绪
        try {
            self.postMessage({ type: 'workerReady' });
        } catch (postError) {
            console.error('[WeiruiKernel] Failed to send workerReady message:', postError);
        }
    }

    // 处理 ping 消息
    if (type === 'ping' && id !== undefined) {
        console.log('[WeiruiKernel] Received ping, responding with pong');
        self.postMessage({ type: 'pong', id });
        return;
    }

    // 处理 getJointPos 响应
    if (type === 'getJointPosResponse' && id !== undefined) {
        const { success, error } = e.data;
        if (pendingRequests.has(id)) {
            const { resolve, reject } = pendingRequests.get(id)!;
            pendingRequests.delete(id);
            
            if (success) {
                resolve(data);
            } else {
                reject(new Error(error || 'Unknown error'));
            }
        }
        return;
    }

    // 处理 setActuatorControls 响应
    if (type === 'setActuatorControlsResponse' && id !== undefined) {
        const { success, error } = e.data;
        if (pendingRequests.has(id)) {
            const { resolve, reject } = pendingRequests.get(id)!;
            pendingRequests.delete(id);
            
            if (success) {
                resolve(data);
            } else {
                reject(new Error(error || 'Unknown error'));
            }
        }
        return;
    }

    console.log(`[WeiruiKernel] Received message: ${type}`, data);

    switch (type) {
        case 'init':
            try {
                console.log('[WeiruiKernel] Initializing with data:', data);

                if (globalWeiruiKernel) {
                    console.warn('[WeiruiKernel] Already initialized');
                    self.postMessage({ type: 'init', success: true, id });
                    return;
                }

                const initData = data as InitData;
                console.log(`[WeiruiKernel] Creating new instance with robotPath`);

                globalWeiruiKernel = new WeiruiKernel(initData.robotAppWasm);
                globalWeiruiKernel.init().then(() => {
                    console.log('[WeiruiKernel] Initialization completed successfully');
                    self.postMessage({ type: 'init', success: true, id });
                }).catch((error) => {
                    console.error('[WeiruiKernel] Failed to initialize:', error);
                    self.postMessage({
                        type: 'init',
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        id
                    });
                });
            } catch (error) {
                console.error('[WeiruiKernel] Exception during initialization:', error);
                self.postMessage({
                    type: 'init',
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    id
                });
            }
            break;
        case 'getJointPos':
            // 请求主线程获取关节位置
            self.postMessage({ type: 'getJointPos', id });
            break;
        case 'setActuatorControls':
            // 请求主线程设置执行器控制
            self.postMessage({ type: 'setActuatorControls', data, id });
            break;
        default:
            console.warn('[WeiruiKernel] Unknown message type:', type);
            console.log('[WeiruiKernel] Message data:', data);
            // 发送未知消息类型的响应
            self.postMessage({
                type: 'unknownMessageType',
                success: false,
                error: `Unknown message type: ${type}`,
                id
            });
    }
};

console.log('[WeiruiKernel] kernel_worker.ts loaded successfully');

// 添加sendMessage函数用于向主线程发送消息并等待响应
function sendMessage(type: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const id = messageId++;
        pendingRequests.set(id, { resolve, reject });

        console.log(`[WeiruiKernel] Sending message ${id} of type: ${type}`, data);

        try {
            self.postMessage({ type, data, id });
            console.log(`[WeiruiKernel] Message ${id} sent successfully`);
        } catch (error) {
            console.error(`[WeiruiKernel] Failed to send message ${id}:`, error);
            // 从待处理请求中移除
            pendingRequests.delete(id);
            reject(error);
        }
    });
}

// 添加getJointPos函数用于获取关节位置
export function getJointPos(): Promise<Float32Array> {
    console.log('[WeiruiKernel] Requesting joint positions from main thread');
    return sendMessage('getJointPos');
}

// 添加setActuatorControls函数用于设置执行器控制
export function setActuatorControls(actuatorIndices: number[], values: number[]): Promise<void> {
    console.log('[WeiruiKernel] Requesting to set actuator controls from main thread', actuatorIndices, values);
    const data = { actuatorIndices, values };
    return sendMessage('setActuatorControls', data);
}

// 防止 TypeScript 报错
export { };