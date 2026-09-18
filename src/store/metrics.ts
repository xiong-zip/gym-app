import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BodyMetric } from '../types';

interface MetricsState {
  entries: BodyMetric[];
  _h: boolean;
  add: (m: BodyMetric) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useMetricsStore = create<MetricsState>()(
  persist(
    (set) => ({
      entries: [],
      _h: false,
      add: (m) => set((s) => {
        // 同一天只保留最新一条
        const rest = s.entries.filter((x) => x.date !== m.date);
        return { entries: [...rest, m].sort((a, b) => (a.date < b.date ? -1 : 1)) };
      }),
      remove: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'gym-metrics',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useMetricsStore.setState({ _h: true });
      },
    },
  ),
);

export function latestWeight(entries: BodyMetric[]): number | null {
  return entries.length ? entries[entries.length - 1].weightKg : null;
}
