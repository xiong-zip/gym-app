import { FOODS } from '../data/foods';
import type { Food, FoodLog } from '../types';

export interface SuggestItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealSuggestion {
  items: SuggestItem[];
  kcal: number;
  protein: number;
  carbs: number;
}

function itemOf(f: Food, grams: number): SuggestItem {
  const g = Math.max(10, Math.round(grams));
  return {
    name: f.name,
    grams: g,
    kcal: Math.round((f.kcal * g) / 100),
    protein: +((f.protein * g) / 100).toFixed(1),
    carbs: +((f.carbs * g) / 100).toFixed(1),
    fat: +((f.fat * g) / 100).toFixed(1),
  };
}

function seedPick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

const PROTEIN_POOL = ['鸡胸肉', '鸡蛋', '牛瘦肉', '三文鱼', '基围虾', '希腊酸奶', '无糖酸奶', '豆腐干'];
const STAPLE_POOL = ['米饭(熟)', '全麦面包', '红薯(熟)', '燕麦(干)', '面条(熟)', '玉米(鲜)'];
const VEG_POOL = ['西兰花', '番茄', '黄瓜', '菠菜', '生菜', '蓝莓'];

/**
 * 按剩余宏量推荐「下一餐」：优先补蛋白，再配主食与蔬果；
 * 总热量控制在剩余额度内。返回 null 表示额度太少不值得吃。
 */
export function suggestMeal(
  remain: { kcal: number; protein: number; carbs: number; fat: number },
  seed = '',
): MealSuggestion | null {
  if (remain.kcal < 150) return null;
  const items: SuggestItem[] = [];
  let used = 0;

  // 1) 蛋白来源：按缺口定量，但最多占额度 65%
  const pFood = FOODS.find((f) => f.name === seedPick(PROTEIN_POOL, `${seed}|p`));
  if (pFood) {
    const per100 = pFood.protein;
    if (per100 > 0 && remain.protein > 8) {
      let grams = (remain.protein / per100) * 100;
      grams = Math.min(grams, (pFood.portionG ?? 100) * 2.5);
      while (grams > 40 && ((pFood.kcal * grams) / 100) > remain.kcal * 0.65) grams -= 10;
      if (grams >= 40) {
        const it = itemOf(pFood, Math.round(grams / 10) * 10);
        items.push(it);
        used += it.kcal;
      }
    }
  }

  // 2) 主食：碳水缺口 > 30g 且额度还够
  const sFood = FOODS.find((f) => f.name === seedPick(STAPLE_POOL, `${seed}|c`));
  if (sFood && remain.carbs > 30 && remain.kcal - used > 120) {
    let grams = Math.min((remain.carbs / Math.max(1, sFood.carbs)) * 100, sFood.portionG ?? 150);
    while (grams > 30 && used + (sFood.kcal * grams) / 100 > remain.kcal - 60) grams -= 10;
    if (grams >= 30) {
      const it = itemOf(sFood, Math.round(grams / 10) * 10);
      items.push(it);
      used += it.kcal;
    }
  }

  // 3) 蔬果：还有 80kcal 以上额度就补一份
  const vFood = FOODS.find((f) => f.name === seedPick(VEG_POOL, `${seed}|v`));
  if (vFood && remain.kcal - used > 80) {
    const it = itemOf(vFood, vFood.portionG ?? 100);
    items.push(it);
    used += it.kcal;
  }

  if (items.length === 0) return null;
  return {
    items,
    kcal: Math.round(items.reduce((a, b) => a + b.kcal, 0)),
    protein: Math.round(items.reduce((a, b) => a + b.protein, 0)),
    carbs: Math.round(items.reduce((a, b) => a + b.carbs, 0)),
  };
}

export interface MealCombo {
  name: string;      // 「鸡胸肉+米饭」
  items: SuggestItem[]; // 按最后一次吃的份量
  kcal: number;
  count: number;
}

/**
 * 常吃组合：同一餐里反复一起出现的食物（≥2 次），点一下整餐入账。
 * 份量照抄最近一次，避免每次都重新估。
 */
export function frequentCombos(logs: FoodLog[], limit = 6): MealCombo[] {
  const groups = new Map<string, { date: string; meal: string; items: SuggestItem[] }>();
  // 按日期+餐次分桶（logs 按时间追加，后面的覆盖前面 → 留下最近一次）
  for (const l of logs) {
    const k = `${l.date}|${l.meal}`;
    const it: SuggestItem = { name: l.name, grams: l.grams, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat };
    const cur = groups.get(k);
    if (cur) cur.items.push(it);
    else groups.set(k, { date: l.date, meal: l.meal, items: [it] });
  }
  const comboCount = new Map<string, number>();
  const comboItems = new Map<string, { date: string; meal: string; items: SuggestItem[] }>();
  for (const g of groups.values()) {
    if (g.items.length < 2) continue;
    const names = [...new Set(g.items.map((i) => i.name))].sort();
    if (names.length < 2) continue;
    const key = names.join('+');
    comboCount.set(key, (comboCount.get(key) ?? 0) + 1);
    // 同组合保留最近一次的份量
    const prev = comboItems.get(key);
    if (!prev || prev.date < g.date) comboItems.set(key, { date: g.date, meal: g.meal, items: g.items });
  }
  return [...comboCount.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => {
      const src = comboItems.get(key)!;
      const items = src.items.filter((it) => key.split('+').includes(it.name));
      return {
        name: key.split('+').join(' + '),
        items,
        kcal: Math.round(items.reduce((a, b) => a + b.kcal, 0)),
        count,
      };
    });
}
