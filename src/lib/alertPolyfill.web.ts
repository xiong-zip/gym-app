/* Web 端 react-native-web 的 Alert.alert 是空实现：确认框不弹、回调不执行。
   这里用 window.confirm / prompt 补上，让「删除确认」等弹窗在网页端也能用。 */
import { Alert } from 'react-native';

interface AlertButton { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }

function patchAlert(title: string, message?: string, buttons: AlertButton[] = []): void {
  const bs: AlertButton[] = buttons.length ? buttons : [{ text: '确定' }];
  const content = [title, message].filter(Boolean).join('\n');
  if (bs.length <= 2) {
    // 两按钮：确认 → 后一个；取消 → 前一个（本项目的取消/破坏性按钮都遵循这个顺序）
    const ok = window.confirm(content);
    const picked = bs[ok ? bs.length - 1 : 0];
    picked?.onPress?.();
    return;
  }
  // 三按钮：用序号选择
  const tip = `${content}\n\n${bs.map((b, i) => `${i + 1}. ${b.text}`).join('  ')}\n（输入序号）`;
  const raw = window.prompt(tip, '1');
  const idx = Number(raw) - 1;
  if (Number.isInteger(idx) && idx >= 0 && idx < bs.length) bs[idx].onPress?.();
  else bs.find((b) => b.style === 'cancel')?.onPress?.();
}

(Alert as unknown as { alert: typeof patchAlert }).alert = patchAlert;
export {};
