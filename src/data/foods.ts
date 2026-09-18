import type { Food } from '../types';

export const FOOD_CATS = ['全部', '主食', '蛋白质', '蔬果', '菜肴', '油脂坚果', '零食饮品'];

/** 营养值为每 100g（固体）或每 100ml（液体）的近似值，portionG 为常见一份的参考克数 */
export const FOODS: Food[] = [
  // 主食
  { id: 1, name: '米饭(熟)', cat: '主食', kcal: 116, protein: 2.6, carbs: 26, fat: 0.3, portionG: 200 },
  { id: 2, name: '糙米饭(熟)', cat: '主食', kcal: 112, protein: 2.6, carbs: 23, fat: 0.9, portionG: 150 },
  { id: 3, name: '馒头', cat: '主食', kcal: 221, protein: 7, carbs: 47, fat: 1, portionG: 100 },
  { id: 4, name: '全麦面包', cat: '主食', kcal: 250, protein: 9, carbs: 45, fat: 4, portionG: 35 },
  { id: 5, name: '面条(熟)', cat: '主食', kcal: 110, protein: 3.6, carbs: 22, fat: 0.4, portionG: 250 },
  { id: 6, name: '燕麦(干)', cat: '主食', kcal: 377, protein: 13, carbs: 67, fat: 7, portionG: 40 },
  { id: 7, name: '红薯(熟)', cat: '主食', kcal: 90, protein: 2, carbs: 21, fat: 0.2, portionG: 150 },
  { id: 8, name: '土豆(熟)', cat: '主食', kcal: 87, protein: 2, carbs: 20, fat: 0.1, portionG: 150 },
  { id: 9, name: '玉米(鲜)', cat: '主食', kcal: 112, protein: 4, carbs: 23, fat: 1.2, portionG: 200 },
  { id: 10, name: '藜麦(熟)', cat: '主食', kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, portionG: 150 },
  { id: 11, name: '山药', cat: '主食', kcal: 57, protein: 1.9, carbs: 12, fat: 0.2, portionG: 150 },
  { id: 12, name: '南瓜', cat: '主食', kcal: 23, protein: 1, carbs: 5, fat: 0.1, portionG: 150 },

  // 蛋白质
  { id: 13, name: '鸡胸肉', cat: '蛋白质', kcal: 118, protein: 23.6, carbs: 0.6, fat: 1.9, portionG: 150 },
  { id: 14, name: '鸡腿(去皮)', cat: '蛋白质', kcal: 146, protein: 20.3, carbs: 0, fat: 7, portionG: 120 },
  { id: 15, name: '鸡蛋', cat: '蛋白质', kcal: 144, protein: 13.3, carbs: 2.8, fat: 8.8, portionG: 50 },
  { id: 16, name: '牛瘦肉', cat: '蛋白质', kcal: 125, protein: 20.2, carbs: 1.8, fat: 4.2, portionG: 100 },
  { id: 17, name: '猪里脊', cat: '蛋白质', kcal: 155, protein: 20.2, carbs: 0.7, fat: 7.9, portionG: 100 },
  { id: 18, name: '羊瘦肉', cat: '蛋白质', kcal: 118, protein: 20.5, carbs: 0.2, fat: 3.9, portionG: 100 },
  { id: 19, name: '三文鱼', cat: '蛋白质', kcal: 180, protein: 19.9, carbs: 0, fat: 10.5, portionG: 120 },
  { id: 20, name: '鳕鱼', cat: '蛋白质', kcal: 88, protein: 20.4, carbs: 0.5, fat: 0.5, portionG: 120 },
  { id: 21, name: '基围虾', cat: '蛋白质', kcal: 101, protein: 18.2, carbs: 3.9, fat: 1.4, portionG: 100 },
  { id: 22, name: '金枪鱼罐头(水浸)', cat: '蛋白质', kcal: 116, protein: 25.5, carbs: 0, fat: 0.8, portionG: 100 },
  { id: 23, name: '牛奶', cat: '蛋白质', kcal: 54, protein: 3, carbs: 3.4, fat: 3.2, portionG: 250 },
  { id: 24, name: '无糖酸奶', cat: '蛋白质', kcal: 62, protein: 3.5, carbs: 4.8, fat: 3.3, portionG: 200 },
  { id: 25, name: '希腊酸奶', cat: '蛋白质', kcal: 97, protein: 9, carbs: 4, fat: 5, portionG: 150 },
  { id: 26, name: '豆腐', cat: '蛋白质', kcal: 82, protein: 8.1, carbs: 1.9, fat: 3.7, portionG: 100 },
  { id: 27, name: '豆腐干', cat: '蛋白质', kcal: 140, protein: 16.2, carbs: 4, fat: 5.9, portionG: 80 },
  { id: 28, name: '腐竹(干)', cat: '蛋白质', kcal: 461, protein: 44.6, carbs: 22.3, fat: 21.7, portionG: 20 },
  { id: 29, name: '黄豆(熟)', cat: '蛋白质', kcal: 172, protein: 17, carbs: 9, fat: 9, portionG: 100 },
  { id: 30, name: '蛋白粉(干粉)', cat: '蛋白质', kcal: 380, protein: 80, carbs: 7, fat: 5, portionG: 30 },
  { id: 31, name: '鹰嘴豆(熟)', cat: '蛋白质', kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6, portionG: 150 },

  // 蔬果
  { id: 32, name: '西兰花', cat: '蔬果', kcal: 36, protein: 2.8, carbs: 6.7, fat: 0.4, portionG: 100 },
  { id: 33, name: '菠菜', cat: '蔬果', kcal: 24, protein: 2.6, carbs: 3.6, fat: 0.3, portionG: 100 },
  { id: 34, name: '生菜', cat: '蔬果', kcal: 15, protein: 1.3, carbs: 2, fat: 0.2, portionG: 100 },
  { id: 35, name: '番茄', cat: '蔬果', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, portionG: 150 },
  { id: 36, name: '黄瓜', cat: '蔬果', kcal: 16, protein: 0.8, carbs: 2.9, fat: 0.1, portionG: 150 },
  { id: 37, name: '胡萝卜', cat: '蔬果', kcal: 39, protein: 1, carbs: 8.8, fat: 0.2, portionG: 100 },
  { id: 38, name: '白菜', cat: '蔬果', kcal: 20, protein: 1.5, carbs: 3.2, fat: 0.1, portionG: 150 },
  { id: 39, name: '蘑菇', cat: '蔬果', kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, portionG: 100 },
  { id: 40, name: '香蕉', cat: '蔬果', kcal: 93, protein: 1.4, carbs: 22, fat: 0.2, portionG: 120 },
  { id: 41, name: '苹果', cat: '蔬果', kcal: 53, protein: 0.3, carbs: 14, fat: 0.2, portionG: 200 },
  { id: 42, name: '橙子', cat: '蔬果', kcal: 48, protein: 1, carbs: 12, fat: 0.1, portionG: 150 },
  { id: 43, name: '蓝莓', cat: '蔬果', kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, portionG: 100 },
  { id: 44, name: '草莓', cat: '蔬果', kcal: 32, protein: 0.7, carbs: 7, fat: 0.3, portionG: 150 },
  { id: 45, name: '牛油果', cat: '蔬果', kcal: 161, protein: 2, carbs: 8.5, fat: 15.3, portionG: 100 },

  // 菜肴（整份近似值）
  { id: 46, name: '番茄炒蛋', cat: '菜肴', kcal: 95, protein: 5, carbs: 6, fat: 6, portionG: 200 },
  { id: 47, name: '清炒青菜(含油)', cat: '菜肴', kcal: 90, protein: 1.8, carbs: 4.5, fat: 7.2, portionG: 150 },
  { id: 48, name: '白灼虾', cat: '菜肴', kcal: 100, protein: 18, carbs: 2, fat: 2, portionG: 100 },
  { id: 49, name: '卤牛肉', cat: '菜肴', kcal: 160, protein: 30, carbs: 4, fat: 4, portionG: 100 },
  { id: 50, name: '清蒸鱼', cat: '菜肴', kcal: 105, protein: 17, carbs: 1, fat: 3.5, portionG: 150 },
  { id: 51, name: '鸡胸沙拉(无酱)', cat: '菜肴', kcal: 90, protein: 12, carbs: 5, fat: 2, portionG: 250 },
  { id: 52, name: '蛋炒饭', cat: '菜肴', kcal: 186, protein: 5.6, carbs: 25, fat: 6.8, portionG: 300 },
  { id: 53, name: '猪肉白菜水饺', cat: '菜肴', kcal: 232, protein: 8.5, carbs: 29, fat: 9, portionG: 100 },
  { id: 54, name: '牛肉面(一碗)', cat: '菜肴', kcal: 88, protein: 4.6, carbs: 10, fat: 3, portionG: 500 },
  { id: 55, name: '宫保鸡丁', cat: '菜肴', kcal: 193, protein: 13, carbs: 8, fat: 12, portionG: 200 },

  // 油脂坚果
  { id: 56, name: '橄榄油', cat: '油脂坚果', kcal: 884, protein: 0, carbs: 0, fat: 100, portionG: 10 },
  { id: 57, name: '花生酱', cat: '油脂坚果', kcal: 588, protein: 25, carbs: 20, fat: 50, portionG: 15 },
  { id: 58, name: '杏仁', cat: '油脂坚果', kcal: 579, protein: 21, carbs: 22, fat: 50, portionG: 15 },
  { id: 59, name: '混合坚果', cat: '油脂坚果', kcal: 607, protein: 20, carbs: 21, fat: 54, portionG: 15 },
  { id: 60, name: '黑巧克力(85%)', cat: '油脂坚果', kcal: 546, protein: 4.9, carbs: 61, fat: 31, portionG: 10 },

  // 零食饮品
  { id: 61, name: '薯片', cat: '零食饮品', kcal: 548, protein: 6, carbs: 50, fat: 37, portionG: 70 },
  { id: 62, name: '可乐', cat: '零食饮品', kcal: 43, protein: 0, carbs: 10.6, fat: 0, portionG: 330 },
  { id: 63, name: '啤酒', cat: '零食饮品', kcal: 43, protein: 0.5, carbs: 3.6, fat: 0, portionG: 500 },
  { id: 64, name: '拿铁(全脂奶)', cat: '零食饮品', kcal: 55, protein: 3, carbs: 5, fat: 2.5, portionG: 300 },
  { id: 65, name: '奶茶(全糖)', cat: '零食饮品', kcal: 120, protein: 1.5, carbs: 20, fat: 4, portionG: 500 },
  { id: 66, name: '蛋白棒', cat: '零食饮品', kcal: 350, protein: 30, carbs: 35, fat: 10, portionG: 60 },
];
