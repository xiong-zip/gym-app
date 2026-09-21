import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, FadeInDown, NumberInput, Press, Ring, Scroll, Sheet, Stamp, Stat, Sub, stagger } from '../../src/components/ui';
import { SharePoster } from '../../src/components/SharePoster';
import { WeightChart } from '../../src/components/WeightChart';
import { MUSCLE_ZH } from '../../src/data/exercises';
import { addDays, dateKey, fmtCN, fmtDur, todayKey, weekdayOf } from '../../src/lib/date';
import { shareViewShot } from '../../src/lib/shot';
import { calcNutrition, GOAL_ZH } from '../../src/lib/nutrition';
import {
  generateSessionPlan, nextSessionAfter, sessionForWeekday, weekSchedule,
} from '../../src/lib/planner';
import { useDietStore } from '../../src/store/diet';
import { useJournalStore } from '../../src/store/journal';
import { latestWeight, useMetricsStore } from '../../src/store/metrics';
import { useProfileStore } from '../../src/store/profile';
import { useScheduleStore } from '../../src/store/schedule';
import { useSessionDraftStore } from '../../src/store/sessionDraft';
import { useWorkoutsStore } from '../../src/store/workouts';
import { C, FONT, R, TAPE } from '../../src/theme';
import type { WorkoutLog } from '../../src/types';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEK_NUMS = [1, 2, 3, 4, 5, 6, 0];
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365, 500];

export default function TodayScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const logs = useWorkoutsStore((s) => s.logs);
  const dietLogs = useDietStore((s) => s.logs);
  const metrics = useMetricsStore((s) => s.entries);
  const addMetric = useMetricsStore((s) => s.add);
  const assignments = useScheduleStore((s) => s.assignments);
  const assign = useScheduleStore((s) => s.assign);
  const draft = useSessionDraftStore((s) => s.draft);
  const clearDraft = useSessionDraftStore((s) => s.clear);
  const jEntries = useJournalStore((s) => s.entries);
  const [wOpen, setWOpen] = useState(false);
  const [wInput, setWInput] = useState('');
  const [dayPick, setDayPick] = useState(todayKey()); // 本周安排：tab 式选中的回顾日期
  const [posterOpen, setPosterOpen] = useState(false);
  const posterRef = useRef<View>(null);

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

  // 今天进行中的训练草稿：App 被杀 / 中途保留进度退出后，从这继续（至少完成过一组才算）
  const draftDoneSets = draft
    ? draft.sets.reduce((a, ex) => a + ex.filter((r) => r.done).length, 0)
    : 0;
  const draftLive = !!draft && !doneToday && draftDoneSets > 0 && dateKey(new Date(draft.startedAt)) === today;

  const dropDraft = () => {
    Alert.alert('放弃这次训练？', '已完成的组不会再保存。', [
      { text: '取消', style: 'cancel' },
      { text: '放弃', style: 'destructive', onPress: clearDraft },
    ]);
  };

  const makeTodayPlan = () => {
    const type = sessionForWeekday(profile.daysPerWeek, wd) ?? nextSessionAfter(profile.daysPerWeek, wd);
    const plan = generateSessionPlan(type, profile, `${today}|${type}|${Date.now()}`);
    assign(today, plan);
  };

  const makeWeekPlan = () => {
    const run = () => {
      // 从今天起 7 天内的训练日各生成一份计划（自动跳过休息日）
      for (let i = 0; i < 7; i++) {
        const key = addDays(today, i);
        const type = sessionForWeekday(profile.daysPerWeek, weekdayOf(key));
        if (!type) continue;
        const plan = generateSessionPlan(type, profile, `${key}|${type}|week|${Date.now()}`);
        assign(key, plan);
      }
    };
    const existing = assignments.filter((a) => a.date >= today && a.date <= addDays(today, 6)).length;
    if (existing > 0) {
      Alert.alert('重新制定本周计划？', `会覆盖已制定的 ${existing} 天计划。`, [
        { text: '取消', style: 'cancel' },
        { text: '继续', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const startWorkout = () => {
    if (!todayAssign) return;
    router.push({ pathname: '/session', params: { plan: encodeURIComponent(JSON.stringify(todayAssign.plan)) } });
  };

  const saveWeight = () => {
    const w = Number(wInput);
    if (!w || w < 30 || w > 250) return;
    addMetric({ id: `m-${Date.now()}`, date: today, weightKg: +w.toFixed(1) });
    setWOpen(false);
    setWInput('');
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

  // 本周回顾：与上个周期比较（训练容量 / 饮食记录天数 / 体重变化）
  const lastMonday = addDays(monday, -7);
  const volumeOf = (arr: WorkoutLog[]) => arr.reduce(
    (a, l) => a + l.exercises.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.weight * x.reps, 0), 0), 0,
  );
  const thisWeekLogs = logs.filter((l) => l.date >= monday && l.date <= today);
  const lastWeekLogs = logs.filter((l) => l.date >= lastMonday && l.date < monday);
  const thisVol = Math.round(volumeOf(thisWeekLogs));
  const lastVol = Math.round(volumeOf(lastWeekLogs));
  const dietDays = new Set(dietLogs.filter((l) => l.date >= monday && l.date <= today).map((l) => l.date)).size;
  const wPrev = [...metrics].reverse().find((m) => m.date < monday)?.weightKg ?? null;
  const wCur = metrics.length && metrics[metrics.length - 1].date >= monday ? metrics[metrics.length - 1].weightKg : null;
  const wDelta = wPrev != null && wCur != null ? +(wCur - wPrev).toFixed(1) : null;

  const buildWeekText = () => {
    const volTon = Math.round((thisVol / 1000) * 10) / 10;
    const lines = [
      '【健身搭子 · 本周战绩】',
      `🏋️ 训练 ${weekDone} 次 · 总容量 ${volTon} 吨`,
      `🍚 饮食记录 ${dietDays} 天`,
    ];
    if (wDelta !== null) lines.push(`⚖️ 体重 ${wDelta > 0 ? '+' : ''}${wDelta}kg`);
    if (streak > 1) lines.push(`🔥 连续达标 ${streak} 个训练日`);
    lines.push('—— 训练手帐，贴满每一天');
    return lines.join('\n');
  };

  const doSharePoster = async () => {
    await shareViewShot(posterRef, buildWeekText());
  };

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

  // 本周安排：某一天的回顾弹层数据
  const pickLogs = dayPick ? logs.filter((l) => l.date === dayPick) : [];
  const pickPlan = dayPick ? assignments.find((a) => a.date === dayPick)?.plan ?? null : null;
  const pickKcal = dayPick ? Math.round(dietLogs.filter((l) => l.date === dayPick).reduce((a, b) => a + b.kcal, 0)) : 0;
  const pickWeight = dayPick ? metrics.find((m) => m.date === dayPick)?.weightKg ?? null : null;
  const pickJournal = dayPick ? jEntries.filter((e) => e.date === dayPick).length : 0;
  const volOfLog = (l: WorkoutLog) => Math.round(
    l.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + x.weight * x.reps, 0), 0),
  );

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
      <Scroll contentContainerStyle={s.body}>
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

        {draftLive && draft ? (
          <Animated.View entering={stagger(0)}>
            <Card style={s.resume} taped={TAPE.green}>
              <Sub>有一次进行中的训练</Sub>
              <Text style={s.title}>{draft.plan.title}</Text>
              <Sub>{`已完成 ${draftDoneSets} 组 · 进行了 ${fmtDur(Math.round((Date.now() - draft.startedAt) / 1000))}`}</Sub>
              <View style={s.btnRow}>
                <Button title="继续训练" onPress={() => router.push('/session')} />
                <Button title="放弃" kind="ghost" onPress={dropDraft} />
              </View>
            </Card>
          </Animated.View>
        ) : null}

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
                  <Button
                    title="编辑"
                    kind="ghost"
                    small
                    onPress={() => router.push({ pathname: '/(tabs)/plans', params: { editDate: today } })}
                  />
                  <Button title="换一套" kind="ghost" small onPress={makeTodayPlan} />
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
                const isSel = key === dayPick;
                return (
                  <Press
                    key={w}
                    style={s.dayCol}
                    hitSlop={6}
                    onPress={() => setDayPick(key)}
                  >
                    <Text style={[s.dayLabel, (isToday || isSel) && { color: C.accent, fontWeight: '800' }]}>{WEEK_LABELS[i]}</Text>
                    <View
                      style={[
                        s.dayDot,
                        isDone && { backgroundColor: C.accent, borderColor: C.accent },
                        !isDone && hasPlan && { borderColor: C.accent, borderWidth: 2 },
                        isSel && { borderWidth: 2, borderColor: C.accent },
                      ]}
                    >
                      {isDone ? <Text style={s.dayDotCheck}>✓</Text> : null}
                    </View>
                    <View style={[s.dayBar, isSel && s.dayBarOn]} />
                  </Press>
                );
              })}
            </View>

            {/* 选中日的回顾：类 tab 内容切换 */}
            <Animated.View key={dayPick} entering={FadeInDown.duration(180)} style={s.dayReview}>
              <View style={s.dayRevHead}>
                <Text style={s.dayRevT}>
                  {`${Number(dayPick.slice(5, 7))}月${Number(dayPick.slice(8, 10))}日 · 周${WEEK_LABELS[(weekdayOf(dayPick) + 6) % 7]}`}
                </Text>
                {dayPick === today ? <Stamp label="今天" fontSize={9} rotate={-5} /> : null}
                <View style={{ flex: 1 }} />
                <Press hitSlop={6} onPress={() => router.push({ pathname: '/(tabs)/journal', params: { date: dayPick } })}>
                  <Text style={s.dayRevLink}>手帐详情 ›</Text>
                </Press>
              </View>

              {pickLogs.length > 0 ? (
                pickLogs.map((l) => (
                  <View key={l.id} style={s.pickBox}>
                    <View style={s.pickHead}>
                      <Text style={s.pickT} numberOfLines={1}>{l.title}</Text>
                      <Stamp label="已完成" fontSize={8} rotate={-6} />
                    </View>
                    <Sub>
                      {`${l.exercises.reduce((a, e) => a + e.sets.length, 0)} 组 · 总容量 ${volOfLog(l)} kg · 用时 ${fmtDur(l.durationSec)}`}
                    </Sub>
                    {l.exercises.map((e, i) => (
                      <View key={`${e.exerciseId}-${i}`} style={s.pickExRow}>
                        <Text style={s.pickExName} numberOfLines={1}>{e.name}</Text>
                        <Text style={s.pickExSets} numberOfLines={1}>
                          {e.sets.map((x) => (x.weight ? `${x.weight}kg×${x.reps}` : `${x.reps}次`)).join(' · ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : pickPlan ? (
                <View style={s.pickBox}>
                  <View style={s.pickHead}>
                    <Text style={s.pickT} numberOfLines={1}>{pickPlan.title}</Text>
                    <Sub>未完成</Sub>
                  </View>
                  <Sub>
                    {`${pickPlan.durationMin}分钟 · ${pickPlan.exercises.length}个动作${pickPlan.focus.length ? ` · ${pickPlan.focus.map((m) => MUSCLE_ZH[m]).join('/')}` : ''}`}
                  </Sub>
                  <View style={s.pickExWrap}>
                    {pickPlan.exercises.map((ex, i) => (
                      <Text key={`${ex.exerciseId}-${i}`} style={s.planEx} numberOfLines={1}>
                        {`${i + 1}. ${ex.name}  ${ex.sets}×${ex.reps}`}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : (
                <Sub>{dayPick === today ? '今天还没有训练安排或记录' : '这天没有训练安排或记录'}</Sub>
              )}

              <View style={s.pickData}>
                <View style={s.pickDataItem}>
                  <Sub>饮食摄入</Sub>
                  <Text style={s.pickDataV}>{pickKcal > 0 ? `${pickKcal} kcal` : '未记录'}</Text>
                </View>
                <View style={s.pickDataItem}>
                  <Sub>体重</Sub>
                  <Text style={s.pickDataV}>{pickWeight ? `${pickWeight} kg` : '未记录'}</Text>
                </View>
                <View style={s.pickDataItem}>
                  <Sub>手帐</Sub>
                  <Text style={s.pickDataV}>{pickJournal > 0 ? `${pickJournal} 页` : '无'}</Text>
                </View>
              </View>
            </Animated.View>
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(2)}>
          <Card>
            <View style={s.statRow}>
              <Stat label="连续达标" value={streak} unit="次" color={C.accent} count />
              <View style={s.statDivider} />
              <Stat label="累计训练" value={logs.length} unit="次" count />
              <View style={s.statDivider} />
              <Press
                style={s.statPress}
                onPress={() => { setWInput(weight ? String(weight) : ''); setWOpen(true); }}
              >
                <Stat label={weight ? '最新体重' : '记个体重'} value={weight ? weight.toFixed(1) : '--'} unit="kg" />
              </Press>
            </View>
            {STREAK_MILESTONES.includes(streak) ? (
              <View style={s.mileRow}>
                <Stamp label={`连续${streak}天`} fontSize={9} rotate={-5} />
                <Text style={s.mileT}>铁铁：连续 {streak} 个训练日达标，这一章给你盖个大印章！</Text>
              </View>
            ) : null}
            {metrics.length > 0 ? (
              <View style={s.wTrendBox}>
                <WeightChart points={metrics.slice(-14).map((m) => ({ date: m.date, weightKg: m.weightKg }))} />
                <View style={s.wTrendRow}>
                  <Sub style={{ flex: 1 }}>
                    {metrics.length > 1
                      ? `最新 ${metrics[metrics.length - 1].weightKg}kg · 近${Math.min(metrics.length, 14)}次 ${
                          (() => {
                            const win = metrics.slice(-14);
                            const d = +(win[win.length - 1].weightKg - win[0].weightKg).toFixed(1);
                            return d === 0 ? '持平' : `${d > 0 ? '+' : ''}${d}kg`;
                          })()
                        }`
                      : `最新 ${metrics[metrics.length - 1].weightKg}kg · 多记几次就能看到趋势`}
                  </Sub>
                  <Press hitSlop={6} onPress={() => { setWInput(weight ? String(weight) : ''); setWOpen(true); }}>
                    <Text style={s.wTrendBtn}>记体重 ›</Text>
                  </Press>
                </View>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(3)}>
          <Card style={s.weekReview}>
            <View style={s.weekHead}>
              <Text style={s.weekT}>本周回顾</Text>
              <Press hitSlop={6} onPress={() => setPosterOpen(true)}>
                <Text style={s.shareT}>分享战绩 ›</Text>
              </Press>
            </View>
            <View style={s.statRow}>
              <Stat label="训练" value={weekDone} unit={`/${weekPlanned}次`} color={C.accent} count />
              <View style={s.statDivider} />
              <Stat label="总容量" value={thisVol} unit="kg" count />
              <View style={s.statDivider} />
              <Stat label="饮食记录" value={dietDays} unit="天" count />
            </View>
            {lastVol > 0 || wDelta !== null ? (
              <Sub style={{ marginTop: 10 }}>
                {`较上周：${
                  lastVol > 0
                    ? thisVol === lastVol
                      ? '容量持平'
                      : `容量 ${thisVol > lastVol ? '+' : '-'}${Math.abs(Math.round(((thisVol - lastVol) / lastVol) * 100))}%`
                    : '容量首周统计'
                }${wDelta !== null ? ` · 体重 ${wDelta > 0 ? '+' : ''}${wDelta}kg` : ''}`}
              </Sub>
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(4)}>
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
      </Scroll>

      <Sheet visible={wOpen} onClose={() => setWOpen(false)} title="记录今天的体重">
        <View style={{ gap: 12 }}>
          {weight ? <Sub>{`当前记录：${weight}kg`}</Sub> : null}
          <NumberInput value={wInput} onChange={setWInput} suffix="kg" placeholder={`如 ${weight ?? 70}`} />
          <Button title="保存" disabled={!Number(wInput)} onPress={saveWeight} />
        </View>
      </Sheet>

      {/* 分享海报：所见即所得，截图后调系统分享（Web 端自动降级为文字战报） */}
      <Modal visible={posterOpen} transparent animationType="fade" onRequestClose={() => setPosterOpen(false)}>
        <Pressable style={s.posterBackdrop} onPress={() => setPosterOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={s.posterModal}>
            <View ref={posterRef} collapsable={false} style={s.posterShotWrap}>
              <SharePoster data={{ weekDone, weekPlanned, volumeKg: thisVol, dietDays, weightDelta: wDelta, streak }} />
            </View>
            <View style={s.posterBtnRow}>
              <Button title="分享图片" onPress={() => { void doSharePoster(); }} />
              <Button title="关闭" kind="ghost" onPress={() => setPosterOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  resume: { padding: 20, marginTop: 6 },
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
  dayBar: { width: 16, height: 3, borderRadius: 99, backgroundColor: 'transparent', marginTop: 5 },
  dayBarOn: { backgroundColor: C.accent },
  dayReview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed' },
  dayRevHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dayRevT: { color: C.text, fontSize: 14, fontWeight: '800', fontFamily: FONT.extra },
  dayRevLink: { color: C.accent, fontSize: 12, fontWeight: '700' },
  pickBox: { gap: 2 },
  pickHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  pickT: { color: C.text, fontSize: 15, fontWeight: '800', flex: 1 },
  pickExRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  pickExName: { color: C.text, fontSize: 13, fontWeight: '600', flex: 1 },
  pickExSets: { color: C.sub, fontSize: 11, maxWidth: '58%', textAlign: 'right', fontFamily: FONT.semi },
  pickExWrap: { marginTop: 8, gap: 4, backgroundColor: C.inset, borderRadius: 10, padding: 10 },
  pickData: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed' },
  pickDataItem: { flex: 1 },
  pickDataV: { color: C.text, fontSize: 14, fontWeight: '700', marginTop: 3, fontFamily: FONT.extra },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statPress: { flex: 1 },
  mileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed',
  },
  mileT: { color: C.sub, fontSize: 12, fontWeight: '600', flex: 1 },
  wTrendBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed' },
  wTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  wTrendBtn: { color: C.accent, fontSize: 13, fontWeight: '700' },
  weekReview: { paddingVertical: 14 },
  shareT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  posterBackdrop: { flex: 1, backgroundColor: 'rgba(43,36,22,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  posterModal: { alignItems: 'center' },
  posterShotWrap: { borderRadius: R.lg },
  posterBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statDivider: { width: 1, height: 30, backgroundColor: C.line, marginHorizontal: 6 },
  dietPress: { borderRadius: R.lg },
  dietCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringT: { color: C.text, fontSize: 11, fontWeight: '800', fontFamily: FONT.extra },
  dietT: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  arrow: { color: C.sub, fontSize: 24 },
});
