/**
 * 「训练手帐」设计系统
 * 纸面（暖奶油）+ 墨色文字 + 印章红主色 + 荧光黄马克笔 + 彩色记号笔语义色。
 * 阴影一律硬偏移（无 blur），营造贴纸/纸片的物理感。
 */

export const C = {
  // 纸面
  bg: '#F5EFE2',        // 页面底：暖奶油纸
  bgDot: '#DFD2B8',     // 点阵网格（手帐内页）
  card: '#FFFDF6',      // 纸卡
  inset: '#F0E8D6',     // 内嵌底：输入框 / 未选中态
  line: '#E2D5BD',      // 细分隔线
  lineStrong: '#CDBD9E',

  // 墨色阶
  text: '#2B2416',      // 主文字（墨色）
  sub: '#6E6350',       // 次级
  faint: '#A2937B',     // 辅助

  // 手帐主色
  accent: '#D9481F',    // 印章红橘：主按钮 / 选中 / 强调
  accentDeep: '#B83614',
  onAccent: '#FFF6EC',
  marker: '#FFDE59',    // 荧光黄：高亮划线
  markerInk: '#6B5A10', // 荧光黄上的深字

  // 记号笔语义色
  good: '#3E8E4E',      // 绿笔：完成 / 蛋白质
  info: '#3B6FA0',      // 钢笔蓝：信息
  warn: '#C0872B',      // 橙笔：碳水
  pink: '#C4537A',      // 粉笔：脂肪
  danger: '#C03B2E',    // 红笔：超标 / 危险

  // 半透明墨（边框常用）
  inkAlpha: 'rgba(43,36,22,0.16)',
  inkAlphaSoft: 'rgba(43,36,22,0.10)',
  shadowInk: '#2B2416',
};

/** 字体（expo-google-fonts 注册名；中文回落系统字体） */
export const FONT = {
  body: 'Nunito_400Regular',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extra: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
  hand: 'Caveat_700Bold',
  handSoft: 'Caveat_600SemiBold',
};

/** 字号（模块化，比例约 1.25） */
export const FS = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

/** 间距（4/8 栅格） */
export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

/** 圆角三档（软萌版：整体加大一档） */
export const R = { sm: 12, md: 16, lg: 22 };

/** 手帐胶带色板（马卡龙色系） */
export const TAPE = {
  yellow: '#F2C94C',
  red: '#F4A98C',
  green: '#BFD8A8',
  blue: '#A9C7DE',
};

/** 硬偏移阴影（无 blur 的贴纸感） */
interface Shadow { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number }
export const SH: { sm: Shadow; md: Shadow; lg: Shadow } = {
  sm: { shadowColor: C.shadowInk, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2 },
  md: { shadowColor: C.shadowInk, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.12, shadowRadius: 0, elevation: 3 },
  lg: { shadowColor: C.shadowInk, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 5 },
};

/** 动效时长 / 缓动 */
export const DUR = { fast: 140, base: 220, slow: 360 };

// 兼容旧引用
export const PAD = 16;
export const border = C.line;
export const card2 = C.inset;
