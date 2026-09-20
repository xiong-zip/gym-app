declare module 'jpeg-js' {
  export interface DecodeResult { width: number; height: number; data: Uint8Array; comments?: string[] }
  export function decode(data: Uint8Array, opts?: { useTArray?: boolean; colorTransform?: boolean; formatAsRGBA?: boolean }): DecodeResult;
  export function encode(imgData: { data: Uint8Array; width: number; height: number }, quality?: number): { data: Uint8Array; width: number; height: number };
}

declare module '*.onnx' {
  const value: number;
  export default value;
}
