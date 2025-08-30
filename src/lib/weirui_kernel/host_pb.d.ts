// package: 
// file: src/lib/weirui_kernel/host.proto

import * as jspb from "google-protobuf";

export class HostResult extends jspb.Message {
  hasErrorCode(): boolean;
  clearErrorCode(): void;
  getErrorCode(): number | undefined;
  setErrorCode(value: number): void;

  hasErrorMessage(): boolean;
  clearErrorMessage(): void;
  getErrorMessage(): string | undefined;
  setErrorMessage(value: string): void;

  hasData(): boolean;
  clearData(): void;
  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HostResult.AsObject;
  static toObject(includeInstance: boolean, msg: HostResult): HostResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HostResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HostResult;
  static deserializeBinaryFromReader(message: HostResult, reader: jspb.BinaryReader): HostResult;
}

export namespace HostResult {
  export type AsObject = {
    errorCode?: number,
    errorMessage?: string,
    data: Uint8Array | string,
  }
}

export class RunTargetActionReq extends jspb.Message {
  clearServoIdVecList(): void;
  getServoIdVecList(): Array<number>;
  setServoIdVecList(value: Array<number>): void;
  addServoIdVec(value: number, index?: number): number;

  clearTargetRadVecList(): void;
  getTargetRadVecList(): Array<number>;
  setTargetRadVecList(value: Array<number>): void;
  addTargetRadVec(value: number, index?: number): number;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RunTargetActionReq.AsObject;
  static toObject(includeInstance: boolean, msg: RunTargetActionReq): RunTargetActionReq.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RunTargetActionReq, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RunTargetActionReq;
  static deserializeBinaryFromReader(message: RunTargetActionReq, reader: jspb.BinaryReader): RunTargetActionReq;
}

export namespace RunTargetActionReq {
  export type AsObject = {
    servoIdVecList: Array<number>,
    targetRadVecList: Array<number>,
  }
}

export class RunTargetActionResp extends jspb.Message {
  clearServoIdVecList(): void;
  getServoIdVecList(): Array<number>;
  setServoIdVecList(value: Array<number>): void;
  addServoIdVec(value: number, index?: number): number;

  clearTargetRadVecList(): void;
  getTargetRadVecList(): Array<number>;
  setTargetRadVecList(value: Array<number>): void;
  addTargetRadVec(value: number, index?: number): number;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RunTargetActionResp.AsObject;
  static toObject(includeInstance: boolean, msg: RunTargetActionResp): RunTargetActionResp.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RunTargetActionResp, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RunTargetActionResp;
  static deserializeBinaryFromReader(message: RunTargetActionResp, reader: jspb.BinaryReader): RunTargetActionResp;
}

export namespace RunTargetActionResp {
  export type AsObject = {
    servoIdVecList: Array<number>,
    targetRadVecList: Array<number>,
  }
}

