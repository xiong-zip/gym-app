/**
 * 照片墙的「nosh 风」处理：加进手帐的照片在后台做主体抠图，
 * 完成前先显示原照片，完成后退化成白描边贴纸（透明 PNG）。
 */
import { recognizePhotoName } from './ai';
import { cutoutSticker } from './cutout';
import { useJournalStore } from '../store/journal';
import type { AISettings, JournalPhoto } from '../types';

/** 就地更新照片墙上的某张照片 */
export function patchPhoto(photoId: string, patch: Partial<JournalPhoto>): void {
  const store = useJournalStore.getState();
  const host = store.entries.find((e) => e.photos?.some((p) => p.id === photoId));
  if (!host) return;
  store.update({
    ...host,
    photos: (host.photos ?? []).map((p) => (p.id === photoId ? { ...p, ...patch } : p)),
  });
}

/** 主体抠图 → 白描边贴纸；无主体/失败也标记 tried，不再反复重试 */
export async function attachCutout(photoId: string, uri: string): Promise<void> {
  try {
    const res = await cutoutSticker(uri);
    patchPhoto(photoId, res
      ? { cutoutUri: res.uri, cutoutW: res.width, cutoutH: res.height, cutoutTried: true }
      : { cutoutTried: true });
  } catch {
    patchPhoto(photoId, { cutoutTried: true });
  }
}

/** AI 给照片起名（食物说菜名、动作说动作名；失败保留「照片」） */
export async function attachAiName(photoId: string, uri: string, ai: AISettings): Promise<void> {
  try {
    patchPhoto(photoId, { name: await recognizePhotoName(ai, uri) });
  } catch { /* 保持原名 */ }
}

/** 贴纸摆放角度：按 id 稳定在 ±5°，像随手贴上去的（同一张照片每次一致） */
export function tiltOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return +(((h % 100) / 100) * 10 - 5).toFixed(1);
}
