import type { ExerciseLog, WorkoutLog } from '../types';

/** Epley 估算 1RM：重量×次数综合换算，轻重量多次数的好成绩也能被认出来 */
export function e1rm(w: number, r: number): number {
  return w > 0 && r > 0 ? Math.round(w * (1 + r / 30)) : 0;
}

/** 动作归组键：库内动作按 ID，自定义动作（ID<=0）按名称 */
export function exKey(e: Pick<ExerciseLog, 'exerciseId' | 'name'>): string {
  return e.exerciseId > 0 ? `id:${e.exerciseId}` : `name:${e.name}`;
}

export interface ExerciseProgress {
  key: string;
  name: string;
  best: number;
  bestDate: string;
  first: number;
  points: { date: string; value: number }[]; // 每次训练该动作的最佳 e1RM（按时间正序）
}

/**
 * 汇总全部动作的力量进步曲线：每次训练取该动作所有组中最高的估算 1RM。
 * 计时动作（秒数当次数）不参与估算，避免「40 秒×20kg」算出离谱的 1RM。
 */
export function progressByExercise(logs: WorkoutLog[]): ExerciseProgress[] {
  const map = new Map<string, ExerciseProgress>();
  const sorted = [...logs].sort((a, b) => a.startedAt - b.startedAt);
  for (const l of sorted) {
    for (const e of l.exercises) {
      if (e.timed) continue;
      const k = exKey(e);
      let p = map.get(k);
      if (!p) {
        p = { key: k, name: e.name, best: 0, bestDate: l.date, first: 0, points: [] };
        map.set(k, p);
      }
      const cur = Math.max(0, ...e.sets.map((st) => e1rm(st.weight, st.reps)));
      if (cur <= 0) continue;
      if (p.points.length === 0 || p.points[p.points.length - 1].date !== l.date) {
        p.points.push({ date: l.date, value: cur });
      } else if (cur > p.points[p.points.length - 1].value) {
        // 同一天多条记录（如保底训练+正式训练）取更高那次
        p.points[p.points.length - 1] = { date: l.date, value: cur };
      }
      if (cur > p.best) {
        p.best = cur;
        p.bestDate = l.date;
      }
      if (p.first === 0) p.first = cur;
    }
  }
  return [...map.values()].filter((p) => p.best > 0);
}

export interface WeekPR { name: string; prev: number; cur: number; date: string }

/** 本周（>= weekStart 的训练）相对历史创造的新纪录，按提升幅度排序 */
export function weekPRs(logs: WorkoutLog[], weekStart: string): WeekPR[] {
  const prior = logs.filter((l) => l.date < weekStart);
  const thisWeek = logs.filter((l) => l.date >= weekStart);
  const prevBest = new Map<string, number>();
  for (const l of prior) {
    for (const e of l.exercises) {
      if (e.timed) continue;
      const k = exKey(e);
      const cur = Math.max(0, ...e.sets.map((st) => e1rm(st.weight, st.reps)));
      prevBest.set(k, Math.max(prevBest.get(k) ?? 0, cur));
    }
  }
  const out: WeekPR[] = [];
  const seen = new Set<string>();
  for (const l of thisWeek) {
    for (const e of l.exercises) {
      if (e.timed) continue;
      const k = exKey(e);
      if (seen.has(k)) continue;
      const cur = Math.max(0, ...e.sets.map((st) => e1rm(st.weight, st.reps)));
      const prev = prevBest.get(k) ?? 0;
      seen.add(k);
      if (prev > 0 && cur > prev) out.push({ name: e.name, prev, cur, date: l.date });
    }
  }
  return out.sort((a, b) => b.cur - b.prev - (a.cur - a.prev));
}

/** 一次训练的总容量（kg）；计时动作不计入（秒数×重量没有训练学意义） */
export function volumeOfLog(l: WorkoutLog): number {
  return Math.round(l.exercises.reduce((a, e) => (
    e.timed ? a : a + e.sets.reduce((b, x) => b + x.weight * x.reps, 0)
  ), 0));
}
