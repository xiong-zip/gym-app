import { Image, StyleSheet, Text, View } from 'react-native';
import { Stamp, Sub, Tape } from './ui';
import { C, FONT, R, SH } from '../theme';

export interface PosterData {
  weekDone: number;
  weekPlanned: number;
  volumeKg: number;
  dietDays: number;
  weightDelta: number | null;
  streak: number;
  /** 手帐照片墙里本周的照片（最多取 3 张拼贴） */
  photos?: { uri: string; name?: string }[];
  /** 本周新纪录摘要（如「卧推 估算1RM 80kg ↑」） */
  prText?: string;
  /** 季节限定贴纸（秋天枫叶 / 夏天西瓜…） */
  seasonEmojis?: string[];
  seasonQuote?: string;
}

/** 分享海报（纯静态视图，便于 react-native-view-shot 截图） */
export function SharePoster({ data }: { data: PosterData }) {
  const d = new Date();
  const dateText = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const volTon = Math.round((data.volumeKg / 1000) * 10) / 10;
  const photos = (data.photos ?? []).slice(0, 3);

  return (
    <View style={s.poster}>
      <Tape width={86} />
      <View style={s.head}>
        <Text style={s.date}>{dateText}</Text>
        {data.seasonEmojis?.length ? (
          <Text style={s.seasonEmoji}>{data.seasonEmojis.slice(0, 3).join(' ')}</Text>
        ) : null}
        <Stamp label="本周战绩" fontSize={11} rotate={5} />
      </View>
      <Text style={s.title}>这一周，练得不错</Text>

      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statV}>{data.weekDone}<Text style={s.statU}>/{data.weekPlanned}次</Text></Text>
          <Text style={s.statL}>训练</Text>
        </View>
        <View style={s.divider} />
        <View style={s.stat}>
          <Text style={s.statV}>{volTon}<Text style={s.statU}>吨</Text></Text>
          <Text style={s.statL}>总容量</Text>
        </View>
        <View style={s.divider} />
        <View style={s.stat}>
          <Text style={s.statV}>{data.dietDays}<Text style={s.statU}>天</Text></Text>
          <Text style={s.statL}>饮食记录</Text>
        </View>
      </View>

      {photos.length > 0 ? (
        <View style={s.photoRow}>
          {photos.map((p, i) => {
            const rot = [-6, 4, -3][i % 3];
            return (
              <View key={i} style={[s.photoCard, { transform: [{ rotate: `${rot}deg` }] }]}>
                <Image source={{ uri: p.uri }} style={s.photoImg} resizeMode="cover" />
              </View>
            );
          })}
        </View>
      ) : null}

      {data.prText ? (
        <Text style={s.pr}>{`🏆 本周新纪录：${data.prText}`}</Text>
      ) : null}

      {data.weightDelta !== null ? (
        <Text style={s.delta}>
          {`体重 ${data.weightDelta > 0 ? '+' : ''}${data.weightDelta}kg`}
          {data.weightDelta < 0 ? '，趋势对了' : data.weightDelta > 0 ? '，肌肉在涨' : '，稳稳的'}
        </Text>
      ) : null}

      <View style={s.dash} />

      <Text style={s.quote}>
        {data.streak > 1 ? `连续达标 ${data.streak} 个训练日` : '每一页手帐都是证据'}
      </Text>
      {data.seasonQuote ? <Text style={s.seasonQuote}>{data.seasonQuote}</Text> : null}
      <Sub style={s.foot}>—— 健身搭子 · 训练手帐</Sub>
    </View>
  );
}

const s = StyleSheet.create({
  poster: {
    width: 312, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1.5,
    borderColor: C.inkAlphaSoft, padding: 22, alignItems: 'center', ...SH.md, overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 8, gap: 8 },
  date: { color: C.sub, fontSize: 20, fontFamily: FONT.hand, lineHeight: 24 },
  seasonEmoji: { color: C.text, fontSize: 15, flex: 1, textAlign: 'center' },
  title: { color: C.text, fontSize: 26, fontWeight: '900', fontFamily: FONT.extra, marginBottom: 18, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statV: { color: C.accent, fontSize: 24, fontWeight: '900', fontFamily: FONT.extra },
  statU: { color: C.sub, fontSize: 12, fontWeight: '600' },
  statL: { color: C.sub, fontSize: 11, marginTop: 3 },
  divider: { width: 1, height: 30, backgroundColor: C.line },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 10, marginTop: 2 },
  photoCard: {
    backgroundColor: '#FFFFFF', padding: 4, paddingBottom: 10, borderRadius: 3,
    borderWidth: 1, borderColor: C.inkAlphaSoft, ...SH.sm,
  },
  photoImg: { width: 82, height: 82 * 1.05, borderRadius: 2 },
  pr: { color: C.markerInk, fontSize: 13, fontWeight: '800', marginBottom: 4, fontFamily: FONT.semi },
  delta: { color: C.good, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  dash: { alignSelf: 'stretch', borderStyle: 'dashed', borderWidth: 1, borderColor: C.line, borderRadius: 0.5, marginVertical: 12 },
  quote: { color: C.text, fontSize: 15, fontWeight: '700', fontFamily: FONT.semi, marginBottom: 4 },
  seasonQuote: { color: C.sub, fontSize: 12, fontFamily: FONT.hand, lineHeight: 18, marginBottom: 2 },
  foot: { fontSize: 11 },
});
