/**
 * 备份文件的收发（原生）：写进 cache 后调系统分享面板，导入时用系统文件选择器。
 * Web 预览见 fileTransfer.web.ts（浏览器改成下载 / 选择文件）。
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** 把文本写成文件并调起分享面板；返回是否真的分享出去了 */
export async function shareTextFile(filename: string, text: string, dialogTitle: string): Promise<boolean> {
  const dir = new Directory(Paths.cache, 'backup');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, filename);
  if (file.exists) file.delete();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle, UTI: 'public.json' });
  return true;
}

/** 挑一个备份文件读成文本；取消返回 null */
export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  // 微信/网盘存下来的 json 常被标成 octet-stream，这里不做类型过滤，靠内容校验
  const res = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (res.canceled || !res.result) return null;
  return { name: res.result.name, text: await res.result.text() };
}
