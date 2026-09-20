export type Gender = 'male' | 'female';
export type Goal = 'cut' | 'recomp' | 'bulk' | 'health';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentAccess = 'gym' | 'home' | 'bodyweight';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high';

export interface Profile {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  equipment: EquipmentAccess;
  activityLevel: ActivityLevel;
  createdAt: number;
  updatedAt: number;
}

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'cardio';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'other';

export interface Exercise {
  id: number;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  difficulty: 1 | 2 | 3;
  compound: boolean;
  timed?: boolean;
  subregion?: string;
  tips: string;
}

export type SessionType =
  | 'fullA' | 'fullB' | 'fullC'
  | 'upperA' | 'upperB' | 'lowerA' | 'lowerB'
  | 'pushA' | 'pushB' | 'pullA' | 'pullB'
  | 'legsA' | 'legsB' | 'custom';

export interface PlannedExercise {
  exerciseId: number;
  name: string;
  sets: number;
  reps: string;
  restSec: number;
  note?: string;
  timed?: boolean;
}

export interface GeneratedPlan {
  id: string;
  title: string;
  sessionType: SessionType;
  focus: MuscleGroup[];
  durationMin: number;
  source: 'rule' | 'ai' | 'custom';
  tips: string;
  exercises: PlannedExercise[];
  createdAt: number;
}

export interface SetLog { weight: number; reps: number }
export interface ExerciseLog { exerciseId: number; name: string; sets: SetLog[] }
export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  durationSec: number;
  title: string;
  sessionType: SessionType;
  exercises: ExerciseLog[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Food {
  id: number;
  name: string;
  cat: string;
  kcal: number;   // per 100g / 100ml
  protein: number;
  carbs: number;
  fat: number;
  portionG?: number;
}

export interface FoodLog {
  id: string;
  date: string;
  meal: MealType;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number;
  bodyFat?: number;
}

export interface AISettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/* ---------- 手帐 plog ---------- */

export type JournalKind = 'workout' | 'meal' | 'free';

export interface JournalSticker {
  id: string;
  uri: string;        // data URI（base64）或本地文件 URI
  x: number;          // 画布归一化坐标 0..1
  y: number;
  rot: number;        // 角度
  scale: number;
  cutout?: boolean;   // 端上抠图贴纸（自带白描边，不套相纸框）
  iw?: number;        // 贴纸原始宽高（保持比例）
  ih?: number;
}

export interface DoodlePath {
  id: string;
  color: string;
  width: number;
  points: number[][]; // 归一化坐标点 [x, y]，0..1
}

export interface JournalEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  kind: JournalKind;
  title: string;
  note: string;
  stickers: JournalSticker[];
  doodles: DoodlePath[];
  statsText?: string; // 自动盖章的数据（训练容量 / 餐次）
  createdAt: number;
}
