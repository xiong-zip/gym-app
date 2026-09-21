import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { DotsBg, Stamp } from './ui';
import { C, FONT, R, SH } from '../theme';
import type { DoodlePath, JournalEntry } from '../types';

export const KIND_ZH: Record<JournalEntry['kind'], string> = { workout: '训练', meal: '饮食', free: '日常' };

/**
 * 手帐画布：点阵纸 + 照片贴纸 + 涂鸦 +（可选）笔记/数据/印章。
 * 贴纸与涂鸦都用归一化坐标，随容器宽度等比缩放，可作大图或缩略图使用。
 */
export function JournalMini({
  entry, width, showOverlay = true, radius = R.sm,
}: {
  entry: JournalEntry;
  width?: number;
  showOverlay?: boolean;
  radius?: number;
}) {
  return (
    <View style={[s.canvas, { borderRadius: radius }, width ? { width } : null]}>
      <DotsBg width="100%" height="100%" />
      {entry.doodles.length > 0 ? (
        <View style={StyleSheet.absoluteFill}>
          <SvgMini paths={entry.doodles} />
        </View>
      ) : null}
      {entry.stickers.map((st) => (
        // 与编辑端同构：原始宽 30% + transform 缩放（中心锚点），
        // 两端画布宽度不同也能严格对齐
        <View
          key={st.id}
          style={{
            position: 'absolute', left: `${st.x * 100}%`, top: `${st.y * 100}%`, width: '30%',
            transform: [{ rotate: `${st.rot}deg` }, { scale: clampScale(st.scale) }],
          }}
        >
          {st.cutout ? (
            <Image
              source={{ uri: st.uri }}
              style={{ width: '100%', aspectRatio: st.iw && st.ih ? st.iw / st.ih : 1 }}
              resizeMode="contain"
            />
          ) : (
            <View style={s.sticker}>
              <Image
                source={{ uri: st.uri }}
                style={{ width: '100%', aspectRatio: 5 / 6, borderRadius: 4 }}
                resizeMode="cover"
              />
              <View style={s.tape} />
            </View>
          )}
        </View>
      ))}
      {showOverlay ? (
        <>
          {entry.note ? (
            <View style={s.noteWrap} pointerEvents="none">
              <Text style={s.noteT} numberOfLines={2}>{entry.note}</Text>
            </View>
          ) : null}
          {entry.statsText ? (
            <View style={s.statsWrap} pointerEvents="none">
              <Text style={s.statsT} numberOfLines={2}>{entry.statsText}</Text>
            </View>
          ) : null}
          <View style={s.kindTagWrap} pointerEvents="none">
            <Stamp label={KIND_ZH[entry.kind]} fontSize={9} rotate={-7} />
          </View>
        </>
      ) : null}
    </View>
  );
}

const clampScale = (v: number) => Math.max(0.5, Math.min(2, v));

/* 涂鸦 SVG：0-100 × 0-133 视窗，与 3:4 画布等比 */
function SvgMini({ paths }: { paths: DoodlePath[] }) {
  return (
    <Svg viewBox="0 0 100 133" preserveAspectRatio="none" width="100%" height="100%">
      {paths.map((p) => (
        <Polyline
          key={p.id}
          points={p.points.map((pt) => `${pt[0] * 100},${pt[1] * 133}`).join(' ')}
          stroke={p.color}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
      ))}
    </Svg>
  );
}

const s = StyleSheet.create({
  canvas: {
    aspectRatio: '3/4', backgroundColor: C.card, borderWidth: 1, borderColor: C.inkAlphaSoft,
    overflow: 'hidden',
  },
  sticker: {
    // 贴纸式白描边（不是相框）：粗白边 + 硬偏移阴影 + 小胶带
    backgroundColor: '#FFFDF6', borderWidth: 3, borderColor: '#FFFDF6',
    borderRadius: 8, ...SH.md,
  },
  tape: {
    position: 'absolute', top: -7, alignSelf: 'center', width: 32, height: 13,
    backgroundColor: '#F2C94C', opacity: 0.85, borderRadius: 2, transform: [{ rotate: '-4deg' }],
  },
  noteWrap: { position: 'absolute', bottom: 8, left: 10, right: 10 },
  noteT: { color: C.text, fontSize: 13, fontWeight: '600', fontFamily: FONT.semi },
  statsWrap: { position: 'absolute', bottom: 34, left: 10, right: 10, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed', paddingTop: 4 },
  statsT: { color: C.sub, fontSize: 10, fontFamily: FONT.semi },
  kindTagWrap: { position: 'absolute', top: 8, right: 10 },
});
