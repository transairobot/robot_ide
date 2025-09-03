import { useConsoleStore } from '@/stores/console';
import { pinia } from '@/main';
import type { MuJoCoInstance } from '@/mujoco_wasm/MujocoInstance';
import {
  RunTargetActionReq, RunTargetActionResp, GetActuatorInfoResp, GetActuatorInfoReq,
  ActuatorType,
  GetJointInfoReq,
  GetJointInfoResp,
  JointType,
  ConsoleWriteReq
} from './host_pb';
import type {
  Message, InitData
} from './message';

export class WeiruiKernelWorkerClient {
  private worker: Worker;
  private messageId: number = 0;
  private pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();
  private workerReady: Promise<void>;
  private mujocoInstance: MuJoCoInstance; // 如果需要，可以定义具体类型

  private responseBuffer: SharedArrayBuffer;
  private notificationBuffer: SharedArrayBuffer;
  private notificationView: Int32Array;

  constructor(
    mujocoInstance: MuJoCoInstance,
    workerScriptUrl: string | URL = new URL('./kernel_worker.ts', import.meta.url),
  ) {
    console.log('[WeiruiKernelWorkerClient] Creating worker with URL:', workerScriptUrl);
    this.worker = new Worker(workerScriptUrl, { type: 'module' });

    this.responseBuffer = new SharedArrayBuffer(4096);
    this.notificationBuffer = new SharedArrayBuffer(4);
    this.notificationView = new Int32Array(this.notificationBuffer);

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

  private writeResponseToSAB(response: object) {
    const responseStr = JSON.stringify(response);
    const encoded = new TextEncoder().encode(responseStr);
    const len = encoded.length;

    const view = new Uint8Array(this.responseBuffer);
    view.fill(0); // Clear previous response

    const lenView = new Uint32Array(this.responseBuffer, 0, 1);
    lenView[0] = len;

    const dataView = new Uint8Array(this.responseBuffer, 4);
    dataView.set(encoded);

    Atomics.store(this.notificationView, 0, 1);
    Atomics.notify(this.notificationView, 0, 1);
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

    // 处理 getJointPos 请求
    if (type === 'getJointPos' && id !== undefined) {
      try {
        const jointPos = this.mujocoInstance.getJointPos();
        this.writeResponseToSAB({ success: true, data: Array.from(jointPos) });
      } catch (err) {
        this.writeResponseToSAB({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      return;
    }

    // 处理 setActuatorControls 请求
    if (type === 'setActuatorControls' && id !== undefined) {
      try {
        const { actuatorIndices, values } = data;
        this.mujocoInstance.setActuatorControls(actuatorIndices, values);
        this.writeResponseToSAB({ success: true, data: null });
      } catch (err) {
        this.writeResponseToSAB({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      return;
    }

    // 处理 runTargetAction 请求
    if (type === 'runTargetAction' && id !== undefined) {
      try {
        const req = RunTargetActionReq.decode(data as Uint8Array);

        const servoIds = req.servoIdVec;
        const targetRadians = req.targetRadVec;

        if (servoIds.length !== targetRadians.length) {
          throw new Error('Servo ID list and target radians list must have the same length');
        }

        this.mujocoInstance.setActuatorControls(servoIds.map(id => id - 1), targetRadians);
        this.mujocoInstance.getJointPos(); // Step simulation

        const resp = RunTargetActionResp.create({
          servoIdVec: req.servoIdVec,
          targetRadVec: req.targetRadVec,
        });

        const respBuf = RunTargetActionResp.encode(resp).finish();
        this.writeResponseToSAB({ success: true, data: Array.from(respBuf) });
      } catch (err) {
        this.writeResponseToSAB({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      return;
    }

    // 处理 getActuatorInfo 请求
    if (type === 'getActuatorInfo' && id !== undefined) {
      try {
        const req = GetActuatorInfoReq.decode(data as Uint8Array);
        const actuatorInfo = this.mujocoInstance.getActuatorInfo();

        const resp = GetActuatorInfoResp.create({
                  actuators: actuatorInfo.map(info => ({
                    name: info.name,
                    id: info.id,
                    type: info.type === 'position' ? ActuatorType.POSITION : ActuatorType.MOTOR,
                    vendor: info.vendor || '',
                    model: info.model || '',
                    ctrl: info.ctrl,
                    ctrlMin: info.ctrl_min,
                    ctrlMax: info.ctrl_max,
                    forceMin: info.force_min,
                    forceMax: info.force_max,
                    jointId: info.joint_id,
                  })),
                });

        const respBuf = GetActuatorInfoResp.encode(resp).finish();
        this.writeResponseToSAB({ success: true, data: Array.from(respBuf) });
      } catch (err) {
        this.writeResponseToSAB({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      return;
    }

    // 处理 getJointInfo 请求
    if (type === 'getJointInfo' && id !== undefined) {
      try {
        const req = GetJointInfoReq.decode(data as Uint8Array);
        const jointInfo = this.mujocoInstance.getJointInfo();

        const resp = GetJointInfoResp.create({
          joints: jointInfo.map(info => ({
            name: info.name,
            id: info.id,
            type: info.type === 'slide' ? JointType.SLIDE :
                  info.type === 'ball' ? JointType.BALL :
                  info.type === 'free' ? JointType.FREE :
                  JointType.HINGE,
            dofDim: info.dof_dim,
            jointPos: info.joint_pos,
          })),
        });

        const respBuf = GetJointInfoResp.encode(resp).finish();
        this.writeResponseToSAB({ success: true, data: Array.from(respBuf) });
      } catch (err) {
        this.writeResponseToSAB({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      return;
    }


    // 处理 consoleWrite 请求
    if (type === 'consoleWrite' && id !== undefined) {
      try {
        const req = ConsoleWriteReq.decode(data as Uint8Array);
        const consoleStore = useConsoleStore(pinia);
        consoleStore.write(req.message || '');
        this.writeResponseToSAB({ success: true, data: null });
      } catch (err) {
        this.writeResponseToSAB({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
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

  /**
   * 初始化WeiruiKernel
   * @param robotAppWasm 机器人应用WASM
   */
  public async init(robotAppWasm: ArrayBuffer): Promise<void> {
    console.log(`[WeiruiKernelWorkerClient] Initializing`);
    await this.workerReady;

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });

      const initData = {
        robotAppWasm,
        responseBuffer: this.responseBuffer,
        notificationBuffer: this.notificationBuffer,
      };

      console.log(`[WeiruiKernelWorkerClient] Sending message ${id} of type: init`);

      try {
        this.worker.postMessage({ type: 'init', data: initData, id }, [
          initData.robotAppWasm,
        ]);
        console.log(`[WeiruiKernelWorkerClient] Message ${id} sent successfully`);
      } catch (error) {
        console.error(`[WeiruiKernelWorkerClient] Failed to send message ${id}:`, error);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }
}