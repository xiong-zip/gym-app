import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GeneratedPlan, WorkoutLog } from '../types';

interface WorkoutsState {
  logs: WorkoutLog[];
  savedPlans: GeneratedPlan[];
  _h: boolean;
  addLog: (l: WorkoutLog) => void;
  deleteLog: (id: string) => void;
  savePlan: (p: GeneratedPlan) => void;
  deletePlan: (id: string) => void;
  clear: () => void;
}

export const useWorkoutsStore = create<WorkoutsState>()(
  persist(
    (set) => ({
      logs: [],
      savedPlans: [],
      _h: false,
      addLog: (l) => set((s) => ({ logs: [...s.logs, l] })),
      deleteLog: (id) => set((s) => ({ logs: s.logs.filter((x) => x.id !== id) })),
  savePlan: (p) => set((s) => ({ savedPlans: [p, ...s.savedPlans.filter((x) => x.id !== p.id)].slice(0, 20) })),
  deletePlan: (id) => set((s) => ({ savedPlans: s.savedPlans.filter((x) => x.id !== id) })),
  clear: () => set({ logs: [], savedPlans: [] }),
    }),
    {
      name: 'gym-workouts',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useWorkoutsStore.setState({ _h: true });
      },
    },
  ),
);

/** 某动作最近一次的完成情况（取最后一组） */
export function lastPerformanceOf(logs: WorkoutLog[], exerciseId: number): { weight: number; reps: number; date: string } | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const e = logs[i].exercises.find((x) => x.exerciseId === exerciseId);
    if (e && e.sets.length > 0) {
      const s = e.sets[e.sets.length - 1];
      return { weight: s.weight, reps: s.reps, date: logs[i].date };
    }
  }
  return null;
}

/**
 * 取某动作上次成绩：动作库动作按 ID 匹配；
 * 自定义动作（ID <= 0）没有库 ID，退化为按动作名匹配。
 */
export function lastPerformanceFor(
  logs: WorkoutLog[],
  exerciseId: number,
  name?: string,
): { weight: number; reps: number; date: string } | null {
  if (exerciseId > 0) return lastPerformanceOf(logs, exerciseId);
  const key = (name ?? '').trim();
  if (!key) return null;
  for (let i = logs.length - 1; i >= 0; i--) {
    const e = logs[i].exercises.find((x) => x.name === key);
    if (e && e.sets.length > 0) {
      const s = e.sets[e.sets.length - 1];
      return { weight: s.weight, reps: s.reps, date: logs[i].date };
    }
  }
  return null;
}
