import { Share, type View } from 'react-native';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

/** 截图某个视图并调系统分享面板；失败（老系统/权限问题）降级为文字分享 */
export async function shareViewShot(ref: RefObject<View | null>, fallbackText: string): Promise<boolean> {
  try {
    const node = ref.current;
    if (!node) throw new Error('no view');
    if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
    const uri = await captureRef(node, { format: 'png', quality: 1, result: 'tmpfile' });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '分享' });
    return true;
  } catch {
    try {
      await Share.share({ message: fallbackText });
    } catch { /* 用户取消分享 */ }
    return false;
  }
}
