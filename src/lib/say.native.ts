import * as Speech from 'expo-speech';

export type SayText =
  | '还有三十秒'
  | '还有十秒'
  | '休息结束，开始下一组'
  | '训练完成，今天也辛苦了';

/** 组间语音播报（中文 TTS，失败静默——始终有提示音与震动兜底） */
export function say(text: SayText): void {
  try {
    Speech.stop(); // 新播报顶掉还没播完的旧播报，避免排队堆叠
    Speech.speak(text, { language: 'zh-CN', rate: 1.04, pitch: 1.0 });
  } catch { /* 无 TTS 引擎时静默 */ }
}

export function stopSay(): void {
  try { Speech.stop(); } catch { /* 静默 */ }
}
