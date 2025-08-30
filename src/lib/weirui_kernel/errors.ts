export class WeiruiKernelError extends Error {
  errorCode: number;

  constructor(errorCode: number, message: string) {
    super(message);
    this.name = 'WeiruiKernelError';
    this.errorCode = errorCode;
  }
}

export class InvalidArgumentError extends WeiruiKernelError {
  constructor(message: string) {
    super(10000, `Invalid argument: ${message}`);
    this.name = 'InvalidArgumentError';
  }
}

export class InternalError extends WeiruiKernelError {
  constructor(message: string) {
    super(10001, `Internal error: ${message}`);
    this.name = 'InternalError';
  }
}

export class MemoryOutOfBounds extends WeiruiKernelError {
  constructor(message: string) {
    super(10002, `MemoryOutOfBounds error: ${message}`);
    this.name = 'MemoryOutOfBounds';
  }
}