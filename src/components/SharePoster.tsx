import { StyleSheet, Text, View } from 'react-native';
import { Stamp, Sub, Tape } from './ui';
import { C, FONT, R, SH } from '../theme';

export interface PosterData {
  weekDone: number;
  weekPlanned: number;
  volumeKg: number;
  dietDays: number;
  weightDelta: number | null;
  streak: number;
}

/** 分享海报（纯静态视图，便于 react-native-view-shot 截图） */
export function SharePoster({ data }: { data: PosterData }) {
  const d = new Date();
  const dateText = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const volTon = Math.round((data.volumeKg / 1000) * 10) / 10;

  return (
    <View style={s.poster}>
      <Tape width={86} />
      <View style={s.head}>
        <Text style={s.date}>{dateText}</Text>
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
      <Sub style={s.foot}>—— 健身搭子 · 训练手帐</Sub>
    </View>
  );
}

const s = StyleSheet.create({
  poster: {
    width: 312, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1.5,
    borderColor: C.inkAlphaSoft, padding: 22, alignItems: 'center', ...SH.md, overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 8 },
  date: { color: C.sub, fontSize: 20, fontFamily: FONT.hand, lineHeight: 24 },
  title: { color: C.text, fontSize: 26, fontWeight: '900', fontFamily: FONT.extra, marginBottom: 18, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statV: { color: C.accent, fontSize: 24, fontWeight: '900', fontFamily: FONT.extra },
  statU: { color: C.sub, fontSize: 12, fontWeight: '600' },
  statL: { color: C.sub, fontSize: 11, marginTop: 3 },
  divider: { width: 1, height: 30, backgroundColor: C.line },
  delta: { color: C.good, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  dash: { alignSelf: 'stretch', borderStyle: 'dashed', borderWidth: 1, borderColor: C.line, borderRadius: 0.5, marginVertical: 12 },
  quote: { color: C.text, fontSize: 15, fontWeight: '700', fontFamily: FONT.semi, marginBottom: 4 },
  foot: { fontSize: 11 },
});
