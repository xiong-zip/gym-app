import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AISettings } from '../types';
import type { ReminderSettings } from '../lib/notify';

interface SettingsState {
  ai: AISettings;
  /** 组间休息结束的提示音（web 恒无声音） */
  sound: boolean;
  reminder: ReminderSettings;
  _h: boolean;
  setAI: (p: Partial<AISettings>) => void;
  setSound: (v: boolean) => void;
  setReminder: (p: Partial<ReminderSettings>) => void;
}

const DEFAULT_AI: AISettings = {
  enabled: true,
  baseUrl: 'https://api.deepseek.com',
  apiKey: 'sk-ff7f1ee279b341bb8f69120d61006e57',
  model: 'deepseek-flash',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: DEFAULT_AI,
      sound: true,
      reminder: { enabled: false, hour: 19, minute: 0 },
      _h: false,
      setAI: (p) => set((s) => ({ ai: { ...s.ai, ...p } })),
      setSound: (v) => set({ sound: v }),
      setReminder: (p) => set((s) => ({ reminder: { ...s.reminder, ...p } })),
    }),
    {
      name: 'gym-settings',
      version: 1,
      // v0 → v1：内置 DeepSeek 直连（deepseek-flash 支持视觉，可拍照识餐）。
      // 老安装只在「从未自配过 Key」时自动切到默认配置；自己填过 Key 的保持原样。
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Partial<SettingsState>;
        if (version < 1) {
          const ai = state.ai as AISettings | undefined;
          if (!ai || !ai.apiKey) state.ai = DEFAULT_AI;
        }
        return state as SettingsState;
      },
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ _h: true });
      },
    },
  ),
);
