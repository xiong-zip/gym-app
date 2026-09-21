import { Share, type View } from 'react-native';
import type { RefObject } from 'react';

/** Web 端没有视图截图能力，降级为系统文字分享 */
export async function shareViewShot(_ref: RefObject<View | null>, fallbackText: string): Promise<boolean> {
  try {
    await Share.share({ message: fallbackText });
    return true;
  } catch {
    return false;
  }
}
