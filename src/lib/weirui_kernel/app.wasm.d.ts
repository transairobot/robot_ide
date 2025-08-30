// calc.wasm.d.ts
export interface RobotAppExports extends WebAssembly.Exports {
    memory: WebAssembly.Memory;

    readonly: WebAssembly.Global;
    WEIRUI_CLIENT_LANGUAGE: number;
    __new_bytes(length: number): number;
    main(): void;
}