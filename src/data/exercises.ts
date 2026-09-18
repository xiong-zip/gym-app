import type { Exercise, MuscleGroup } from '../types';

export const MUSCLE_ZH: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  biceps: '肱二头肌',
  triceps: '肱三头肌',
  quads: '股四头肌',
  hamstrings: '腘绳肌',
  glutes: '臀',
  calves: '小腿',
  core: '核心',
  cardio: '有氧',
};

export const EQUIP_ZH: Record<string, string> = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  machine: '器械',
  cable: '绳索',
  bodyweight: '自重',
  kettlebell: '壶铃',
  band: '弹力带',
  other: '其他',
};

export const MUSCLE_ORDER: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

/** 部位下的侧重细分（用于 AI 计划） */
export const EMPHASIS: Partial<Record<MuscleGroup, string[]>> = {
  chest: ['上胸', '中胸', '下胸'],
  back: ['背阔肌', '中背', '上背'],
  shoulders: ['前束', '中束', '后束'],
  core: ['上腹', '下腹', '腹斜'],
  glutes: ['臀大肌', '臀中肌'],
};

export const EXERCISES: Exercise[] = [
  // ---------- 胸 ----------
  { id: 1, name: '平板杠铃卧推', primary: 'chest', secondary: ['triceps', 'shoulders'], equipment: 'barbell', difficulty: 3, compound: true, subregion: '中胸', tips: '肩胛后缩下沉，杠铃落在乳头线附近，小臂垂直地面。' },
  { id: 2, name: '上斜杠铃卧推', primary: 'chest', secondary: ['shoulders', 'triceps'], equipment: 'barbell', difficulty: 3, compound: true, subregion: '上胸', tips: '凳面调至30°，落点在锁骨下方，避免耸肩。' },
  { id: 3, name: '下斜杠铃卧推', primary: 'chest', secondary: ['triceps'], equipment: 'barbell', difficulty: 2, compound: true, subregion: '下胸', tips: '固定下肢，杠铃落点低于乳头线，控制离心。' },
  { id: 4, name: '平板哑铃卧推', primary: 'chest', secondary: ['triceps', 'shoulders'], equipment: 'dumbbell', difficulty: 2, compound: true, subregion: '中胸', tips: '哑铃沿弧线下放至胸两侧，底部感受胸肌拉伸。' },
  { id: 5, name: '上斜哑铃卧推', primary: 'chest', secondary: ['shoulders', 'triceps'], equipment: 'dumbbell', difficulty: 2, compound: true, subregion: '上胸', tips: '30°上斜，顶部不完全锁肘，保持上胸张力。' },
  { id: 6, name: '下斜哑铃卧推', primary: 'chest', secondary: ['triceps'], equipment: 'dumbbell', difficulty: 2, compound: true, subregion: '下胸', tips: '控制下放速度，小重量找下胸发力感。' },
  { id: 7, name: '平板哑铃飞鸟', primary: 'chest', secondary: [], equipment: 'dumbbell', difficulty: 2, compound: false, subregion: '中胸', tips: '肘部微屈固定，像环抱大树，靠胸肌收缩合拢。' },
  { id: 8, name: '上斜哑铃飞鸟', primary: 'chest', secondary: [], equipment: 'dumbbell', difficulty: 2, compound: false, subregion: '上胸', tips: '开口不用过大，重点在拉伸与挤压上胸。' },
  { id: 9, name: '蝴蝶机夹胸', primary: 'chest', secondary: [], equipment: 'machine', difficulty: 1, compound: false, subregion: '中胸', tips: '手肘微屈，顶峰收缩停1秒，想象双肘相碰。' },
  { id: 10, name: '高位绳索夹胸', primary: 'chest', secondary: [], equipment: 'cable', difficulty: 2, compound: false, subregion: '下胸', tips: '身体前倾45°，向下向内聚拢，指向腹中线。' },
  { id: 11, name: '低位绳索夹胸', primary: 'chest', secondary: [], equipment: 'cable', difficulty: 2, compound: false, subregion: '上胸', tips: '由下向上前推，像上斜飞鸟的轨迹。' },
  { id: 12, name: '俯卧撑', primary: 'chest', secondary: ['triceps', 'core'], equipment: 'bodyweight', difficulty: 1, compound: true, subregion: '中胸', tips: '身体成一条直线，手肘约45°夹角下放至胸口近地。' },
  { id: 13, name: '高位俯卧撑(手垫高)', primary: 'chest', secondary: ['triceps', 'core'], equipment: 'bodyweight', difficulty: 1, compound: true, subregion: '中胸', tips: '适合新手，垫高双手降低难度，仍要保持核心收紧。' },
  { id: 14, name: '下斜俯卧撑(脚垫高)', primary: 'chest', secondary: ['shoulders', 'core'], equipment: 'bodyweight', difficulty: 2, compound: true, subregion: '上胸', tips: '双脚垫高，肩胛稳定，难度更高。' },
  { id: 15, name: '双杠臂屈伸(身体前倾)', primary: 'chest', secondary: ['triceps'], equipment: 'bodyweight', difficulty: 2, compound: true, subregion: '下胸', tips: '身体前倾、下巴微收，重点刺激下胸。' },
  { id: 16, name: '弹力带夹胸', primary: 'chest', secondary: [], equipment: 'band', difficulty: 1, compound: false, subregion: '中胸', tips: '带子固定与肩同高，慢放快收。' },
  { id: 17, name: '哑铃地板卧推', primary: 'chest', secondary: ['triceps'], equipment: 'dumbbell', difficulty: 1, compound: true, subregion: '中胸', tips: '躺地面上，大臂触地即推起，对肩关节友好。' },

  // ---------- 背 ----------
  { id: 18, name: '引体向上(正手宽握)', primary: 'back', secondary: ['biceps', 'core'], equipment: 'bodyweight', difficulty: 3, compound: true, subregion: '背阔肌', tips: '先用肩胛下沉启动，拉到下巴过杠，别甩腿。' },
  { id: 19, name: '反手引体向上', primary: 'back', secondary: ['biceps'], equipment: 'bodyweight', difficulty: 3, compound: true, subregion: '背阔肌', tips: '反握对二头要求更高，躯干后仰一点刺激下背阔。' },
  { id: 20, name: '高位下拉(宽握)', primary: 'back', secondary: ['biceps'], equipment: 'cable', difficulty: 1, compound: true, subregion: '背阔肌', tips: '胸挺起，杆拉向上胸，肘向下向后发力。' },
  { id: 21, name: '高位下拉(窄距V柄)', primary: 'back', secondary: ['biceps'], equipment: 'cable', difficulty: 1, compound: true, subregion: '背阔肌', tips: 'V柄拉至上胸，躯干微微后仰，挤压背阔肌。' },
  { id: 22, name: '坐姿绳索划船', primary: 'back', secondary: ['biceps'], equipment: 'cable', difficulty: 1, compound: true, subregion: '中背', tips: '躯干保持直立，把手拉向腹部，肩胛后收。' },
  { id: 23, name: '杠铃俯身划船', primary: 'back', secondary: ['biceps', 'hamstrings'], equipment: 'barbell', difficulty: 3, compound: true, subregion: '中背', tips: '俯身45°，核心锁紧，杠铃贴大腿拉向下腹。' },
  { id: 24, name: '哑铃单臂划船', primary: 'back', secondary: ['biceps'], equipment: 'dumbbell', difficulty: 2, compound: true, subregion: '中背', tips: '支撑手撑凳，背放平，哑铃拉向髋部方向。' },
  { id: 25, name: 'T杠划船', primary: 'back', secondary: ['biceps'], equipment: 'machine', difficulty: 2, compound: true, subregion: '中背', tips: '胸部贴垫（或俯身站稳），用肘带动，减少手臂借力。' },
  { id: 26, name: '坐姿器械划船', primary: 'back', secondary: ['biceps'], equipment: 'machine', difficulty: 1, compound: true, subregion: '中背', tips: '轨迹稳定，重视肩胛后缩，不追求大重量晃动。' },
  { id: 27, name: '直臂下压', primary: 'back', secondary: ['core'], equipment: 'cable', difficulty: 2, compound: false, subregion: '背阔肌', tips: '手臂伸直微屈，用背阔肌把杆从高处压到大腿。' },
  { id: 28, name: '哑铃耸肩', primary: 'back', secondary: [], equipment: 'dumbbell', difficulty: 1, compound: false, tips: '垂直向上耸肩再下放，头部保持中立，不转肩。' },
  { id: 29, name: '澳式划船(低杠)', primary: 'back', secondary: ['biceps', 'core'], equipment: 'bodyweight', difficulty: 1, compound: true, subregion: '中背', tips: '脚跟撑地身体成直线，胸口拉向单杠。' },
  { id: 30, name: '传统硬拉', primary: 'back', secondary: ['hamstrings', 'glutes', 'core'], equipment: 'barbell', difficulty: 3, compound: true, tips: '背挺直、杠贴小腿，髋膝同时伸展，全程核心收紧。' },

  // ---------- 肩 ----------
  { id: 31, name: '坐姿哑铃推举', primary: 'shoulders', secondary: ['triceps', 'core'], equipment: 'dumbbell', difficulty: 2, compound: true, subregion: '前束', tips: '背部贴稳凳面，哑铃推到耳朵上方，别完全锁死。' },
  { id: 32, name: '站姿杠铃推举', primary: 'shoulders', secondary: ['triceps', 'core'], equipment: 'barbell', difficulty: 3, compound: true, subregion: '前束', tips: '核心与臀部收紧，杠铃从锁骨推过头顶，肋骨别外翻。' },
  { id: 33, name: '阿诺德推举', primary: 'shoulders', secondary: ['triceps'], equipment: 'dumbbell', difficulty: 2, compound: true, subregion: '前束', tips: '掌心朝内起、朝前推，旋转过程慢而稳。' },
  { id: 34, name: '器械坐姿推肩', primary: 'shoulders', secondary: ['triceps'], equipment: 'machine', difficulty: 1, compound: true, subregion: '前束', tips: '背贴稳靠垫，把位对准耳朵高度起推。' },
  { id: 35, name: '哑铃侧平举', primary: 'shoulders', secondary: [], equipment: 'dumbbell', difficulty: 1, compound: false, subregion: '中束', tips: '肘领先、小重量高次数，举到与肩同高即可。' },
  { id: 36, name: '绳索单臂侧平举', primary: 'shoulders', secondary: [], equipment: 'cable', difficulty: 1, compound: false, subregion: '中束', tips: '绳索从身后穿过，张力持续，顶端停顿。' },
  { id: 37, name: '哑铃俯身飞鸟', primary: 'shoulders', secondary: ['back'], equipment: 'dumbbell', difficulty: 1, compound: false, subregion: '后束', tips: '俯身45°以上，虎口相对，向两侧展开。' },
  { id: 38, name: '绳索反向飞鸟', primary: 'shoulders', secondary: ['back'], equipment: 'cable', difficulty: 1, compound: false, subregion: '后束', tips: '绳索调至低位，交叉握把向后展开，挤压后束。' },
  { id: 39, name: '蝴蝶机反向飞鸟', primary: 'shoulders', secondary: ['back'], equipment: 'machine', difficulty: 1, compound: false, subregion: '后束', tips: '反向坐蝴蝶机，把手向外打开，别耸肩。' },
  { id: 40, name: '杠铃直立划船', primary: 'shoulders', secondary: ['biceps', 'back'], equipment: 'barbell', difficulty: 2, compound: true, subregion: '中束', tips: '窄握沿身体上拉至胸口，肘高于手，肩痛就改侧平举。' },
  { id: 41, name: '哑铃前平举', primary: 'shoulders', secondary: [], equipment: 'dumbbell', difficulty: 1, compound: false, subregion: '前束', tips: '举至与肩同高，身体别后仰借力。' },
  { id: 42, name: '绳索面拉', primary: 'shoulders', secondary: ['back'], equipment: 'cable', difficulty: 1, compound: false, subregion: '后束', tips: '绳索调至面部高度，拉向额头两侧，外旋收尾。' },
  { id: 43, name: '派克俯卧撑', primary: 'shoulders', secondary: ['triceps', 'core'], equipment: 'bodyweight', difficulty: 2, compound: true, subregion: '前束', tips: '臀部高抬成倒V，头顶朝地面方向下压再推起。' },
  { id: 44, name: '弹力带侧平举', primary: 'shoulders', secondary: [], equipment: 'band', difficulty: 1, compound: false, subregion: '中束', tips: '踩住带子两端，肘微屈向两侧抬起。' },

  // ---------- 肱二头肌 ----------
  { id: 45, name: '杠铃弯举', primary: 'biceps', secondary: ['back'], equipment: 'barbell', difficulty: 1, compound: false, tips: '肘固定在身侧，杠铃弯至胸前，放下要慢。' },
  { id: 46, name: 'EZ曲杆弯举', primary: 'biceps', secondary: [], equipment: 'barbell', difficulty: 1, compound: false, tips: '曲杆握角对手腕更友好，动作同杠铃弯举。' },
  { id: 47, name: '哑铃交替弯举', primary: 'biceps', secondary: [], equipment: 'dumbbell', difficulty: 1, compound: false, tips: '上举时旋后掌心向上，顶峰挤压二头。' },
  { id: 48, name: '锤式弯举', primary: 'biceps', secondary: [], equipment: 'dumbbell', difficulty: 1, compound: false, tips: '掌心相对如握锤，重点发展肱肌与前臂。' },
  { id: 49, name: '上斜哑铃弯举', primary: 'biceps', secondary: [], equipment: 'dumbbell', difficulty: 2, compound: false, tips: '靠在上斜凳上让手臂垂在身后，拉伸长头。' },
  { id: 50, name: '牧师凳弯举', primary: 'biceps', secondary: [], equipment: 'barbell', difficulty: 2, compound: false, tips: '大臂贴紧垫面，彻底下放到接近伸直。' },
  { id: 51, name: '绳索弯举', primary: 'biceps', secondary: [], equipment: 'cable', difficulty: 1, compound: false, tips: '张力全程存在，底部也别让重量片落回。' },
  { id: 52, name: '坐姿集中弯举', primary: 'biceps', secondary: [], equipment: 'dumbbell', difficulty: 2, compound: false, tips: '肘抵大腿内侧，孤立的顶峰收缩是关键。' },
  { id: 53, name: '弹力带弯举', primary: 'biceps', secondary: [], equipment: 'band', difficulty: 1, compound: false, tips: '双脚踩稳带子，匀速弯起慢放。' },
  { id: 54, name: '反握杠铃弯举', primary: 'biceps', secondary: [], equipment: 'barbell', difficulty: 2, compound: false, tips: '掌心向下握，发展肱桡肌与前臂伸肌。' },

  // ---------- 肱三头肌 ----------
  { id: 55, name: '绳索下压', primary: 'triceps', secondary: [], equipment: 'cable', difficulty: 1, compound: false, tips: '大臂夹紧身侧，只用肘伸发力，末端充分伸直。' },
  { id: 56, name: '窄距杠铃卧推', primary: 'triceps', secondary: ['chest'], equipment: 'barbell', difficulty: 2, compound: true, tips: '握距与肩同宽略窄，肘贴近身体下落。' },
  { id: 57, name: '绳索过顶臂屈伸', primary: 'triceps', secondary: [], equipment: 'cable', difficulty: 1, compound: false, tips: '背对绳索，大臂贴耳固定，重点拉长头。' },
  { id: 58, name: '哑铃颈后臂屈伸', primary: 'triceps', secondary: [], equipment: 'dumbbell', difficulty: 1, compound: false, tips: '单/双手举哑铃过头，肘朝前，向颈后下放。' },
  { id: 59, name: 'EZ杠颈后臂屈伸', primary: 'triceps', secondary: [], equipment: 'barbell', difficulty: 1, compound: false, tips: '站姿或坐姿，肘关节不外展，稳稳下放。' },
  { id: 60, name: '仰卧杠铃臂屈伸', primary: 'triceps', secondary: [], equipment: 'barbell', difficulty: 3, compound: false, tips: '大臂垂直地面保持，只动小臂，向额头方向下放。' },
  { id: 61, name: '双杠臂屈伸(身体直立)', primary: 'triceps', secondary: ['chest'], equipment: 'bodyweight', difficulty: 2, compound: true, tips: '躯干竖直、肘贴身，重点落在三头。' },
  { id: 62, name: '板凳臂屈伸', primary: 'triceps', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, tips: '双手撑凳背对凳面，肘向后弯曲下放身体。' },
  { id: 63, name: '弹力带下压', primary: 'triceps', secondary: [], equipment: 'band', difficulty: 1, compound: false, tips: '带子挂高处，模仿绳索下压轨迹。' },

  // ---------- 股四头肌 ----------
  { id: 64, name: '杠铃深蹲', primary: 'quads', secondary: ['glutes', 'core', 'hamstrings'], equipment: 'barbell', difficulty: 3, compound: true, tips: '核心收紧、下背中立，蹲至大腿至少平行地面。' },
  { id: 65, name: '高脚杯深蹲', primary: 'quads', secondary: ['glutes', 'core'], equipment: 'dumbbell', difficulty: 1, compound: true, tips: '哑铃抱胸前，躯干自然直立，对新手极友好。' },
  { id: 66, name: '杠铃前蹲', primary: 'quads', secondary: ['core', 'glutes'], equipment: 'barbell', difficulty: 3, compound: true, tips: '杠铃架锁骨前，肘抬高，躯干更竖直，股四头刺激更强。' },
  { id: 67, name: '哈克深蹲', primary: 'quads', secondary: ['glutes'], equipment: 'machine', difficulty: 3, compound: true, tips: '背贴垫、脚位中低，蹲深并控制离心。' },
  { id: 68, name: '腿举', primary: 'quads', secondary: ['glutes'], equipment: 'machine', difficulty: 1, compound: true, tips: '脚与肩同宽踩踏板，下放至90°，膝盖别内扣。' },
  { id: 69, name: '坐姿腿屈伸', primary: 'quads', secondary: [], equipment: 'machine', difficulty: 1, compound: false, tips: '顶端停1秒挤压股四头，慢放回弹。' },
  { id: 70, name: '保加利亚分腿蹲', primary: 'quads', secondary: ['glutes', 'core'], equipment: 'dumbbell', difficulty: 2, compound: true, tips: '后脚搭凳，前腿垂直下蹲，平衡差可先徒手。' },
  { id: 71, name: '行走箭步蹲', primary: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', difficulty: 2, compound: true, tips: '步幅适中，前膝不超脚尖太多，躯干竖直。' },
  { id: 72, name: '哑铃踏箱', primary: 'quads', secondary: ['glutes'], equipment: 'dumbbell', difficulty: 1, compound: true, tips: '选稳固的箱子/凳，全脚掌踩上再蹬起。' },
  { id: 73, name: '靠墙静蹲', primary: 'quads', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, timed: true, tips: '背贴墙、大腿平行地面，坚持到力竭前。' },
  { id: 74, name: '徒手深蹲', primary: 'quads', secondary: ['glutes', 'core'], equipment: 'bodyweight', difficulty: 1, compound: true, tips: '标准动作热身或家庭训练打底，控制节奏。' },

  // ---------- 腘绳肌 ----------
  { id: 75, name: '罗马尼亚硬拉(杠铃)', primary: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'barbell', difficulty: 2, compound: true, tips: '膝微屈、髋向后推，杠铃贴大腿下落到腘绳拉紧。' },
  { id: 76, name: '单腿哑铃罗马尼亚硬拉', primary: 'hamstrings', secondary: ['glutes', 'core'], equipment: 'dumbbell', difficulty: 2, compound: true, tips: '单腿站立髋后推，另一腿与躯干成一线，练平衡。' },
  { id: 77, name: '直腿硬拉', primary: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'barbell', difficulty: 2, compound: true, tips: '腿部近乎伸直，下放至腘绳极限，背部全程平直。' },
  { id: 78, name: '俯卧腿弯举', primary: 'hamstrings', secondary: ['calves'], equipment: 'machine', difficulty: 1, compound: false, tips: '髋贴紧垫面，只动膝关节，顶峰停顿。' },
  { id: 79, name: '坐姿腿弯举', primary: 'hamstrings', secondary: [], equipment: 'machine', difficulty: 1, compound: false, tips: '坐姿版本对腘绳长头刺激更好，慢放。' },
  { id: 80, name: '壶铃摆荡', primary: 'hamstrings', secondary: ['glutes', 'core', 'cardio'], equipment: 'kettlebell', difficulty: 2, compound: true, tips: '髋部爆发后推，壶铃荡至胸口高度，手臂只是绳子。' },
  { id: 81, name: '北欧腘绳肌弯降', primary: 'hamstrings', secondary: ['core'], equipment: 'bodyweight', difficulty: 3, compound: false, tips: '固定脚踝，身体前倒越慢越好，超高强度离心。' },

  // ---------- 臀 ----------
  { id: 82, name: '杠铃臀推', primary: 'glutes', secondary: ['hamstrings'], equipment: 'barbell', difficulty: 2, compound: true, subregion: '臀大肌', tips: '肩靠凳，杠铃压髋，顶部夹臀停1秒、肋骨下压。' },
  { id: 83, name: '自重臀桥', primary: 'glutes', secondary: ['hamstrings', 'core'], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '臀大肌', tips: '脚跟踩实，顶起时夹紧臀部，别用腰代偿。' },
  { id: 84, name: '单腿臀桥', primary: 'glutes', secondary: ['hamstrings'], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '臀大肌', tips: '一侧腿伸直，单侧顶髋，骨盆保持水平。' },
  { id: 85, name: '绳索后摆腿', primary: 'glutes', secondary: [], equipment: 'cable', difficulty: 1, compound: false, subregion: '臀大肌', tips: '踝套把手，髋伸展向后摆腿，躯干稳定。' },
  { id: 86, name: '站姿绳索外展', primary: 'glutes', secondary: [], equipment: 'cable', difficulty: 1, compound: false, subregion: '臀中肌', tips: '腿向外展开，身体不倾斜，感受臀外侧发力。' },
  { id: 87, name: '哑铃侧向箭步蹲', primary: 'glutes', secondary: ['quads'], equipment: 'dumbbell', difficulty: 2, compound: true, subregion: '臀中肌', tips: '向侧方跨步下蹲，另一腿伸直，臀部向后坐。' },
  { id: 88, name: '侧卧抬腿', primary: 'glutes', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '臀中肌', tips: '侧卧身体成线，上腿缓慢抬起放下，不前倒。' },
  { id: 89, name: '蚌式开合', primary: 'glutes', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '臀中肌', tips: '屈膝侧卧，双脚并拢，上膝打开如贝壳。' },

  // ---------- 小腿 ----------
  { id: 90, name: '站姿器械提踵', primary: 'calves', secondary: [], equipment: 'machine', difficulty: 1, compound: false, tips: '前脚掌踩台，全程幅度拉满，底部拉伸顶部停顿。' },
  { id: 91, name: '坐姿提踵', primary: 'calves', secondary: [], equipment: 'machine', difficulty: 1, compound: false, tips: '屈膝位重点练比目鱼肌，慢起慢落。' },
  { id: 92, name: '哑铃单腿提踵', primary: 'calves', secondary: [], equipment: 'dumbbell', difficulty: 1, compound: false, tips: '单手持哑铃保持平衡，另一手扶墙。' },
  { id: 93, name: '台阶单腿提踵', primary: 'calves', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, tips: '前脚掌站台阶边缘，脚跟下沉再充分抬起。' },

  // ---------- 核心 ----------
  { id: 94, name: '平板支撑', primary: 'core', secondary: ['shoulders'], equipment: 'bodyweight', difficulty: 1, compound: false, timed: true, tips: '肘撑地面，身体成直线，夹臀收腹别塌腰。' },
  { id: 95, name: '侧平板支撑', primary: 'core', secondary: ['glutes'], equipment: 'bodyweight', difficulty: 1, compound: false, timed: true, subregion: '腹斜', tips: '侧撑肘在肩正下方，髋部抬起不下坠。' },
  { id: 96, name: '卷腹', primary: 'core', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '上腹', tips: '下背贴地，只用腹肌把肩胛抬离地面，别拽头。' },
  { id: 97, name: '反向卷腹', primary: 'core', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '下腹', tips: '屈膝，用下腹把骨盆卷向胸口，腿部别甩。' },
  { id: 98, name: '悬垂举腿', primary: 'core', secondary: [], equipment: 'bodyweight', difficulty: 2, compound: false, subregion: '下腹', tips: '悬挂稳定躯干，屈膝或直腿上举至骨盆后倾。' },
  { id: 99, name: '绳索卷腹', primary: 'core', secondary: [], equipment: 'cable', difficulty: 1, compound: false, subregion: '上腹', tips: '跪姿握绳索于头后，用腹肌卷曲脊柱。' },
  { id: 100, name: '俄罗斯转体', primary: 'core', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '腹斜', tips: '上身后仰，双手或负重左右触地，转体幅度到位。' },
  { id: 101, name: '仰卧交替抬腿', primary: 'core', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, subregion: '下腹', tips: '下背压地，双腿交替缓慢升降。' },
  { id: 102, name: '健腹轮推展', primary: 'core', secondary: ['shoulders', 'back'], equipment: 'bodyweight', difficulty: 2, compound: false, tips: '跪姿向前推展，骨盆后倾收紧核心，量力而行。' },
  { id: 103, name: '死虫式', primary: 'core', secondary: [], equipment: 'bodyweight', difficulty: 1, compound: false, tips: '仰卧对侧手脚同时伸展，腰部全程贴地。' },
  { id: 104, name: '鸟狗式', primary: 'core', secondary: ['glutes', 'back'], equipment: 'bodyweight', difficulty: 1, compound: false, tips: '四点支撑，对侧手脚同时伸展，骨盆稳定。' },

  // ---------- 有氧 ----------
  { id: 105, name: '跑步机坡走', primary: 'cardio', secondary: ['glutes'], equipment: 'machine', difficulty: 1, compound: false, timed: true, tips: '坡度8-12%、速度5-6km/h，对膝盖友好的燃脂方式。' },
  { id: 106, name: '椭圆机', primary: 'cardio', secondary: [], equipment: 'machine', difficulty: 1, compound: false, timed: true, tips: '全脚掌踩踏，匀速保持心率在目标区间。' },
  { id: 107, name: '动感单车', primary: 'cardio', secondary: ['quads'], equipment: 'machine', difficulty: 1, compound: false, timed: true, tips: '座椅高度：脚踏最低点膝微屈，阻力中等稳定输出。' },
  { id: 108, name: '划船机', primary: 'cardio', secondary: ['back', 'hamstrings'], equipment: 'machine', difficulty: 1, compound: false, timed: true, tips: '蹬腿—后倾—拉桨顺序发力，回桨慢。' },
  { id: 109, name: '户外慢跑', primary: 'cardio', secondary: ['calves'], equipment: 'other', difficulty: 1, compound: false, timed: true, tips: '能边跑边说话的配速即为燃脂区间。' },
  { id: 110, name: '跳绳', primary: 'cardio', secondary: ['calves'], equipment: 'other', difficulty: 1, compound: false, timed: true, tips: '前脚掌落地，手腕摇绳，分组进行。' },
  { id: 111, name: '开合跳', primary: 'cardio', secondary: ['shoulders'], equipment: 'bodyweight', difficulty: 1, compound: false, timed: true, tips: '热身或HIIT组件，落地轻、节奏稳。' },
  { id: 112, name: '波比跳', primary: 'cardio', secondary: ['chest', 'quads', 'core'], equipment: 'bodyweight', difficulty: 2, compound: false, timed: true, tips: '下蹲—俯撑—起跳一气呵成，高强度控制组数。' },
  { id: 113, name: '登山跑', primary: 'cardio', secondary: ['core'], equipment: 'bodyweight', difficulty: 1, compound: false, timed: true, tips: '俯撑姿势交替提膝，核心收紧别塌腰。' },
  { id: 114, name: '高抬腿', primary: 'cardio', secondary: ['quads', 'calves'], equipment: 'bodyweight', difficulty: 1, compound: false, timed: true, tips: '膝盖抬至髋高，前脚掌着地快速交替。' },
];

export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
