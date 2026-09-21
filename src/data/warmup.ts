import type { MuscleGroup } from '../types';

export interface WarmupItem {
  name: string;
  duration: string;
  tip: string;
}

/** 练前通用热身：5 分钟把关节与心率叫醒 */
export const GENERAL_WARMUP: WarmupItem[] = [
  { name: '原地慢跑 / 开合跳', duration: '2 分钟', tip: '心率微微上升、身体发热即可，不用喘' },
  { name: '手臂绕环', duration: '前后各 30 秒', tip: '由小圈画到大圈，活动肩关节' },
  { name: '髋部画圈', duration: '左右各 10 圈', tip: '手叉腰慢慢画，唤醒髋部灵活度' },
  { name: '徒手深蹲', duration: '10 次', tip: '蹲到大腿平行即可，找发力感不求量' },
  { name: '动态拉伸', duration: '1 分钟', tip: '弓步转体、抱膝走、蝎子摆腿任选两三个' },
];

export interface StretchGroup {
  muscle: MuscleGroup;
  label: string;
  items: WarmupItem[];
}

/** 练后按部位拉伸：静态保持，别弹震 */
export const STRETCH_GROUPS: StretchGroup[] = [
  {
    muscle: 'chest', label: '胸',
    items: [
      { name: '门框胸肌拉伸', duration: '30 秒 / 侧', tip: '小臂贴门框，手肘与肩同高，身体缓慢前压' },
      { name: '婴儿式', duration: '45 秒', tip: '臀部坐向脚跟，手臂前伸，放松胸椎与背部' },
    ],
  },
  {
    muscle: 'back', label: '背',
    items: [
      { name: '猫牛式', duration: '8 个来回', tip: '配合呼吸，脊柱一节一节地卷动' },
      { name: '坐姿转体', duration: '30 秒 / 侧', tip: '背挺直向一侧转，手扶膝盖加深' },
      { name: '单杠悬垂', duration: '20-30 秒', tip: '有单杠就挂着，放松肩背还能 decompress' },
    ],
  },
  {
    muscle: 'shoulders', label: '肩',
    items: [
      { name: '手臂交叉拉伸', duration: '30 秒 / 侧', tip: '一只手臂横过胸前，另一手扣住向内拉' },
      { name: '靠墙天使', duration: '10 次', tip: '背贴墙，手臂沿墙面上下滑动，肩胛下沉' },
    ],
  },
  {
    muscle: 'biceps', label: '肱二头',
    items: [
      { name: '手臂反拉伸', duration: '30 秒 / 侧', tip: '手臂内旋向后，掌心朝外，肩部保持下沉' },
    ],
  },
  {
    muscle: 'triceps', label: '肱三头',
    items: [
      { name: '脑后肘拉伸', duration: '30 秒 / 侧', tip: '手肘指向天花板，另一手把肘向后轻拉' },
    ],
  },
  {
    muscle: 'quads', label: '股四头',
    items: [
      { name: '站姿抬踝拉伸', duration: '30 秒 / 侧', tip: '单手扶墙，脚跟贴臀，膝盖指向地面' },
      { name: '弓步髋屈肌拉伸', duration: '30 秒 / 侧', tip: '前腿膝不过脚尖，臀部向前顶' },
    ],
  },
  {
    muscle: 'hamstrings', label: '腘绳肌',
    items: [
      { name: '坐姿体前屈', duration: '45 秒', tip: '背先挺直再前倾，感觉大腿后侧拉紧就停' },
    ],
  },
  {
    muscle: 'glutes', label: '臀',
    items: [
      { name: '坐姿 4 字拉伸', duration: '40 秒 / 侧', tip: '脚踝搭对侧膝盖，抱大腿向胸口拉' },
      { name: '鸽子式', duration: '40 秒 / 侧', tip: '柔韧性不够就在臀部垫条毛巾' },
    ],
  },
  {
    muscle: 'calves', label: '小腿',
    items: [
      { name: '弓步推墙', duration: '30 秒 / 侧', tip: '后腿伸直脚跟踩地，感受小腿后侧伸展' },
    ],
  },
  {
    muscle: 'core', label: '核心',
    items: [
      { name: '眼镜蛇式', duration: '30 秒', tip: '耻骨贴地，胸椎向上延展，腰不舒服就降低幅度' },
      { name: '侧躺伸展', duration: '30 秒 / 侧', tip: '手臂过头划大弧，拉开侧腹' },
    ],
  },
  {
    muscle: 'cardio', label: '有氧后',
    items: [
      { name: '慢走降温', duration: '3-5 分钟', tip: '让心率缓缓落回接近静息，别立刻坐下' },
      { name: '小腿 + 股四头拉伸', duration: '各 30 秒 / 侧', tip: '有氧主要用腿，下肢别跳过' },
    ],
  },
];
