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
  source: 'rule' | 'ai';
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
