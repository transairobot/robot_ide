
// 定义消息类型
export interface Message {
    type: string;
    data?: any;
}

// 定义初始化消息的数据结构
export interface InitData {
    robotAppWasm: ArrayBuffer;
}

// 定义设置执行器控制的消息数据结构
export interface SetActuatorControlsData {
    actuatorIndices: number[];
    values: number[];
}