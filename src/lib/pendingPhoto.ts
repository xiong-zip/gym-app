import type { JournalKind } from '../types';

/**
 * 跨页面传照片的临时通道（base64 太大不适合走路由参数）。
 * 写入后由目标页在读走的瞬间清空，只存活一次导航。
 */
export interface PendingPhoto {
  uri: string;
  note?: string;
  kind?: JournalKind;
}

let pending: PendingPhoto | null = null;

export function setPendingPhoto(p: PendingPhoto) {
  pending = p;
}

export function takePendingPhoto(): PendingPhoto | null {
  const p = pending;
  pending = null;
  return p;
}
