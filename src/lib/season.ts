/** 季节限定装饰：首页问候 / 分享手帐卡 / 照片角标共用 */
export interface SeasonInfo {
  key: 'spring' | 'summer' | 'autumn' | 'winter';
  label: string;
  emojis: string[]; // 季节贴纸池（照片角标 / 卡片装饰按 id 取模挑选）
  greet: string;    // 首页问候的一句季节话
  quote: string;    // 分享卡片底部的一句季节话
}

const SEASONS: Record<SeasonInfo['key'], Omit<SeasonInfo, 'key'>> = {
  spring: {
    label: '春',
    emojis: ['🌸', '🌷', '🌿', '🪁', '🐤'],
    greet: '春天练出来的，夏天看得见',
    quote: '春天种下的训练，夏天会开花',
  },
  summer: {
    label: '夏',
    emojis: ['🍉', '🏊', '☀️', '🧊', '🌴'],
    greet: '夏天流汗最痛快',
    quote: '这个夏天流的汗都没有白流',
  },
  autumn: {
    label: '秋',
    emojis: ['🍁', '🌰', '🧣', '🍂', '🏃'],
    greet: '秋高气爽，正是上重量的时候',
    quote: '贴秋膘之前，先把容量贴上',
  },
  winter: {
    label: '冬',
    emojis: ['❄️', '⛄', '🧤', '🔥', '🍲'],
    greet: '冬天练的都藏在开春',
    quote: '冬训肯吃苦，开春猛如虎',
  },
};

/** 按月份取季节（3-5 春 / 6-8 夏 / 9-11 秋 / 12-2 冬） */
export function seasonOf(d = new Date()): SeasonInfo {
  const m = d.getMonth() + 1;
  const key: SeasonInfo['key'] = m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  return { key, ...SEASONS[key] };
}

/** 给某个 id 挑一枚稳定的季节贴纸（同一 id 每次结果一致，避免重渲染闪跳） */
export function seasonStickerFor(id: string, info = seasonOf()): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return info.emojis[h % info.emojis.length];
}
