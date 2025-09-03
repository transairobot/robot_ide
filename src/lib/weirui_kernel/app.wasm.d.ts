// calc.wasm.d.ts
export enum WEIRUI_CLIENT_LANGUAGE {
    Rust = 1,
}

export interface RobotAppExports extends WebAssembly.Exports {
    memory: WebAssembly.Memory;

    readonly: WebAssembly.Global;
    WEIRUI_CLIENT_LANGUAGE: number;
    wasm_new_bytes(length: number): number;
    main(): void;
}