/**
 * 全量备份：把本地所有 store 的原样 KV + 手帐图片文件打成一份 JSON，
 * 走系统分享面板发到微信 / 网盘，换机后导入即可。全程不需要服务器。
 *
 * 存的是 AsyncStorage 里的原始字符串而不是各 store 的字段，这样以后新增
 * store 或字段，老备份也能原样带过来（导入端只做路径替换）。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDietStore } from '../store/diet';
import { useJournalStore } from '../store/journal';
import { useMetricsStore } from '../store/metrics';
import { useProfileStore } from '../store/profile';
import { useScheduleStore } from '../store/schedule';
import { useSessionDraftStore } from '../store/sessionDraft';
import { DEFAULT_AI, useSettingsStore } from '../store/settings';
import { useWorkoutsStore } from '../store/workouts';
import { pickTextFile, shareTextFile } from './fileTransfer';
import {
  PHOTO_DIR, STICKER_DIR, fileSize, readFileBase64, referencedUris, writeFileBase64,
} from './photoFile';

const APP_ID = 'gym-app';
const KEY_PREFIX = 'gym-';
const FORMAT = 1;

interface BackupImage {
  uri: string;  // 导出机器上的绝对路径，导入时用于替换
  dir: string;
  name: string;
  b64: string;
}

interface BackupPayload {
  app: string;
  kind: string;
  version: number;
  exportedAt: number;
  stores: Record<string, string>;
  files?: BackupImage[];
}

export interface BackupInfo {
  photos: number;
  photoBytes: number;
  dataKB: number;
}

export interface ExportResult {
  ok: boolean;
  photos?: number;
  dataKB?: number;
  reason?: string;
}

export interface ImportResult {
  ok: boolean;
  photos?: number;
  canceled?: boolean;
  error?: string;
}

function replaceAll(text: string, from: string, to: string): string {
  return text.split(from).join(to);
}

/** 备份里不留自配的 AI Key（内置默认 Key 跟着 App 走，本来就在包里） */
function withoutCustomKey(key: string, raw: string): string {
  if (key !== 'gym-settings') return raw;
  try {
    const parsed = JSON.parse(raw) as { state?: { ai?: { apiKey?: string } } };
    const ai = parsed.state?.ai;
    if (ai?.apiKey && ai.apiKey !== DEFAULT_AI.apiKey) ai.apiKey = '';
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

async function backupKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith(KEY_PREFIX)).sort();
}

/** 导出前的体积预览：照片按文件大小算，数据按本地存储的字符串长度算 */
export async function backupInfo(): Promise<BackupInfo> {
  const pairs = await AsyncStorage.multiGet(await backupKeys());
  let dataBytes = 0;
  for (const [, v] of pairs) dataBytes += v?.length ?? 0;

  let photos = 0;
  let photoBytes = 0;
  for (const e of useJournalStore.getState().entries) {
    for (const p of e.photos ?? []) {
      photos++;
      photoBytes += fileSize(p.uri) + fileSize(p.cutoutUri); // 原图 + 抠图贴纸
    }
    for (const st of e.stickers ?? []) photoBytes += fileSize(st.uri);
  }
  return { photos, photoBytes, dataKB: Math.round(dataBytes / 1024) };
}

/** 打包并调起分享面板 */
export async function exportBackup(): Promise<ExportResult> {
  try {
    const keys = await backupKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    const stores: Record<string, string> = {};
    for (const [k, v] of pairs) {
      if (v != null) stores[k] = withoutCustomKey(k, v);
    }

    // 手帐引用到的图片：读成 base64 装进包里（换机后没有这些文件）
    const files: BackupImage[] = [];
    for (const path of referencedUris(useJournalStore.getState().entries)) {
      const uri = `file://${path}`;
      const b64 = await readFileBase64(uri);
      if (b64) {
        const name = path.split('/').pop() ?? 'photo.jpg';
        const dir = path.includes(`/${STICKER_DIR}/`) ? STICKER_DIR : PHOTO_DIR;
        files.push({ uri, dir, name, b64 });
      }
    }

    const payload: BackupPayload = {
      app: APP_ID,
      kind: 'backup',
      version: FORMAT,
      exportedAt: Date.now(),
      stores,
      files,
    };
    const json = JSON.stringify(payload);
    const day = new Date().toISOString().slice(0, 10);
    const shared = await shareTextFile(`健身搭子-备份-${day}.json`, json, '导出备份');
    if (!shared) return { ok: false, reason: '系统分享不可用，没有导出成功' };
    return { ok: true, photos: files.length, dataKB: Math.round(json.length / 1024) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : '导出失败，请重试' };
  }
}

/** 让内存里的 store 重新读一遍本地数据（导入后立即生效，不用重启） */
async function reloadStores(): Promise<void> {
  await Promise.all([
    useProfileStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
    useWorkoutsStore.persist.rehydrate(),
    useDietStore.persist.rehydrate(),
    useMetricsStore.persist.rehydrate(),
    useScheduleStore.persist.rehydrate(),
    useSessionDraftStore.persist.rehydrate(),
    useJournalStore.persist.rehydrate(),
  ]);
}

/** 选一个备份文件导入：覆盖同名数据（先落图片，再把 store 里的旧路径换成新路径） */
export async function importBackup(): Promise<ImportResult> {
  let picked: { name: string; text: string } | null = null;
  try {
    picked = await pickTextFile();
  } catch {
    return { ok: false, error: '打不开文件选择器' };
  }
  if (!picked) return { ok: false, canceled: true };

  let data: BackupPayload | null = null;
  try {
    data = JSON.parse(picked.text) as BackupPayload;
  } catch {
    return { ok: false, error: '文件内容不是有效备份（解析失败）' };
  }
  if (!data || data.app !== APP_ID || data.kind !== 'backup' || !data.stores) {
    return { ok: false, error: '这不是健身搭子的备份文件' };
  }

  const moved = new Map<string, string>();
  for (const f of data.files ?? []) {
    if (!f?.uri || !f.b64) continue;
    const uri = writeFileBase64(f.dir === STICKER_DIR ? STICKER_DIR : PHOTO_DIR, f.name || 'photo.jpg', f.b64);
    if (uri) moved.set(f.uri, uri);
  }

  const pairs: [string, string][] = [];
  for (const [k, v] of Object.entries(data.stores)) {
    if (!k.startsWith(KEY_PREFIX) || typeof v !== 'string') continue;
    let text = v;
    for (const [from, to] of moved) {
      if (from !== to) text = replaceAll(text, from, to);
    }
    pairs.push([k, text]);
  }
  if (!pairs.length) return { ok: false, error: '备份里没有可导入的数据' };

  await AsyncStorage.multiSet(pairs);
  await reloadStores();
  return { ok: true, photos: moved.size };
}
