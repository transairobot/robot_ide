import type { MuJoCoInstance } from '@/mujoco_wasm/MujocoInstance';
import type {
  Message, InitData, SetActuatorControlsData
} from './message';

export class WeiruiKernelWorkerClient {
  private worker: Worker;
  private messageId: number = 0;
  private pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();
  private workerReady: Promise<void>;
  private mujocoInstance: MuJoCoInstance; // 如果需要，可以定义具体类型

  constructor(
    workerScriptUrl: string | URL = new URL('./kernel_worker.ts', import.meta.url),
    mujocoInstance: MuJoCoInstance
  ) {
    console.log('[WeiruiKernelWorkerClient] Creating worker with URL:', workerScriptUrl);
    this.worker = new Worker(workerScriptUrl, { type: 'module' });

    // 创建一个 Promise 来跟踪 Worker 是否准备就绪
    this.workerReady = this.waitForWorkerReady();

    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = (error) => {
      console.error('[WeiruiKernelWorkerClient] Worker error:', error);
    };
    this.worker.onmessageerror = (error) => {
      console.error('[WeiruiKernelWorkerClient] Worker message error:', error);
    };
    this.mujocoInstance = mujocoInstance;
  }

  private async waitForWorkerReady(): Promise<void> {
    console.log('[WeiruiKernelWorkerClient] Waiting for worker to be ready...');

    // 使用轮询方式等待 Worker 准备就绪
    while (true) {
      try {
        await this.pingWorker();
        console.log('[WeiruiKernelWorkerClient] Worker is ready');
        return;
      } catch (error) {
        console.log('[WeiruiKernelWorkerClient] Worker not ready yet, retrying in 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private pingWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Ping timeout'));
      }, 1000); // 1秒超时

      this.pendingRequests.set(id, {
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      try {
        this.worker.postMessage({ type: 'ping', id });
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent) {
    console.log('[WeiruiKernelWorkerClient] Received message from worker:', event.data);
    const { type, success, data, error, id } = event.data;

    // 检查是否是有效的消息格式
    if (!type) {
      console.warn('[WeiruiKernelWorkerClient] Received message without type:', event.data);
      return;
    }

    // 处理 worker 准备就绪的消息 (可能没有 id)
    if (type === 'workerReady') {
      console.log('[WeiruiKernelWorkerClient] Worker is ready');
      // 这个消息不需要响应，它只是一个通知
      return;
    }

    // 处理 ping 响应
    if (type === 'pong' && id !== undefined) {
      if (this.pendingRequests.has(id)) {
        const { resolve } = this.pendingRequests.get(id)!;
        this.pendingRequests.delete(id);
        resolve();
      }
      return;
    }

    if (id !== undefined && this.pendingRequests.has(id)) {
      // 这是一个响应消息
      const { resolve, reject } = this.pendingRequests.get(id)!;
      this.pendingRequests.delete(id);

      console.log(`[WeiruiKernelWorkerClient] Resolving request ${id} for type: ${type}`);

      if (success) {
        resolve(data);
      } else {
        reject(new Error(error || 'Unknown error'));
      }
    } else {
      // 这是一个通知消息
      console.log('[WeiruiKernelWorkerClient] Received notification:', type, data);
    }
  }

  private async sendMessage(type: string, data?: any): Promise<any> {
    // 等待 Worker 准备就绪
    await this.workerReady;

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });

      console.log(`[WeiruiKernelWorkerClient] Sending message ${id} of type: ${type}`, data);

      try {
        this.worker.postMessage({ type, data, id });
        console.log(`[WeiruiKernelWorkerClient] Message ${id} sent successfully`);
      } catch (error) {
        console.error(`[WeiruiKernelWorkerClient] Failed to send message ${id}:`, error);
        // 从待处理请求中移除
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  /**
   * 初始化WeiruiKernel
   * @param robotPath 机器人模型路径
   * @param scenePath 场景路径
   * @param robotAppPath 机器人应用路径
   */
  public async init(robotAppWasm: ArrayBuffer): Promise<void> {
    console.log(`[WeiruiKernelWorkerClient] Initializing`);
    const initData: InitData = { robotAppWasm };
    await this.sendMessage('init', initData);
  }

  /**
   * 获取关节位置
   * @returns Promise<Float32Array> 关节位置数组
   */
  public async getJointPos(): Promise<Float32Array> {
    console.log(`[WeiruiKernelWorkerClient] Getting joint positions`);
    return await this.sendMessage('getJointPos');
  }

  /**
   * 设置执行器控制值
   * @param actuatorIndices 执行器索引数组
   * @param values 控制值数组
   * @returns Promise<void>
   */
  public async setActuatorControls(actuatorIndices: number[], values: number[]): Promise<void> {
    console.log(`[WeiruiKernelWorkerClient] Setting actuator controls`, actuatorIndices, values);
    const data: SetActuatorControlsData = { actuatorIndices, values };
    await this.sendMessage('setActuatorControls', data);
  }
}