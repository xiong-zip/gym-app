export type SayText =
  | '还有三十秒'
  | '还有十秒'
  | '休息结束，开始下一组'
  | '训练完成，今天也辛苦了';

/** Web 端不语音播报，保持提示音/触感即可 */
export function say(_text: SayText): void {
  /* no-op */
}

export function stopSay(): void {
  /* no-op */
}
