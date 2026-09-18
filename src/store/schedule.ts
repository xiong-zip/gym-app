import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GeneratedPlan } from '../types';

export interface DayAssignment {
  date: string; // YYYY-MM-DD
  plan: GeneratedPlan;
}

interface ScheduleState {
  assignments: DayAssignment[];
  _h: boolean;
  assign: (date: string, plan: GeneratedPlan) => void;
  clear: () => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      assignments: [],
      _h: false,
      assign: (date, plan) => set((s) => ({
        assignments: [...s.assignments.filter((a) => a.date !== date), { date, plan }],
      })),
      clear: () => set({ assignments: [] }),
    }),
    {
      name: 'gym-schedule',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useScheduleStore.setState({ _h: true });
      },
    },
  ),
);
