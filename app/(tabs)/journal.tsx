import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JournalMini } from '../../src/components/JournalMini';
import { MonthCalendar } from '../../src/components/MonthCalendar';
import { Animated, Button, Card, NumberInput, Press, SectionTitle, Sheet, Stamp, Stat, Sub, stagger } from '../../src/components/ui';
import { MUSCLE_ZH } from '../../src/data/exercises';
import { fmtCN, fmtDur, todayKey, weekdayOf } from '../../src/lib/date';
import { useDietStore } from '../../src/store/diet';
import { useJournalStore } from '../../src/store/journal';
import { useMetricsStore } from '../../src/store/metrics';
import { useScheduleStore } from '../../src/store/schedule';
import { useWorkoutsStore } from '../../src/store/workouts';
import { C, FONT } from '../../src/theme';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function JournalScreen() {
  const router = useRouter();
  const entries = useJournalStore((s) => s.entries);
  const removeEntry = useJournalStore((s) => s.remove);
  const logs = useWorkoutsStore((s) => s.logs);
  const deleteLog = useWorkoutsStore((s) => s.deleteLog);
  const dietLogs = useDietStore((s) => s.logs);
  const metrics = useMetricsStore((s) => s.entries);
  const addMetric = useMetricsStore((s) => s.add);
  const assignments = useScheduleStore((s) => s.assignments);

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(todayKey());
  const [wSheet, setWSheet] = useState(false);
  const [wInput, setWInput] = useState('');

  const today = todayKey();
  const isToday = sel === today;

  const dayEntries = entries.filter((e) => e.date === sel);
  const dayLogs = logs.filter((l) => l.date === sel);
  const dayPlan = assignments.find((a) => a.date === sel)?.plan ?? null;
  const dayKcal = Math.round(dietLogs.filter((l) => l.date === sel).reduce((a, b) => a + b.kcal, 0));
  const dayWeight = metrics.find((m) => m.date === sel) ?? null;

  // 本月统计（跟随日历显示的月份）
  const ym = `${cursor.y}-${pad(cursor.m + 1)}`;
  const monthLogs = logs.filter((l) => l.date.startsWith(ym));
  const monthSets = monthLogs.reduce((a, l) => a + l.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const monthVolume = Math.round(monthLogs.reduce(
    (a, l) => a + l.exercises.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.weight * x.reps, 0), 0), 0,
  ));

  const delEntry = (id: string) => {
    Alert.alert('删除这页手帐？', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeEntry(id) },
    ]);
  };

  const delLog = (id: string) => {
    Alert.alert('删除这条训练记录？', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteLog(id) },
    ]);
  };

  const saveWeight = () => {
    const w = Number(wInput);
    if (!w || w < 30 || w > 250) return;
    addMetric({ id: `m-${Date.now()}`, date: sel, weightKg: +w.toFixed(1) });
    setWSheet(false);
    setWInput('');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.head}>
          <Text style={s.title}>手帐</Text>
          <Sub>{isToday ? '记下今天这一练，或翻日历回看以前' : '正在回看过去的记录（只能查看）'}</Sub>
        </View>

        <Animated.View entering={stagger(0)}>
          <Card>
            <MonthCalendar
              selected={sel}
              onSelect={setSel}
              month={cursor}
              onMonthChange={setCursor}
              hasLog={(k) => logs.some((l) => l.date === k)}
              hasJournal={(k) => entries.some((e) => e.date === k)}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(1)}>
          <Card>
            <View style={s.statRow}>
              <Stat label="本月训练" value={monthLogs.length} unit="次" color={C.accent} count />
              <View style={s.statDivider} />
              <Stat label="本月总组数" value={monthSets} unit="组" count />
              <View style={s.statDivider} />
              <Stat label="本月总容量" value={monthVolume} unit="kg" count />
            </View>
          </Card>
        </Animated.View>

        {/* 所选日期 */}
        <View style={s.dayHead}>
          <View style={s.dayHeadLeft}>
            <Text style={s.dayT}>{`${Number(sel.slice(5, 7))}月${Number(sel.slice(8, 10))}日 · 周${WEEK_LABELS[(weekdayOf(sel) + 6) % 7]}`}</Text>
            {isToday ? <Stamp label="今天" fontSize={9} rotate={-6} /> : null}
          </View>
          {!isToday ? <Sub>过去的页面只能查看</Sub> : null}
        </View>

        {/* 当天训练 */}
        <Animated.View entering={stagger(2)}>
          <Card style={s.block}>
            <Text style={s.blockT}>🏋️ 训练</Text>
            {dayLogs.length > 0 ? (
              dayLogs.map((l) => {
                const sets = l.exercises.reduce((a, e) => a + e.sets.length, 0);
                const volume = Math.round(l.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + x.weight * x.reps, 0), 0));
                return (
                  <View key={l.id} style={s.logBox}>
                    <View style={s.logHead}>
                      <Text style={s.logT}>{l.title}</Text>
                      <Stamp label="已完成" fontSize={8} rotate={-6} />
                      <View style={{ flex: 1 }} />
                      <Press hitSlop={8} onPress={() => delLog(l.id)}>
                        <Text style={s.delT}>✕</Text>
                      </Press>
                    </View>
                    <Sub>{`${sets} 组 · 总容量 ${volume} kg · 用时 ${fmtDur(l.durationSec)}`}</Sub>
                    {l.exercises.map((e, i) => (
                      <View key={`${e.exerciseId}-${i}`} style={s.exRow}>
                        <Text style={s.exName}>{e.name}</Text>
                        <Text style={s.exSets} numberOfLines={1}>
                          {e.sets.map((x) => (x.weight ? `${x.weight}kg×${x.reps}` : `${x.reps}次`)).join(' · ')}
                        </Text>
                      </View>
                    ))}
                    {isToday && dayEntries.length === 0 ? (
                      <View style={s.logAction}>
                        <Button
                          title="记成手帐"
                          kind="ghost"
                          small
                          onPress={() => router.push({
                            pathname: '/plog',
                            params: {
                              kind: 'workout',
                              title: l.title,
                              stats: `${l.title} · ${sets}组 · ${volume}kg · ${fmtDur(l.durationSec)}`,
                            },
                          })}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : dayPlan ? (
              <View style={s.planBox}>
                <View style={s.logHead}>
                  <Text style={s.planT}>{dayPlan.title}</Text>
                  <View style={{ flex: 1 }} />
                  <Sub>未完成</Sub>
                </View>
                <Sub>
                  {`${dayPlan.durationMin}分钟 · ${dayPlan.exercises.length}个动作${dayPlan.focus.length ? ` · ${dayPlan.focus.map((m) => MUSCLE_ZH[m]).join('/')}` : ''}`}
                </Sub>
                <View style={s.planExWrap}>
                  {dayPlan.exercises.slice(0, 5).map((ex, i) => (
                    <Text key={`${ex.exerciseId}-${i}`} style={s.planEx} numberOfLines={1}>
                      {`${i + 1}. ${ex.name}  ${ex.sets}×${ex.reps}`}
                    </Text>
                  ))}
                  {dayPlan.exercises.length > 5 ? <Sub>{`…共 ${dayPlan.exercises.length} 个动作`}</Sub> : null}
                </View>
                {isToday ? (
                  <View style={s.logAction}>
                    <Button
                      title="开始训练"
                      small
                      onPress={() => router.push({ pathname: '/session', params: { plan: encodeURIComponent(JSON.stringify(dayPlan)) } })}
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <Sub>{isToday ? '今天还没有训练，去首页开始吧' : '这天没有训练安排或记录'}</Sub>
            )}
          </Card>
        </Animated.View>

        {/* 当天手帐 */}
        <Animated.View entering={stagger(3)}>
          <Card style={s.block}>
            <View style={s.blockHead}>
              <Text style={s.blockT}>📖 手帐</Text>
              {dayEntries.length > 0 ? <Sub>{`${dayEntries.length} 页`}</Sub> : null}
            </View>

            {dayEntries.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyPolaroid}>
                  <Text style={s.emptyEmoji}>📷</Text>
                </View>
                {isToday ? (
                  <>
                    <Text style={s.mascotT}>🏋️ 铁铁：一起把这一页贴满吧！</Text>
                    <Sub style={{ textAlign: 'center' }}>练完拍张照、吃得好看拍一张，贴进手帐</Sub>
                  </>
                ) : (
                  <Sub style={{ textAlign: 'center' }}>这天没有手帐记录</Sub>
                )}
              </View>
            ) : (
              dayEntries.map((e) => (
                <View key={e.id} style={s.entry}>
                  <View style={s.entryHead}>
                    <Text style={s.entryTitle}>{e.title}</Text>
                    {isToday ? (
                      <View style={s.entryActions}>
                        <Press hitSlop={8} onPress={() => router.push({ pathname: '/plog', params: { id: e.id } })}>
                          <Text style={s.editT}>编辑</Text>
                        </Press>
                        <Press hitSlop={8} onPress={() => delEntry(e.id)}>
                          <Text style={s.delT}>✕</Text>
                        </Press>
                      </View>
                    ) : null}
                  </View>
                  <JournalMini entry={e} />
                  <Text style={s.foot}>{fmtCN(e.date)}</Text>
                </View>
              ))
            )}

            {isToday ? (
              <View style={{ marginTop: 12 }}>
                <Button title="＋ 记一页" onPress={() => router.push('/plog')} />
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {/* 当天饮食与体重 */}
        <Animated.View entering={stagger(4)}>
          <Card>
            <SectionTitle>当天数据</SectionTitle>
            <View style={s.dataRow}>
              <View style={s.dataItem}>
                <Sub>饮食摄入</Sub>
                <Text style={s.dataV}>{dayKcal > 0 ? `${dayKcal} kcal` : '未记录'}</Text>
              </View>
              <View style={s.dataItem}>
                <Sub>体重</Sub>
                <Text style={s.dataV}>{dayWeight ? `${dayWeight.weightKg} kg` : '未记录'}</Text>
              </View>
              <Press style={s.wBtn} onPress={() => { setWInput(dayWeight ? String(dayWeight.weightKg) : ''); setWSheet(true); }}>
                <Text style={s.wBtnT}>{dayWeight ? '改体重' : '记体重'}</Text>
              </Press>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      <Sheet visible={wSheet} onClose={() => setWSheet(false)} title={`${fmtCN(sel)}的体重`}>
        <View style={{ gap: 12 }}>
          {dayWeight ? <Sub>{`当前记录：${dayWeight.weightKg}kg`}</Sub> : null}
          <NumberInput value={wInput} onChange={setWInput} suffix="kg" placeholder={`如 ${dayWeight ? dayWeight.weightKg : 70}`} />
          <Button title="保存" onPress={saveWeight} disabled={!Number(wInput)} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  head: { paddingTop: 8, paddingBottom: 2 },
  title: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 2, letterSpacing: 0.5 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: C.line, marginHorizontal: 6 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  dayHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayT: { color: C.text, fontSize: 17, fontWeight: '800', fontFamily: FONT.extra },
  block: { gap: 4 },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockT: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  logBox: { gap: 2 },
  logHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  logT: { color: C.text, fontSize: 15, fontWeight: '800' },
  exRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  exName: { color: C.text, fontSize: 13, fontWeight: '600', flex: 1 },
  exSets: { color: C.sub, fontSize: 11, maxWidth: '58%', textAlign: 'right', fontFamily: FONT.semi },
  logAction: { alignItems: 'flex-start', marginTop: 10 },
  planBox: { gap: 3 },
  planT: { color: C.text, fontSize: 15, fontWeight: '800' },
  planExWrap: { marginTop: 8, gap: 4, backgroundColor: C.inset, borderRadius: 10, padding: 10 },
  planEx: { color: C.text, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyPolaroid: {
    width: 72, height: 84, backgroundColor: '#FFFFFF', borderRadius: 3, borderWidth: 1, borderColor: C.inkAlphaSoft,
    alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }],
  },
  emptyEmoji: { fontSize: 28 },
  mascotT: { color: C.accent, fontSize: 14, fontWeight: '700', fontFamily: FONT.semi },
  entry: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed',
  },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  entryTitle: { color: C.text, fontSize: 14, fontWeight: '700', flex: 1 },
  entryActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  editT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  delT: { color: C.faint, fontSize: 15, fontWeight: '700' },
  foot: { color: C.faint, fontSize: 11, marginTop: 6, fontWeight: '600' },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dataItem: { flex: 1 },
  dataV: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 3, fontFamily: FONT.extra },
  wBtn: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  wBtnT: { color: C.accent, fontSize: 12, fontWeight: '800' },
});
