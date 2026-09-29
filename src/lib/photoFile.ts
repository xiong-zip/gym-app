/**
 * 手帐照片落盘。
 *
 * AsyncStorage（Android 上是 SQLite）整个库默认只有 6MB 上限，照片按 base64 存进去
 * 三四张就顶满，之后连训练记录都写不进去。所以图片本体写进 document 目录，
 * store 里只留文件路径；Web 预览没有可写的文件系统，继续用 data URI（见 photoFile.web.ts）。
 */
import { Directory, File, Paths } from 'expo-file-system';
import type { JournalEntry } from '../types';
import { useJournalStore } from '../store/journal';

export const PHOTO_DIR = 'photos';
/** 抠图贴纸输出目录（cutout.native.ts 共用） */
export const STICKER_DIR = 'stickers';

/** 图片本体的两种来源：picker 的 base64（Web 端只有它可用）与本地缓存文件 */
export interface PhotoSource {
  dataUri?: string;
  fileUri?: string;
}

const OFF = /^file:\/\//;

function dirPath(name: string): string {
  return new Directory(Paths.document, name).uri.replace(OFF, '');
}

function ensureDir(name: string): Directory {
  const d = new Directory(Paths.document, name);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

/** 文件名安全化：id 由调用方生成，这里只防意外字符混进路径 */
function safeName(name: string): string {
  return name.replace(/[^\w.-]/g, '_');
}

function stripDataUri(uri: string): string {
  const i = uri.indexOf(',');
  return uri.startsWith('data:') && i >= 0 ? uri.slice(i + 1) : uri;
}

/** 是否落在我们自己的 images 目录里（迁移与删除时避免碰相册缓存等外部文件） */
export function isOwnFile(uri?: string | null): boolean {
  if (!uri) return false;
  const u = uri.replace(OFF, '');
  return u.startsWith(dirPath(PHOTO_DIR)) || u.startsWith(dirPath(STICKER_DIR));
}

/**
 * 把刚拍/刚选的照片写进 document/photos，返回文件路径。
 * 落盘失败（空间不足等）时退回原 data URI——功能照常，只是又占回 AsyncStorage。
 */
export async function persistPhoto(id: string, src: PhotoSource): Promise<string> {
  if (isOwnFile(src.fileUri)) return src.fileUri as string;
  const fallback = src.dataUri ?? src.fileUri ?? '';
  try {
    const dest = new File(ensureDir(PHOTO_DIR), `${safeName(id)}.jpg`);
    if (src.dataUri) {
      dest.write(stripDataUri(src.dataUri), { encoding: 'base64' });
      return dest.uri;
    }
    if (src.fileUri) {
      // picker 给的缓存文件：复制出来，免得被系统清理
      await new File(src.fileUri).copy(dest, { overwrite: true });
      return dest.uri;
    }
  } catch {
    // 保留原路径，不打断拍摄/记录流程
  }
  return fallback;
}

/** 删除我们目录里的图片；外部路径一律不碰 */
export function deletePhotoFile(uri?: string | null): void {
  if (!isOwnFile(uri)) return;
  try {
    const f = new File(uri as string);
    if (f.exists) f.delete();
  } catch {
    // 已经删掉或没有权限
  }
}

/** 文件路径 → 视觉模型能吃的 data URI（手帐照片都是 JPEG） */
export async function toDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  return `data:image/jpeg;base64,${await new File(uri).base64()}`;
}

/* ---------- 备份导入导出用 ---------- */

export async function readFileBase64(uri: string): Promise<string | null> {
  try {
    const f = new File(uri);
    return f.exists ? await f.base64() : null;
  } catch {
    return null;
  }
}

/** 导入备份：把图片写回目录，返回新路径（失败返回 null） */
export function writeFileBase64(dirName: string, name: string, b64: string): string | null {
  try {
    const dest = new File(ensureDir(dirName), safeName(name));
    dest.write(b64, { encoding: 'base64' });
    return dest.uri;
  } catch {
    return null;
  }
}

/* ---------- 统计与清理 ---------- */

/** 手帐里引用到的图片路径集合（去掉 file:// 前缀便于比对） */
export function referencedUris(entries: JournalEntry[]): Set<string> {
  const set = new Set<string>();
  const add = (u?: string) => {
    if (u && isOwnFile(u)) set.add(u.replace(OFF, ''));
  };
  for (const e of entries) {
    e.photos?.forEach((p) => { add(p.uri); add(p.cutoutUri); });
    e.stickers?.forEach((s) => add(s.uri));
  }
  return set;
}

/** 单个图片文件大小（不存在或读不到算 0） */
export function fileSize(uri?: string | null): number {
  if (!uri || !isOwnFile(uri)) return 0;
  try {
    const f = new File(uri);
    return f.exists ? f.size || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * 清理没有任何手帐引用的图片（迁移残留、编辑到一半取消的贴纸）。
 * 只动十分钟前的文件，避免删掉正在录入或正在抠图的图；时间未知的也不碰。
 */
export function collectPhotoGarbage(): number {
  const refs = referencedUris(useJournalStore.getState().entries);
  const cutoff = Date.now() - 10 * 60 * 1000;
  let removed = 0;
  for (const name of [PHOTO_DIR, STICKER_DIR]) {
    let items: (Directory | File)[] = [];
    try {
      const d = new Directory(Paths.document, name);
      if (!d.exists) continue;
      items = d.list();
    } catch {
      continue;
    }
    for (const item of items) {
      if (!(item instanceof File)) continue;
      const age = item.lastModified;
      if (age == null || age > cutoff) continue;
      if (refs.has(item.uri.replace(OFF, ''))) continue;
      try { item.delete(); removed++; } catch { /* 删不掉就留着 */ }
    }
  }
  return removed;
}

/**
 * 把历史遗留的 base64 照片（以及还在系统缓存里的图）搬进文件系统。
 * 幂等，可重复调用；逐张处理，中途失败只是这一张没搬。
 */
export async function migratePhotosToFiles(): Promise<number> {
  const entries = useJournalStore.getState().entries;
  if (!entries.length) return 0;
  let moved = 0;

  const fix = async (id: string, uri?: string, suffix = ''): Promise<string | undefined> => {
    if (!uri) return uri;
    if (!uri.startsWith('data:') && isOwnFile(uri)) return uri;
    moved++;
    return persistPhoto(`${id}${suffix}`, uri.startsWith('data:') ? { dataUri: uri } : { fileUri: uri });
  };

  const next: JournalEntry[] = [];
  for (const e of entries) {
    const photos = e.photos
      ? await Promise.all(e.photos.map(async (p) => ({
        ...p,
        uri: (await fix(p.id, p.uri)) as string,
        cutoutUri: await fix(p.id, p.cutoutUri, '-cut'),
      })))
      : e.photos;
    const stickers = e.stickers?.length
      ? await Promise.all(e.stickers.map(async (s) => ({ ...s, uri: (await fix(s.id, s.uri)) as string })))
      : e.stickers;
    next.push({ ...e, photos, stickers });
  }

  if (moved) useJournalStore.setState({ entries: next });
  return moved;
}
