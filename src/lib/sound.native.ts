import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SoundName = 'ding' | 'tick';

let ding: AudioPlayer | null = null;
let tick: AudioPlayer | null = null;
let modeReady = false;

async function ensureMode() {
  if (modeReady) return;
  modeReady = true;
  try {
    // 静音模式下也响（和系统计时器一致的预期）
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch { /* 旧系统失败时忽略，仍有震动兜底 */ }
}

/** 播放内置提示音（很短，失败静默——始终有触感兜底） */
export function playSound(name: SoundName): void {
  try {
    void ensureMode();
    if (name === 'ding') {
      if (!ding) ding = createAudioPlayer(require('../../assets/audio/ding.wav'));
      else ding.seekTo(0);
      ding.play();
    } else {
      if (!tick) tick = createAudioPlayer(require('../../assets/audio/tick.wav'));
      else tick.seekTo(0);
      tick.play();
    }
  } catch { /* 无音频硬件/资源缺失时静默 */ }
}
