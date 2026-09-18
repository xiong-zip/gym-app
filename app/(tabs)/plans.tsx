import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, SectionTitle, Segmented, Sub } from '../../src/components/ui';
import { EMPHASIS, EQUIP_ZH, EXERCISE_BY_ID, MUSCLE_ORDER, MUSCLE_ZH } from '../../src/data/exercises';
import { fmtCN } from '../../src/lib/date';
import { DURATION_OPTIONS, generateAIPlan, generateRulePlan } from '../../src/lib/planner';
import { useProfileStore } from '../../src/store/profile';
import { useSettingsStore } from '../../src/store/settings';
import { lastPerformanceOf, useWorkoutsStore } from '../../src/store/workouts';
import { C } from '../../src/theme';
import type { GeneratedPlan, MuscleGroup } from '../../src/types';

export default function PlansScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const ai = useSettingsStore((s) => s.ai);
  const logs = useWorkoutsStore((s) => s.logs);
  const savedPlans = useWorkoutsStore((s) => s.savedPlans);
  const savePlan = useWorkoutsStore((s) => s.savePlan);
  const deletePlan = useWorkoutsStore((s) => s.deletePlan);

  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [emphasis, setEmphasis] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState(45);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  if (!profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const pickMuscle = (m: MuscleGroup) => {
    setMuscle(m === muscle ? null : m);
    setEmphasis(undefined);
    setPlan(null);
  };

  const generate = async () => {
    if (!muscle || !profile) return;
    setLoading(true);
    try {
      const opts = {
        focus: [muscle],
        emphasis,
        durationMin: duration,
        profile,
        seedKey: `${Date.now()}`,
      };
      let p: GeneratedPlan;
      if (ai.enabled && ai.apiKey) {
        try {
          p = await generateAIPlan(opts, ai);
        } catch (e) {
          p = generateRulePlan(opts);
          p.tips = `AI 生成失败（${e instanceof Error ? e.message : '未知错误'}），已使用内置规则引擎。`;
        }
      } else {
        p = generateRulePlan(opts);
      }
      setPlan(p);
      setSavedToast(false);
    } finally {
      setLoading(false);
    }
  };

  const startPlan = (p: GeneratedPlan) => {
    router.push({ pathname: '/session', params: { plan: encodeURIComponent(JSON.stringify(p)) } });
  };

  const emphOptions = muscle ? EMPHASIS[muscle] ?? [] : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>训练计划</Text>
        <Sub>{`按部位生成训练计划${ai.enabled && ai.apiKey ? ' · AI 已启用' : ' · 内置规则引擎（可在"我的"页配置 AI）'}`}</Sub>

        {savedPlans.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <SectionTitle>我的计划</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {savedPlans.map((p) => (
                <View key={p.id} style={s.savedWrap}>
                  <Pressable style={s.savedChip} onPress={() => { setPlan(p); setSavedToast(true); }}>
                    <Text style={s.savedT} numberOfLines={1}>{p.title}</Text>
                    <Sub style={{ fontSize: 10 }}>{`${p.source === 'ai' ? 'AI' : '规则'} · ${fmtCN(new Date(p.createdAt).toISOString().slice(0, 10))}`}</Sub>
                  </Pressable>
                  <Pressable style={s.savedDel} onPress={() => deletePlan(p.id)}>
                    <Text style={s.savedDelT}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <SectionTitle>选择部位</SectionTitle>
        <View style={s.grid}>
          {MUSCLE_ORDER.map((m) => {
            const on = m === muscle;
            return (
              <Pressable key={m} style={[s.gridItem, on && s.gridItemOn]} onPress={() => pickMuscle(m)}>
                <Text style={[s.gridT, on && s.gridTOn]}>{MUSCLE_ZH[m]}</Text>
                {EMPHASIS[m] ? <Sub style={{ fontSize: 10 }}>{EMPHASIS[m].join('/')}</Sub> : null}
              </Pressable>
            );
          })}
        </View>

        {muscle && emphOptions.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <SectionTitle>侧重（可选）</SectionTitle>
            <View style={s.wrap}>
              <Chip label="整体" selected={!emphasis} onPress={() => setEmphasis(undefined)} />
              {emphOptions.map((e) => (
                <Chip key={e} label={e} selected={emphasis === e} onPress={() => setEmphasis(e)} />
              ))}
            </View>
          </View>
        )}

        <View style={{ marginTop: 14 }}>
          <SectionTitle>时长</SectionTitle>
          <Segmented
            options={DURATION_OPTIONS.map((d) => ({ value: d, label: `${d}分钟` }))}
            value={duration}
            onChange={setDuration}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color={C.accent} size="large" />
              <Sub style={{ marginTop: 10 }}>AI 正在为你编排…</Sub>
            </View>
          ) : (
            <Button title="生成计划" onPress={generate} disabled={!muscle} />
          )}
        </View>

        {plan && (
          <Card style={s.result}>
            <View style={s.resultHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.resultT}>{plan.title}</Text>
                <Sub>{`${plan.durationMin}分钟 · ${plan.exercises.length}个动作 · ${plan.focus.map((m) => MUSCLE_ZH[m]).join('/')}`}</Sub>
              </View>
              <View style={[s.srcBadge, plan.source === 'ai' ? { backgroundColor: '#12315B' } : null]}>
                <Text style={s.srcT}>{plan.source === 'ai' ? 'AI' : '规则'}</Text>
              </View>
            </View>

            {plan.tips ? (
              <View style={s.tipsBox}>
                <Text style={s.tipsT}>💡 {plan.tips}</Text>
              </View>
            ) : null}

            <View style={s.exList}>
              {plan.exercises.map((ex, i) => {
                const meta = EXERCISE_BY_ID.get(ex.exerciseId);
                const last = lastPerformanceOf(logs, ex.exerciseId);
                return (
                  <View key={`${ex.exerciseId}-${i}`} style={s.exRow}>
                    <View style={s.exIdx}>
                      <Text style={s.exIdxT}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.exName}>{ex.name}</Text>
                      <Sub>
                        {`${ex.sets}组 × ${ex.reps} · 休息${ex.restSec}s${meta ? ` · ${EQUIP_ZH[meta.equipment]}` : ''}`}
                        {last ? ` · 上次 ${last.weight}kg×${last.reps}` : ''}
                      </Sub>
                      {ex.note ? <Sub style={{ marginTop: 2 }}>{ex.note}</Sub> : null}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={s.btnRow}>
              <Pressable style={s.startBtn} onPress={() => startPlan(plan)}>
                <Text style={s.startT}>开始训练</Text>
              </Pressable>
              <Button
                title={savedToast ? '已保存' : '保存计划'}
                kind="ghost"
                small
                onPress={() => { savePlan(plan); setSavedToast(true); }}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, paddingBottom: 40 },
  title: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  savedWrap: { flexDirection: 'row', alignItems: 'center' },
  savedChip: {
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: 180,
  },
  savedT: { color: C.text, fontSize: 13, fontWeight: '700' },
  savedDel: { marginLeft: -8, marginBottom: 14, padding: 4 },
  savedDelT: { color: C.sub, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '30.5%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 3,
  },
  gridItemOn: { backgroundColor: C.accent, borderColor: C.accent },
  gridT: { color: C.text, fontSize: 15, fontWeight: '700' },
  gridTOn: { color: C.onAccent },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loadingBox: {
    height: 120, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
  },
  result: { marginTop: 18 },
  resultHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resultT: { color: C.text, fontSize: 19, fontWeight: '800', marginBottom: 3 },
  srcBadge: {
    backgroundColor: '#1E2A10', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  srcT: { color: C.accent, fontSize: 11, fontWeight: '700' },
  tipsBox: {
    backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 12, marginTop: 12,
  },
  tipsT: { color: C.sub, fontSize: 12, lineHeight: 18 },
  exList: { marginTop: 6 },
  exRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  exIdx: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  exIdxT: { color: C.accent, fontSize: 12, fontWeight: '800' },
  exName: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  startBtn: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  startT: { color: C.onAccent, fontSize: 16, fontWeight: '800' },
});
