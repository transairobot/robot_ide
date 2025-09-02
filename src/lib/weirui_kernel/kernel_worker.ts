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
            try {
                if (!globalWeiruiKernel) {
                    throw new Error('Kernel not initialized');
                }
                // 这里需要访问MuJoCo实例来获取关节位置
                // 由于WeiruiKernel内部封装了MuJoCo，我们需要在WeiruiKernel中添加相应方法
                const jointPos = globalWeiruiKernel.getJointPos();
                self.postMessage({ type: 'getJointPos', success: true, data: jointPos, id });
            } catch (error) {
                console.error('[WeiruiKernel] Failed to get joint positions:', error);
                self.postMessage({
                    type: 'getJointPos',
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    id
                });
            }
            break;
        case 'setActuatorControls':
            try {
                if (!globalWeiruiKernel) {
                    throw new Error('Kernel not initialized');
                }
                // 这里需要访问MuJoCo实例来设置执行器控制
                const { actuatorIndices, values } = data;
                globalWeiruiKernel.setActuatorControls(actuatorIndices, values);
                self.postMessage({ type: 'setActuatorControls', success: true, id });
            } catch (error) {
                console.error('[WeiruiKernel] Failed to set actuator controls:', error);
                self.postMessage({
                    type: 'setActuatorControls',
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    id
                });
            }
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

// 防止 TypeScript 报错
export { };