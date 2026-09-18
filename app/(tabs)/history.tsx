import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, NumberInput, SectionTitle, Sheet, Stat, Sub } from '../../src/components/ui';
import { fmtCN, fmtDur, todayKey } from '../../src/lib/date';
import { useDietStore } from '../../src/store/diet';
import { useMetricsStore } from '../../src/store/metrics';
import { useWorkoutsStore } from '../../src/store/workouts';
import { C } from '../../src/theme';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymKey = (y: number, m: number) => `${y}-${pad(m + 1)}`;

export default function HistoryScreen() {
  const logs = useWorkoutsStore((s) => s.logs);
  const dietLogs = useDietStore((s) => s.logs);
  const metrics = useMetricsStore((s) => s.entries);
  const addMetric = useMetricsStore((s) => s.add);
  const removeLog = useWorkoutsStore((s) => s.deleteLog);

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(todayKey());
  const [wSheet, setWSheet] = useState(false);
  const [wInput, setWInput] = useState('');

  const today = todayKey();
  const ym = ymKey(cursor.y, cursor.m);
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // 周一=0
  const isCurrentMonth = ym === today.slice(0, 7);
  const canNext = !isCurrentMonth;

  const logOf = (key: string) => logs.filter((l) => l.date === key);
  const kcalOf = (key: string) => Math.round(dietLogs.filter((l) => l.date === key).reduce((a, b) => a + b.kcal, 0));
  const weightOf = (key: string) => metrics.find((m) => m.date === key);

  const monthLogs = logs.filter((l) => l.date.startsWith(ym));
  const monthSets = monthLogs.reduce((a, l) => a + l.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const monthVolume = monthLogs.reduce(
    (a, l) => a + l.exercises.reduce((b, e) => b + e.sets.reduce((c, s) => c + s.weight * s.reps, 0), 0),
    0,
  );

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const selLogs = logOf(sel);
  const selKcal = kcalOf(sel);
  const selWeight = weightOf(sel);

  const saveWeight = () => {
    const w = Number(wInput);
    if (!w || w < 30 || w > 250) return;
    addMetric({ id: `m-${Date.now()}`, date: sel, weightKg: +w.toFixed(1) });
    setWSheet(false);
    setWInput('');
  };

  const delLog = (id: string) => {
    Alert.alert('删除这条训练记录？', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeLog(id) },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>训练日历</Text>
        <Sub>绿色标记为当天完成训练，点击日期查看详情</Sub>

        <Card style={{ marginTop: 14 }}>
          <View style={s.monthNav}>
            <Pressable style={s.monthBtn} onPress={() => shiftMonth(-1)}>
              <Text style={s.monthBtnT}>‹</Text>
            </Pressable>
            <Text style={s.monthT}>{`${cursor.y}年${cursor.m + 1}月`}</Text>
            <Pressable style={[s.monthBtn, !canNext && { opacity: 0.3 }]} disabled={!canNext} onPress={() => shiftMonth(1)}>
              <Text style={s.monthBtnT}>›</Text>
            </Pressable>
          </View>

          <View style={s.weekRow}>
            {WEEK.map((w) => (
              <Text key={w} style={s.weekT}>{w}</Text>
            ))}
          </View>
          <View style={s.grid}>
            {Array.from({ length: lead }, (_, i) => (
              <View key={`b${i}`} style={s.cell} />
            ))}
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
              const key = `${ym}-${pad(d)}`;
              const isToday = key === today;
              const isFuture = key > today;
              const hasLog = logs.some((l) => l.date === key);
              const isSel = key === sel;
              return (
                <Pressable
                  key={key}
                  style={[s.cell]}
                  disabled={isFuture}
                  onPress={() => setSel(key)}
                >
                  <View
                    style={[
                      s.dayCell,
                      hasLog && s.dayCellDone,
                      isSel && { borderColor: C.text, borderWidth: 2 },
                      isFuture && { opacity: 0.3 },
                    ]}
                  >
                    <Text style={[s.dayT, hasLog && { color: C.onAccent, fontWeight: '800' }]}>{d}</Text>
                  </View>
                  {isToday ? <View style={s.todayDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <View style={s.statRow}>
            <Stat label="本月训练" value={monthLogs.length} unit="次" />
            <Stat label="本月总组数" value={monthSets} unit="组" />
            <Stat label="本月总容量" value={Math.round(monthVolume)} unit="kg" />
          </View>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <SectionTitle>{`${fmtCN(sel)} 的记录`}</SectionTitle>

          {selLogs.length === 0 ? (
            <Sub>{sel === today ? '今天还没有训练，去首页开始吧' : '当天没有训练记录'}</Sub>
          ) : (
            selLogs.map((l) => (
              <View key={l.id} style={s.logBox}>
                <View style={s.logHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.logT}>{l.title}</Text>
                    <Sub>
                      {`${l.exercises.reduce((a, e) => a + e.sets.length, 0)} 组 · 总容量 ${Math.round(
                        l.exercises.reduce((a, e) => a + e.sets.reduce((b, s2) => b + s2.weight * s2.reps, 0), 0),
                      )} kg · 用时 ${fmtDur(l.durationSec)}`}
                    </Sub>
                  </View>
                  <Pressable hitSlop={8} onPress={() => delLog(l.id)}>
                    <Text style={s.delT}>🗑</Text>
                  </Pressable>
                </View>
                {l.exercises.map((e, i) => (
                  <View key={`${e.exerciseId}-${i}`} style={s.exRow}>
                    <Text style={s.exName}>{e.name}</Text>
                    <Text style={s.exSets}>{e.sets.map((s2) => (s2.weight ? `${s2.weight}kg×${s2.reps}` : `${s2.reps}次`)).join(' · ')}</Text>
                  </View>
                ))}
              </View>
            ))
          )}

          <View style={s.dayInfo}>
            <View style={s.infoItem}>
              <Sub>饮食摄入</Sub>
              <Text style={s.infoV}>{selKcal > 0 ? `${selKcal} kcal` : '未记录'}</Text>
            </View>
            <View style={s.infoItem}>
              <Sub>体重</Sub>
              <Text style={s.infoV}>{selWeight ? `${selWeight.weightKg} kg` : '未记录'}</Text>
            </View>
            <Pressable style={s.wBtn} onPress={() => setWSheet(true)}>
              <Text style={s.wBtnT}>{selWeight ? '改体重' : '记体重'}</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      <Sheet visible={wSheet} onClose={() => setWSheet(false)} title={`${fmtCN(sel)}的体重`}>
        <View style={{ gap: 12 }}>
          {selWeight ? <Sub>{`当前记录：${selWeight.weightKg}kg${selWeight.bodyFat ? ` · 体脂 ${selWeight.bodyFat}%` : ''}`}</Sub> : null}
          <NumberInput value={wInput} onChange={setWInput} suffix="kg" placeholder={`如 ${selWeight ? selWeight.weightKg : 70}`} />
          <Button title="保存" onPress={saveWeight} disabled={!Number(wInput)} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, paddingBottom: 40 },
  title: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  monthBtnT: { color: C.text, fontSize: 20, fontWeight: '700' },
  monthT: { color: C.text, fontSize: 17, fontWeight: '800' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekT: { flex: 1, color: C.sub, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', marginBottom: 8, position: 'relative' },
  dayCell: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center',
  },
  dayCellDone: { backgroundColor: C.accent, borderColor: C.accent },
  dayT: { color: C.sub, fontSize: 13, fontWeight: '600' },
  todayDot: { position: 'absolute', bottom: 1, width: 4, height: 4, borderRadius: 99, backgroundColor: C.accent },
  statRow: { flexDirection: 'row' },
  logBox: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginBottom: 12 },
  logHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logT: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  delT: { fontSize: 15 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border },
  exName: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  exSets: { color: C.sub, fontSize: 12, maxWidth: '55%', textAlign: 'right' },
  dayInfo: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  infoItem: { flex: 1 },
  infoV: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 3 },
  wBtn: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  wBtnT: { color: C.accent, fontSize: 12, fontWeight: '700' },
});
