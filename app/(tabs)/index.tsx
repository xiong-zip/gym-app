import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, Press, Ring, Stamp, Stat, Sub, stagger } from '../../src/components/ui';
import { MUSCLE_ZH } from '../../src/data/exercises';
import { addDays, fmtCN, fmtDur, todayKey, weekdayOf } from '../../src/lib/date';
import { calcNutrition, GOAL_ZH } from '../../src/lib/nutrition';
import {
  generateSessionPlan, nextSessionAfter, sessionForWeekday, weekSchedule,
} from '../../src/lib/planner';
import { useDietStore } from '../../src/store/diet';
import { latestWeight, useMetricsStore } from '../../src/store/metrics';
import { useProfileStore } from '../../src/store/profile';
import { useScheduleStore } from '../../src/store/schedule';
import { useWorkoutsStore } from '../../src/store/workouts';
import { C, FONT, R } from '../../src/theme';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEK_NUMS = [1, 2, 3, 4, 5, 6, 0];

export default function TodayScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const logs = useWorkoutsStore((s) => s.logs);
  const dietLogs = useDietStore((s) => s.logs);
  const metrics = useMetricsStore((s) => s.entries);
  const assignments = useScheduleStore((s) => s.assignments);
  const assign = useScheduleStore((s) => s.assign);

  if (!profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const today = todayKey();
  const wd = weekdayOf(today);
  const sched = weekSchedule(profile.daysPerWeek);
  const todayAssign = assignments.find((a) => a.date === today);
  const nextAssign = assignments
    .filter((a) => a.date > today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const doneToday = logs.some((l) => l.date === today);
  const todayLog = doneToday ? logs[logs.length - 1] : null;

  const makeTodayPlan = () => {
    const type = sessionForWeekday(profile.daysPerWeek, wd) ?? nextSessionAfter(profile.daysPerWeek, wd);
    const plan = generateSessionPlan(type, profile, `${today}|${type}|${Date.now()}`);
    assign(today, plan);
  };

  const makeWeekPlan = () => {
    // 从今天起 7 天内的训练日各生成一份计划（自动跳过休息日）
    for (let i = 0; i < 7; i++) {
      const key = addDays(today, i);
      const type = sessionForWeekday(profile.daysPerWeek, weekdayOf(key));
      if (!type) continue;
      const plan = generateSessionPlan(type, profile, `${key}|${type}|week|${Date.now()}`);
      assign(key, plan);
    }
  };

  const startWorkout = () => {
    if (!todayAssign) return;
    router.push({ pathname: '/session', params: { plan: encodeURIComponent(JSON.stringify(todayAssign.plan)) } });
  };

  const hour = new Date().getHours();
  const greet = hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  const d = new Date();
  const dateText = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const dateText2 = `周${WEEK_LABELS[(wd + 6) % 7]}`;

  const monday = addDays(today, -((wd + 6) % 7));
  const weekDates = WEEK_NUMS.map((_, i) => addDays(monday, i));
  const weekDone = weekDates.filter((k) => logs.some((l) => l.date === k)).length;
  const weekPlanned = sched.days.length;

  let streak = 0;
  for (let k = 0; k < 400; k++) {
    const key = addDays(today, -k);
    if (sched.days.includes(weekdayOf(key))) {
      if (logs.some((l) => l.date === key)) streak++;
      else if (k > 0) break;
    }
  }

  const nut = calcNutrition(profile);
  const consumed = dietLogs.filter((l) => l.date === today).reduce((a, b) => a + b.kcal, 0);
  const weight = latestWeight(metrics);

  const renderPlanExercises = () => {
    const exs = todayAssign!.plan.exercises;
    return (
      <View style={s.planList}>
        {exs.slice(0, 4).map((ex, i) => (
          <View key={`${ex.exerciseId}-${i}`} style={s.planExRow}>
            <Text style={s.planExIdx}>{i + 1}</Text>
            <Text style={s.planEx} numberOfLines={1}>
              {ex.name}
            </Text>
            <Text style={s.planExSets}>{`${ex.sets}×${ex.reps}`}</Text>
          </View>
        ))}
        {exs.length > 4 ? <Sub>{`…共 ${exs.length} 个动作`}</Sub> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.head}>
          <View>
            <Text style={s.greet}>{greet}</Text>
            <View style={s.dateRow}>
              <Text style={s.dateHand}>{dateText}</Text>
              <Text style={s.dateSub}> {dateText2}</Text>
            </View>
          </View>
          <Stamp label={GOAL_ZH[profile.goal]} fontSize={11} rotate={4} />
        </View>

        <Animated.View entering={stagger(0)}>
          <Card style={s.main} taped>
            {doneToday && todayLog ? (
              <>
                <View style={s.doneRow}>
                  <View style={s.doneStampWrap}>
                    <Stamp label="已完成" fontSize={12} rotate={-7} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>{todayLog.title}</Text>
                    <Sub>
                      {`${todayLog.exercises.reduce((a, e) => a + e.sets.length, 0)} 组 · 用时 ${fmtDur(todayLog.durationSec)}`}
                    </Sub>
                  </View>
                </View>
                <View style={s.dashDivider} />
                <Sub>
                  {nextAssign
                    ? `下次训练：${fmtCN(nextAssign.date)} · ${nextAssign.plan.title}`
                    : '近期没有已制定的计划，记得安排下一次训练。'}
                </Sub>
              </>
            ) : todayAssign ? (
              <>
                <Sub>今日训练 · 已制定</Sub>
                <Text style={s.title}>{todayAssign.plan.title}</Text>
                <View style={s.chipRow}>
                  {todayAssign.plan.focus.map((m) => (
                    <View key={m} style={s.mChip}>
                      <Text style={s.mChipT}>{MUSCLE_ZH[m]}</Text>
                    </View>
                  ))}
                  <View style={s.mChip}>
                    <Text style={s.mChipT}>{`${todayAssign.plan.durationMin}分钟`}</Text>
                  </View>
                </View>
                {renderPlanExercises()}
                <View style={s.btnRow}>
                  <Button title="开始训练" onPress={startWorkout} />
                  <Button title="换一套" kind="ghost" onPress={makeTodayPlan} />
                </View>
              </>
            ) : nextAssign ? (
              <>
                <Sub>今天没有训练安排</Sub>
                <Text style={s.title}>休息日</Text>
                <Sub style={{ marginTop: 4 }}>
                  {`下次训练：${fmtCN(nextAssign.date)} · ${nextAssign.plan.title}。主动恢复也不错：散步、拉伸、泡沫轴放松。`}
                </Sub>
                <View style={s.btnRow}>
                  <Button title="今天加练一次" kind="ghost" onPress={makeTodayPlan} />
                </View>
              </>
            ) : (
              <>
                <Text style={s.title}>还没有制定计划</Text>
                <Sub style={{ marginTop: 4 }}>
                  {`先制定一份训练计划，之后每天打开就会直接显示当天要练的内容。按你的安排（每周${profile.daysPerWeek}天）自动排部位、自动跳过休息日。`}
                </Sub>
                <View style={s.btnRow}>
                  <Button title="制定今日计划" onPress={makeTodayPlan} />
                  <Button title="制定本周计划" kind="ghost" onPress={makeWeekPlan} />
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(1)}>
          <Card style={s.week}>
            <View style={s.weekHead}>
              <Text style={s.weekT}>本周安排</Text>
              <Sub>{`已完成 ${weekDone}/${weekPlanned}`}</Sub>
            </View>
            <View style={s.weekRow}>
              {WEEK_NUMS.map((w, i) => {
                const key = weekDates[i];
                const isToday = key === today;
                const isDone = logs.some((l) => l.date === key);
                const hasPlan = assignments.some((a) => a.date === key);
                return (
                  <View key={w} style={s.dayCol}>
                    <Text style={[s.dayLabel, isToday && { color: C.accent, fontWeight: '800' }]}>{WEEK_LABELS[i]}</Text>
                    <View
                      style={[
                        s.dayDot,
                        isDone && { backgroundColor: C.accent, borderColor: C.accent },
                        !isDone && hasPlan && { borderColor: C.accent, borderWidth: 2 },
                        isToday && !isDone && { borderWidth: 2, borderColor: C.text },
                      ]}
                    >
                      {isDone ? <Text style={s.dayDotCheck}>✓</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(2)}>
          <Card>
            <View style={s.statRow}>
              <Stat label="连续达标" value={streak} unit="次" color={C.accent} count />
              <View style={s.statDivider} />
              <Stat label="累计训练" value={logs.length} unit="次" count />
              <View style={s.statDivider} />
              <Stat label="最新体重" value={weight ? weight.toFixed(1) : '--'} unit="kg" />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(3)}>
          <Press onPress={() => router.navigate('/diet')} style={s.dietPress}>
            <Card style={s.dietCard}>
              <Ring size={64} stroke={7} progress={nut.kcal > 0 ? consumed / nut.kcal : 0} color={consumed > nut.kcal ? C.danger : C.good}>
                <Text style={s.ringT}>{Math.max(0, nut.kcal - consumed)}</Text>
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={s.dietT}>今日饮食</Text>
                <Sub>
                  {`已摄入 ${Math.round(consumed)} / 目标 ${nut.kcal} kcal${consumed > nut.kcal ? ' · 已超标' : ''}`}
                </Sub>
              </View>
              <Text style={s.arrow}>›</Text>
            </Card>
          </Press>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingTop: 14, paddingBottom: 6 },
  greet: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 2, letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', alignItems: 'baseline' },
  dateHand: { color: C.accent, fontSize: 17, fontFamily: FONT.hand, lineHeight: 20 },
  dateSub: { color: C.sub, fontSize: 12, fontWeight: '600' },
  main: { padding: 20, marginTop: 6 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  doneStampWrap: { marginLeft: -2 },
  title: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 6, letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  mChip: { backgroundColor: C.inset, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1.5, borderColor: C.inkAlphaSoft },
  mChipT: { color: C.text, fontSize: 12, fontWeight: '700' },
  planList: { marginTop: 12, gap: 0, backgroundColor: C.inset, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.inkAlphaSoft, padding: 10 },
  planExRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  planExIdx: { color: C.accent, fontSize: 13, fontWeight: '900', fontFamily: FONT.extra, width: 14, textAlign: 'center' },
  planEx: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  planExSets: { color: C.sub, fontSize: 12, fontWeight: '700', fontFamily: FONT.semi },
  dashDivider: { borderStyle: 'dashed', borderWidth: 1, borderColor: C.line, marginVertical: 14, borderRadius: 0.5 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  week: { paddingVertical: 14 },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  weekT: { color: C.text, fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayLabel: { color: C.sub, fontSize: 11, fontWeight: '600' },
  dayDot: {
    width: 22, height: 22, borderRadius: 99, borderWidth: 1.5, borderColor: C.lineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  dayDotCheck: { color: C.onAccent, fontSize: 12, fontWeight: '900' },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: C.line, marginHorizontal: 6 },
  dietPress: { borderRadius: R.lg },
  dietCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringT: { color: C.text, fontSize: 11, fontWeight: '800', fontFamily: FONT.extra },
  dietT: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  arrow: { color: C.sub, fontSize: 24 },
});
