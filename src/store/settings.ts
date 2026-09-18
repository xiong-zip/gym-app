import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AISettings } from '../types';

interface SettingsState {
  ai: AISettings;
  _h: boolean;
  setAI: (p: Partial<AISettings>) => void;
}

const DEFAULT_AI: AISettings = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: DEFAULT_AI,
      _h: false,
      setAI: (p) => set((s) => ({ ai: { ...s.ai, ...p } })),
    }),
    {
      name: 'gym-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ _h: true });
      },
    },
  ),
);
