import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Sub } from '../src/components/ui';
import { EQUIP_ZH, EXERCISE_BY_ID } from '../src/data/exercises';
import { fmtDur, todayKey } from '../src/lib/date';
import { lastPerformanceOf, useWorkoutsStore } from '../src/store/workouts';
import { C } from '../src/theme';
import type { GeneratedPlan, WorkoutLog } from '../src/types';

interface SetRow { weight: string; reps: string; done: boolean }

function parsePlan(raw: string | undefined): GeneratedPlan | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as GeneratedPlan;
  } catch {
    try {
      return JSON.parse(raw) as GeneratedPlan;
    } catch {
      return null;
    }
  }
}

/** 从 reps 目标（如 "8-12"、"40秒"）提取默认次数 */
function defaultReps(reps: string): string {
  const m = reps.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return '10';
  return m[2] ?? m[1];
}

export default function SessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string }>();
  const plan = useMemo(() => parsePlan(typeof params.plan === 'string' ? params.plan : undefined), [params.plan]);
  const logs = useWorkoutsStore((s) => s.logs);
  const addLog = useWorkoutsStore((s) => s.addLog);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<{ total: number; remain: number } | null>(null);

  const [sets, setSets] = useState<SetRow[][]>(() => {
    if (!plan) return [];
    return plan.exercises.map((ex) => {
      const last = lastPerformanceOf(logs, ex.exerciseId);
      const w = last && last.weight > 0 ? String(last.weight) : '';
      return Array.from({ length: ex.sets }, () => ({ weight: w, reps: defaultReps(ex.reps), done: false }));
    });
  });

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => {
      setRest((r) => {
        if (!r) return null;
        if (r.remain <= 1) return null;
        return { ...r, remain: r.remain - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [rest !== null]);

  if (!plan || plan.exercises.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Sub>计划数据无效</Sub>
          <Pressable style={s.backChip} onPress={() => router.back()}>
            <Text style={s.backChipT}>返回</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const totalDone = sets.reduce((a, ex) => a + ex.filter((r) => r.done).length, 0);
  const volume = sets.reduce(
    (a, ex) => a + ex.reduce((b, r) => (r.done ? b + (Number(r.weight) || 0) * (Number(r.reps) || 0) : b), 0),
    0,
  );

  const toggleSet = (ei: number, si: number) => {
    const willDone = !sets[ei][si].done;
    setSets((prev) => prev.map((ex, i) => {
      if (i !== ei) return ex;
      return ex.map((r, j) => (j !== si ? r : { ...r, done: willDone }));
    }));
    if (willDone) {
      const exRest = plan.exercises[ei].restSec;
      setRest({ total: exRest, remain: exRest });
    }
  };

  const editSet = (ei: number, si: number, field: 'weight' | 'reps', v: string) => {
    setSets((prev) => prev.map((ex, i) => (i !== ei ? ex : ex.map((r, j) => (j !== si ? r : { ...r, [field]: v.replace(/[^\d.]/g, '') })))));
  };

  const addSet = (ei: number) => {
    setSets((prev) => prev.map((ex, i) => {
      if (i !== ei) return ex;
      const lastRow = ex[ex.length - 1];
      return [...ex, { weight: lastRow?.weight ?? '', reps: lastRow?.reps ?? '10', done: false }];
    }));
  };

  const finish = () => {
    if (totalDone === 0) {
      Alert.alert('还没有完成的组', '确定要放弃本次训练吗？', [
        { text: '继续训练', style: 'cancel' },
        { text: '放弃', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    const entries = plan.exercises
      .map((ex, ei) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: sets[ei].filter((r) => r.done).map((r) => ({ weight: Number(r.weight) || 0, reps: Number(r.reps) || 0 })),
      }))
      .filter((e) => e.sets.length > 0);
    const log: WorkoutLog = {
      id: `log-${Date.now()}`,
      date: todayKey(),
      startedAt: startedAt.current,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
      title: plan.title,
      sessionType: plan.sessionType,
      exercises: entries,
    };
    addLog(log);
    Alert.alert(
      '训练完成 💪',
      `${totalDone} 组 · 总容量 ${Math.round(volume)} kg · 用时 ${fmtDur(log.durationSec)}\n下次同动作会自动参考本次重量。`,
      [{ text: '好的', onPress: () => router.back() }],
    );
  };

  const quit = () => {
    if (totalDone > 0) {
      Alert.alert('结束训练？', '已记录的组将不会保存', [
        { text: '继续训练', style: 'cancel' },
        { text: '退出', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable hitSlop={10} onPress={quit}>
          <Text style={s.closeT}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headT} numberOfLines={1}>{plan.title}</Text>
          <Sub>{`${totalDone} 组 · ${Math.round(volume)} kg · ${fmtDur(elapsed)}`}</Sub>
        </View>
        <Pressable style={s.finishBtn} onPress={finish}>
          <Text style={s.finishT}>完成</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: rest ? 130 : 40, gap: 12 }}>
        {plan.exercises.map((ex, ei) => {
          const meta = EXERCISE_BY_ID.get(ex.exerciseId);
          const last = lastPerformanceOf(logs, ex.exerciseId);
          const allDone = sets[ei].every((r) => r.done);
          return (
            <Card key={`${ex.exerciseId}-${ei}`} style={allDone ? { borderColor: C.accent, backgroundColor: '#15200C' } : undefined}>
              <View style={s.exHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.exT}>{ex.name}</Text>
                  <Sub>
                    {`${ex.sets}组 × ${ex.reps} · 休息${ex.restSec}s${meta ? ` · ${EQUIP_ZH[meta.equipment]}` : ''}`}
                    {last ? ` · 上次 ${last.weight}kg×${last.reps}` : ''}
                  </Sub>
                </View>
                {allDone ? <Text style={s.checkBig}>✓</Text> : null}
              </View>

              {ex.note ? <Sub style={{ marginTop: 4, marginBottom: 6 }}>{ex.note}</Sub> : null}

              <View style={s.setHeader}>
                <Text style={s.setColT}>组</Text>
                <Text style={s.setColT}>{ex.timed ? '秒数' : '重量 kg'}</Text>
                <Text style={s.setColT}>{ex.timed ? '—' : '次数'}</Text>
                <Text style={s.setColT}>完成</Text>
              </View>
              {sets[ei].map((row, si) => (
                <View key={si} style={s.setRow}>
                  <Text style={s.setIdx}>{si + 1}</Text>
                  {ex.timed ? (
                    <View style={s.readonlyVal}><Text style={s.readonlyT}>{row.reps}</Text></View>
                  ) : (
                    <TextInput
                      style={s.setInput}
                      value={row.weight}
                      onChangeText={(v) => editSet(ei, si, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={C.sub}
                    />
                  )}
                  <TextInput
                    style={s.setInput}
                    value={row.reps}
                    onChangeText={(v) => editSet(ei, si, 'reps', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={C.sub}
                  />
                  <Pressable hitSlop={6} onPress={() => toggleSet(ei, si)} style={[s.doneBtn, row.done && s.doneBtnOn]}>
                    <Text style={[s.doneT, row.done && s.doneTOn]}>{row.done ? '✓' : ''}</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable style={s.addSet} onPress={() => addSet(ei)}>
                <Text style={s.addSetT}>＋ 加一组</Text>
              </Pressable>
            </Card>
          );
        })}
      </ScrollView>

      {rest && (
        <View style={s.restBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.restT}>组间休息 {rest.remain}s</Text>
            <View style={s.restTrack}>
              <View style={[s.restFill, { width: `${(1 - rest.remain / rest.total) * 100}%` }]} />
            </View>
          </View>
          <Pressable style={s.restBtn} onPress={() => setRest((r) => (r ? { ...r, remain: r.remain + 30, total: r.total + 30 } : r))}>
            <Text style={s.restBtnT}>+30s</Text>
          </Pressable>
          <Pressable style={[s.restBtn, { borderColor: C.border }]} onPress={() => setRest(null)}>
            <Text style={[s.restBtnT, { color: C.sub }]}>跳过</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  backChip: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  backChipT: { color: C.onAccent, fontWeight: '800' },
  head: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card, gap: 12,
  },
  closeT: { color: C.sub, fontSize: 20 },
  headT: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  finishBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  finishT: { color: C.onAccent, fontWeight: '800', fontSize: 14 },
  exHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  exT: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 3 },
  checkBig: { color: C.accent, fontSize: 22, fontWeight: '900' },
  setHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  setColT: { color: C.sub, fontSize: 11, flex: 1, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 6 },
  setIdx: { flex: 1, color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  setInput: {
    flex: 1, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    height: 40, color: C.text, textAlign: 'center', fontSize: 15, fontWeight: '700', paddingVertical: 0,
  },
  readonlyVal: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  readonlyT: { color: C.sub, fontSize: 14 },
  doneBtn: {
    flex: 1, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 6,
  },
  doneBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  doneT: { color: 'transparent', fontSize: 16, fontWeight: '900' },
  doneTOn: { color: C.onAccent },
  addSet: { marginTop: 8, alignItems: 'center', paddingVertical: 7, borderRadius: 10, backgroundColor: C.card2 },
  addSetT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  restBar: {
    position: 'absolute', left: 12, right: 12, bottom: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.accent, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  restT: { color: C.accent, fontSize: 15, fontWeight: '800', marginBottom: 7 },
  restTrack: { height: 5, backgroundColor: C.card2, borderRadius: 99, overflow: 'hidden' },
  restFill: { height: 5, backgroundColor: C.accent, borderRadius: 99 },
  restBtn: {
    borderWidth: 1, borderColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  restBtnT: { color: C.accent, fontSize: 12, fontWeight: '700' },
});
