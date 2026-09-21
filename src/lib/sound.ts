export type SoundName = 'ding' | 'tick';

/** Web 端不播提示音，保持触感反馈即可 */
export function playSound(_name: SoundName): void {
  /* no-op */
}
