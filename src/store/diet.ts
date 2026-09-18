import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FoodLog } from '../types';

interface DietState {
  logs: FoodLog[];
  _h: boolean;
  addLog: (l: FoodLog) => void;
  removeLog: (id: string) => void;
  clear: () => void;
}

export const useDietStore = create<DietState>()(
  persist(
    (set) => ({
      logs: [],
      _h: false,
  addLog: (l) => set((s) => ({ logs: [...s.logs, l] })),
  removeLog: (id) => set((s) => ({ logs: s.logs.filter((x) => x.id !== id) })),
  clear: () => set({ logs: [] }),
    }),
    {
      name: 'gym-diet',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useDietStore.setState({ _h: true });
      },
    },
  ),
);
