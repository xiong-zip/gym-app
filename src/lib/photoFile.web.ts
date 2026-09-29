/**
 * Web 预览版：浏览器里 expo-file-system 是空壳，写不了文件，
 * 照片继续以 data URI 存在 localStorage（真机见 photoFile.ts，落在 document 目录）。
 * 保持与原生完全一致的导出，调用方不需要分平台。
 */
import type { JournalEntry } from '../types';

export const PHOTO_DIR = 'photos';
export const STICKER_DIR = 'stickers';

export interface PhotoSource {
  dataUri?: string;
  fileUri?: string;
}

export function isOwnFile(_uri?: string | null): boolean {
  return false;
}

export async function persistPhoto(_id: string, src: PhotoSource): Promise<string> {
  return src.dataUri ?? src.fileUri ?? '';
}

export function deletePhotoFile(_uri?: string | null): void {}

export async function toDataUri(uri: string): Promise<string> {
  return uri;
}

export async function readFileBase64(_uri: string): Promise<string | null> {
  return null;
}

export function writeFileBase64(): string | null {
  return null;
}

export function referencedUris(_entries: JournalEntry[]): Set<string> {
  return new Set<string>();
}

export function fileSize(_uri?: string | null): number {
  return 0;
}

export function collectPhotoGarbage(): number {
  return 0;
}

export async function migratePhotosToFiles(): Promise<number> {
  return 0;
}
