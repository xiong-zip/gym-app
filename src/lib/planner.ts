import { EMPHASIS, EXERCISES, EXERCISE_BY_ID, MUSCLE_ZH } from '../data/exercises';
import type {
  AISettings, Equipment, EquipmentAccess, Exercise, Experience,
  GeneratedPlan, MuscleGroup, PlannedExercise, Profile, SessionType,
} from '../types';
import { chat, extractJson, type ChatMessage } from './ai';

export const DURATION_OPTIONS = [30, 45, 60, 75];

export const EQUIP_ACCESS_TEXT: Record<EquipmentAccess, string> = {
  gym: '健身房（杠铃/哑铃/器械/绳索齐全）',
  home: '家庭（哑铃/壶铃/弹力带/自重）',
  bodyweight: '徒手（仅自重）',
};

const EQUIP_ACCESS: Record<EquipmentAccess, Equipment[]> = {
  gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'],
  home: ['dumbbell', 'bodyweight', 'kettlebell', 'band', 'other'],
  bodyweight: ['bodyweight', 'other'],
};

// ---------- 周计划分化 ----------

interface SessionDef { label: string; focus: MuscleGroup[] }

export const SESSION_DEFS: Record<SessionType, SessionDef> = {
  fullA: { label: '全身训练 A', focus: ['quads', 'chest', 'back', 'shoulders', 'core'] },
  fullB: { label: '全身训练 B', focus: ['hamstrings', 'back', 'chest', 'triceps', 'core'] },
  fullC: { label: '全身训练 C', focus: ['glutes', 'chest', 'back', 'shoulders', 'core'] },
  upperA: { label: '上肢 A（推为主）', focus: ['chest', 'shoulders', 'triceps', 'back'] },
  upperB: { label: '上肢 B（拉为主）', focus: ['back', 'biceps', 'chest', 'shoulders'] },
  lowerA: { label: '下肢 A（腿为主）', focus: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
  lowerB: { label: '下肢 B（臀为主）', focus: ['hamstrings', 'glutes', 'quads', 'calves', 'core'] },
  pushA: { label: '推日（胸肩三头）', focus: ['chest', 'shoulders', 'triceps'] },
  pushB: { label: '推日（肩胸三头）', focus: ['shoulders', 'chest', 'triceps'] },
  pullA: { label: '拉日（背二头）', focus: ['back', 'biceps', 'shoulders'] },
  pullB: { label: '拉日（背部厚度）', focus: ['back', 'biceps'] },
  legsA: { label: '腿日（股四为主）', focus: ['quads', 'hamstrings', 'glutes', 'calves'] },
  legsB: { label: '腿日（臀腿后侧）', focus: ['glutes', 'hamstrings', 'quads', 'calves'] },
  custom: { label: '自定义', focus: [] },
};

const SCHEDULE_MAP: Record<number, { days: number[]; types: SessionType[] }> = {
  2: { days: [1, 4], types: ['fullA', 'fullB'] },
  3: { days: [1, 3, 5], types: ['fullA', 'fullB', 'fullC'] },
  4: { days: [1, 2, 4, 5], types: ['upperA', 'lowerA', 'upperB', 'lowerB'] },
  5: { days: [1, 2, 3, 5, 6], types: ['pushA', 'pullA', 'legsA', 'upperA', 'lowerA'] },
  6: { days: [1, 2, 3, 4, 5, 6], types: ['pushA', 'pullA', 'legsA', 'pushB', 'pullB', 'legsB'] },
};

export interface WeekSchedule { days: number[]; types: SessionType[] }

export function weekSchedule(daysPerWeek: number): WeekSchedule {
  const d = Math.min(6, Math.max(2, Math.round(daysPerWeek)));
  return SCHEDULE_MAP[d] ?? SCHEDULE_MAP[3];
}

/** weekday: 0=周日；当天未安排返回 null */
export function sessionForWeekday(daysPerWeek: number, weekday: number): SessionType | null {
  const s = weekSchedule(daysPerWeek);
  const i = s.days.indexOf(weekday);
  return i === -1 ? null : s.types[i];
}

/** 下一个有安排的训练日（从 weekday 的下一天开始找） */
export function nextSessionAfter(daysPerWeek: number, weekday: number): SessionType {
  const s = weekSchedule(daysPerWeek);
  for (let i = 1; i <= 7; i++) {
    const w = (weekday + i) % 7;
    const j = s.days.indexOf(w);
    if (j !== -1) return s.types[j];
  }
  return 'fullA';
}

// ---------- 动作筛选与选取 ----------

export interface PlanProfile { equipment: EquipmentAccess; experience: Experience }

export function candidates(mg: MuscleGroup, profile: PlanProfile, emphasis?: string): Exercise[] {
  const allowed = EQUIP_ACCESS[profile.equipment];
  const pool = EXERCISES.filter((e) => e.primary === mg && allowed.includes(e.equipment));
  if (emphasis) {
    const hit = pool.filter((e) => e.subregion === emphasis);
    if (hit.length >= 3) return hit;
    const rest = pool.filter((e) => e.subregion !== emphasis);
    return [...hit, ...rest];
  }
  return pool;
}

function rngFrom(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
}

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickForMuscle(mg: MuscleGroup, need: number, profile: PlanProfile, emphasis: string | undefined, rnd: () => number): Exercise[] {
  let pool = shuffled(candidates(mg, profile, emphasis), rnd);
  // 新手优先低门槛动作（稳定排序，同难度内保持随机）
  if (profile.experience === 'beginner') pool = [...pool].sort((a, b) => a.difficulty - b.difficulty);
  const compounds = pool.filter((e) => e.compound);
  const isos = pool.filter((e) => !e.compound);
  return [...compounds, ...isos].slice(0, need);
}

function buildPlanned(ex: Exercise, isFirst: boolean, exp: Experience): PlannedExercise {
  const sets = ex.timed ? 3 : isFirst && ex.compound ? 4 : 3;
  let reps: string;
  if (ex.timed) reps = ex.primary === 'cardio' ? '15分钟' : '40秒';
  else if (ex.compound) reps = exp === 'beginner' ? '10-12' : '8-12';
  else reps = ex.primary === 'calves' ? '15-20' : '12-15';
  const restSec = ex.timed ? 45 : ex.compound ? 90 : 60;
  return { exerciseId: ex.id, name: ex.name, sets, reps, restSec, timed: ex.timed, note: ex.tips };
}

// ---------- 规则引擎生成 ----------

export interface PlanOptions {
  focus: MuscleGroup[];
  emphasis?: string;
  durationMin: number;
  profile: Profile;
  sessionType?: SessionType;
  seedKey?: string;
  title?: string;
}

const SLOTS: Record<number, number> = { 30: 4, 45: 5, 60: 6, 75: 7 };

export function generateRulePlan(o: PlanOptions): GeneratedPlan {
  const focus = [...new Set(o.focus)];
  if (focus.length === 0) throw new Error('至少选择一个训练部位');
  const rnd = rngFrom(`${o.seedKey ?? ''}|${focus.join(',')}|${o.emphasis ?? ''}|${o.durationMin}`);
  const total = SLOTS[o.durationMin] ?? 5;
  const per = focus.map(() => Math.floor(total / focus.length));
  for (let i = 0; i < total - per.reduce((a, b) => a + b, 0); i++) per[i % focus.length]++;

  const chunks: PlannedExercise[][] = [];
  focus.forEach((mg, i) => {
    const picked = pickForMuscle(mg, per[i], o.profile, o.emphasis, rnd);
    chunks.push(picked.map((ex, k) => buildPlanned(ex, k === 0 && i === 0, o.profile.experience)));
  });

  // 轮转合并：每个部位的高优先动作排前面，复合动作优先
  const ordered: PlannedExercise[] = [];
  const maxLen = Math.max(0, ...chunks.map((c) => c.length));
  for (let j = 0; j < maxLen; j++) chunks.forEach((c) => { if (c[j]) ordered.push(c[j]); });

  const label = focus.map((m) => MUSCLE_ZH[m]).join(' + ');
  return {
    id: `rule-${Date.now()}`,
    title: o.title ?? `${o.emphasis ? `${o.emphasis}侧重 · ` : ''}${label} ${o.durationMin}分钟`,
    sessionType: o.sessionType ?? 'custom',
    focus,
    durationMin: o.durationMin,
    source: 'rule',
    tips: '复合动作优先保证姿势与重量，末尾孤立动作可以做到接近力竭。完成当日计划后记得记录组数与重量，下次自动参考。',
    exercises: ordered,
    createdAt: Date.now(),
  };
}

export function generateSessionPlan(sessionType: SessionType, profile: Profile, seedKey: string, durationMin = 60): GeneratedPlan {
  const def = SESSION_DEFS[sessionType];
  return generateRulePlan({ focus: def.focus, durationMin, profile, sessionType, seedKey, title: def.label });
}

// ---------- AI 生成 ----------

export async function generateAIPlan(o: PlanOptions, ai: AISettings): Promise<GeneratedPlan> {
  const focus = [...new Set(o.focus)];
  const cand = focus.flatMap((mg) => candidates(mg, o.profile, o.emphasis)).slice(0, 40);
  if (cand.length < 3) throw new Error('当前条件下动作库匹配不足');

  const lib = cand.map((e) => ({ id: e.id, name: e.name, muscle: MUSCLE_ZH[e.primary], region: e.subregion ?? '' }));
  const target = focus.map((m) => MUSCLE_ZH[m]).join('、');
  const prompt = [
    '你是资深力量训练教练，请为用户编排一次训练计划。',
    `训练水平：${o.profile.experience === 'beginner' ? '新手（1年内）' : o.profile.experience === 'intermediate' ? '中级（1-3年）' : '高级（3年以上）'}`,
    `器械条件：${EQUIP_ACCESS_TEXT[o.profile.equipment]}`,
    `训练时长：约${o.durationMin}分钟`,
    `目标肌群：${target}${o.emphasis ? `（侧重${o.emphasis}）` : ''}`,
    '',
    '要求：',
    '1. 只能从下方动作库中选动作，用 exercise_id 引用；',
    `2. 共安排${SLOTS[o.durationMin] ?? 5}个动作，复合动作在前、孤立动作在后；`,
    '3. 每个动作 3-4 组，reps 用区间字符串如 "8-10"；',
    '4. rest_sec 在 30-180 之间；',
    '5. 每个动作给一句简短 note；最后给一段 1-2 句的 tips。',
    '',
    `动作库：${JSON.stringify(lib)}`,
    '',
    '只输出 JSON，格式：',
    '{"plan_name":"...","exercises":[{"exercise_id":1,"sets":4,"reps":"8-10","rest_sec":90,"note":"..."}],"tips":"..."}',
  ].join('\n');

  const messages: ChatMessage[] = [
    { role: 'system', content: '你是专业力量训练教练，只输出合法 JSON，不输出任何其他文字。' },
    { role: 'user', content: prompt },
  ];
  const raw = await chat(ai, messages, 0.6);
  const data = extractJson(raw) as {
    plan_name?: unknown;
    tips?: unknown;
    exercises?: Array<Record<string, unknown>>;
  };
  const arr = Array.isArray(data.exercises) ? data.exercises : [];
  const planned: PlannedExercise[] = [];
  for (const it of arr) {
    const id = Number(it.exercise_id ?? it.id);
    const ex = EXERCISE_BY_ID.get(id);
    if (!ex) continue;
    const sets = Math.min(5, Math.max(2, Number(it.sets) || 3));
    const reps = String(it.reps ?? '10-12').slice(0, 10);
    const restSec = Math.min(180, Math.max(30, Number(it.rest_sec ?? it.rest) || 90));
    const note = it.note ? String(it.note).slice(0, 80) : undefined;
    planned.push({ exerciseId: id, name: ex.name, sets, reps, restSec, timed: ex.timed, note });
    if (planned.length >= 8) break;
  }
  if (planned.length < 3) throw new Error('AI 计划解析失败，动作引用无效');

  return {
    id: `ai-${Date.now()}`,
    title: String(data.plan_name ?? `${focus.map((m) => MUSCLE_ZH[m]).join('+')} 智能训练`).slice(0, 30),
    sessionType: o.sessionType ?? 'custom',
    focus,
    durationMin: o.durationMin,
    source: 'ai',
    tips: String(data.tips ?? '').slice(0, 200),
    exercises: planned,
    createdAt: Date.now(),
  };
}

export { EMPHASIS, MUSCLE_ZH };
