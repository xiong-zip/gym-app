import type { CutoutResult } from './cutout.types';

/**
 * Web 端空实现：onnxruntime-react-native 不支持浏览器，
 * 返回 null 让调用方回退为整张照片贴纸。
 * 原生实现见 cutout.native.ts（Metro 自动按平台选取）。
 */
export async function cutoutSticker(_src: string): Promise<CutoutResult | null> {
  return null;
}

export type { CutoutResult };
