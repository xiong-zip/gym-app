import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GeneratedPlan } from '../types';

/** 训练执行页的一行组记录（数字用字符串存，保留输入中间态） */
export interface DraftSetRow { weight: string; reps: string; done: boolean }

/** 进行中的训练草稿：App 被杀 / 中途退出后可从首页恢复 */
export interface SessionDraft {
  plan: GeneratedPlan;
  sets: DraftSetRow[][];
  startedAt: number;
  savedAt: number;
}

interface SessionDraftState {
  draft: SessionDraft | null;
  _h: boolean;
  save: (d: Omit<SessionDraft, 'savedAt'>) => void;
  clear: () => void;
}

export const useSessionDraftStore = create<SessionDraftState>()(
  persist(
    (set) => ({
      draft: null,
      _h: false,
      save: (d) => set({ draft: { ...d, savedAt: Date.now() } }),
      clear: () => set({ draft: null }),
    }),
    {
      name: 'gym-session-draft',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useSessionDraftStore.setState({ _h: true });
      },
    },
  ),
);
