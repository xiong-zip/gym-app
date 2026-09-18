import type { ActivityLevel, Gender, Goal, Profile } from '../types';

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

export const ACTIVITY_ZH: Record<ActivityLevel, string> = {
  sedentary: '久坐少动',
  light: '轻度活动（每周1-3次）',
  moderate: '中度活动（每周3-5次）',
  high: '高强度（每周6-7次）',
};

export const GOAL_ZH: Record<Goal, string> = {
  cut: '减脂',
  recomp: '塑形（增肌减脂）',
  bulk: '增肌',
  health: '保持健康',
};

export const GENDER_ZH: Record<Gender, string> = { male: '男', female: '女' };

export interface NutritionTarget {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Mifflin-St Jeor 公式 + 活动系数 + 目标调整，含安全下限 */
export function calcNutrition(p: Profile): NutritionTarget {
  const bmr = Math.round(10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.gender === 'male' ? 5 : -161));
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[p.activityLevel]);
  let kcal = tdee;
  if (p.goal === 'cut') kcal = tdee - 400;
  else if (p.goal === 'bulk') kcal = tdee + 250;
  // 安全下限：不低于性别下限，也不超过 TDEE（避免极小基数人群被下限顶高）
  const hardFloor = p.gender === 'male' ? 1500 : 1200;
  kcal = Math.max(kcal, Math.min(hardFloor, tdee));
  const proteinPerKg = p.goal === 'bulk' ? 1.8 : 2.0;
  const protein = Math.round(p.weightKg * proteinPerKg);
  const fat = Math.round(p.weightKg * (p.goal === 'cut' ? 0.8 : 1.0));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr, tdee, kcal, protein, carbs, fat };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}
