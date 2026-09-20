import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, Chip, Press, SectionTitle, Segmented, Sheet, Sub, TextInputLine, stagger } from '../../src/components/ui';
import { EMPHASIS, EQUIP_ZH, EXERCISES, EXERCISE_BY_ID, MUSCLE_ORDER, MUSCLE_ZH } from '../../src/data/exercises';
import { fmtCN } from '../../src/lib/date';
import { DURATION_OPTIONS, generateAIPlan, generateRulePlan } from '../../src/lib/planner';
import { useProfileStore } from '../../src/store/profile';
import { useSettingsStore } from '../../src/store/settings';
import { lastPerformanceFor, useWorkoutsStore } from '../../src/store/workouts';
import { C, FONT, R, TAPE } from '../../src/theme';
import type { Exercise, GeneratedPlan, MuscleGroup, PlannedExercise } from '../../src/types';

/** 自定义模式的编辑行（数字用字符串存，便于输入中间态） */
interface CRow {
  key: string;
  exerciseId: number; // 0 = 手填；>0 = 取自动作库
  name: string;
  sets: string;
  reps: string;
  restSec: string;
}

let rowSeq = 0;
const newRow = (patch?: Partial<CRow>): CRow => ({
  key: `r-${Date.now()}-${rowSeq++}`,
  exerciseId: 0,
  name: '',
  sets: '3',
  reps: '10-12',
  restSec: '90',
  ...patch,
});

const sourceLabel = (src: GeneratedPlan['source']) => (src === 'ai' ? 'AI' : src === 'custom' ? '自定义' : '规则');

export default function PlansScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const ai = useSettingsStore((s) => s.ai);
  const logs = useWorkoutsStore((s) => s.logs);
  const savedPlans = useWorkoutsStore((s) => s.savedPlans);
  const savePlan = useWorkoutsStore((s) => s.savePlan);
  const deletePlan = useWorkoutsStore((s) => s.deletePlan);

  const [mode, setMode] = useState<'gen' | 'custom'>('gen');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [emphasis, setEmphasis] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState(45);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // 自定义计划
  const [cTitle, setCTitle] = useState('');
  const [cRows, setCRows] = useState<CRow[]>([newRow()]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pq, setPq] = useState('');

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

  /* ---------- 自定义计划 ---------- */

  const updateRow = (key: string, patch: Partial<CRow>) => {
    setCRows((arr) => arr.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addEmptyRow = () => setCRows((arr) => [...arr, newRow()]);

  const addFromLibrary = (ex: Exercise) => {
    setCRows((arr) => {
      // 只有一行且是空白占位时，直接填充它，避免多余空行
      const isPlaceholder = arr.length === 1 && !arr[0].name.trim() && arr[0].exerciseId === 0;
      const row = newRow({ exerciseId: ex.id, name: ex.name });
      return isPlaceholder ? [row] : [...arr, row];
    });
  };

  const buildCustomPlan = (): GeneratedPlan | null => {
    const valid = cRows.filter((r) => r.name.trim());
    if (!valid.length) return null;
    const exercises: PlannedExercise[] = valid.map((r, i) => ({
      // 手填动作没有库 ID，用负数占位（历史成绩按名称匹配）
      exerciseId: r.exerciseId > 0 ? r.exerciseId : -(i + 1),
      name: r.name.trim().slice(0, 24),
      sets: Math.max(1, Math.min(20, Math.round(Number(r.sets) || 3))),
      reps: r.reps.trim().slice(0, 10) || '10',
      restSec: Math.max(15, Math.min(600, Math.round(Number(r.restSec) || 90))),
    }));
    const durationMin = Math.max(10, Math.round(exercises.reduce((a, e) => a + e.sets * (e.restSec + 35), 0) / 60 / 5) * 5);
    const title = cTitle.trim() || `${exercises[0].name} 等 ${exercises.length} 个动作`;
    return {
      id: `custom-${Date.now()}`,
      title,
      sessionType: 'custom',
      focus: [],
      durationMin,
      source: 'custom',
      tips: '',
      exercises,
      createdAt: Date.now(),
    };
  };

  const customReady = cRows.some((r) => r.name.trim());

  const startCustom = () => {
    const p = buildCustomPlan();
    if (p) startPlan(p);
  };

  const saveCustom = () => {
    const p = buildCustomPlan();
    if (!p) return;
    savePlan(p);
    setSavedToast(true);
  };

  /** 把生成好的计划转成自定义编辑（可改动作/组数/次数） */
  const editAsCustom = (p: GeneratedPlan) => {
    setCRows(p.exercises.map((ex) => newRow({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: String(ex.sets),
      reps: ex.reps,
      restSec: String(ex.restSec),
    })));
    setCTitle(p.title);
    setMode('custom');
    setSavedToast(false);
  };

  const pickerList = useMemo(() => {
    const q = pq.trim();
    const list = q ? EXERCISES.filter((e) => e.name.includes(q)) : EXERCISES;
    return list.slice(0, 60);
  }, [pq]);

  const emphOptions = muscle ? EMPHASIS[muscle] ?? [] : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>训练计划</Text>
        <Sub>
          {mode === 'gen'
            ? `按部位生成训练计划${ai.enabled && ai.apiKey ? ' · AI 已启用' : ' · 内置规则引擎（可在"我的"页配置 AI）'}`
            : '自己填动作、组数、次数；也可以从动作库选，或把生成好的计划转过来改'}
        </Sub>

        <View style={{ marginTop: 14 }}>
          <Segmented
            options={[{ value: 'gen', label: '智能生成' }, { value: 'custom', label: '自定义' }]}
            value={mode}
            onChange={(m) => { setMode(m); setSavedToast(false); }}
          />
        </View>

        {savedPlans.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <SectionTitle>我的计划</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {savedPlans.map((p) => (
                <View key={p.id} style={s.savedWrap}>
                  <Press style={s.savedChip} onPress={() => { setMode('gen'); setPlan(p); setSavedToast(true); }}>
                    <Text style={s.savedT} numberOfLines={1}>{p.title}</Text>
                    <Sub style={{ fontSize: 10 }}>{`${sourceLabel(p.source)} · ${fmtCN(new Date(p.createdAt).toISOString().slice(0, 10))}`}</Sub>
                  </Press>
                  <Pressable hitSlop={6} style={s.savedDel} onPress={() => deletePlan(p.id)}>
                    <Text style={s.savedDelT}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {mode === 'gen' ? (
          <>
            <SectionTitle>选择部位</SectionTitle>
            <View style={s.grid}>
              {MUSCLE_ORDER.map((m) => {
                const on = m === muscle;
                return (
                  <Press
                    key={m}
                    style={[s.gridItem, on && s.gridItemOn]}
                    onPress={() => pickMuscle(m)}
                    haptic="medium"
                  >
                    <Text style={[s.gridT, on && s.gridTOn]}>{MUSCLE_ZH[m]}</Text>
                    {EMPHASIS[m] ? <Sub style={{ fontSize: 10, color: on ? C.markerInk : C.sub }}>{EMPHASIS[m].join('/')}</Sub> : null}
                  </Press>
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

            <View style={{ marginTop: 18 }}>
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
              <Animated.View entering={stagger()}>
                <Card style={s.result} taped={TAPE.blue}>
                  <View style={s.resultHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.resultT}>{plan.title}</Text>
                      <Sub>{`${plan.durationMin}分钟 · ${plan.exercises.length}个动作${plan.focus.length ? ` · ${plan.focus.map((m) => MUSCLE_ZH[m]).join('/')}` : ''}`}</Sub>
                    </View>
                    <View style={[s.srcBadge, plan.source === 'ai' && { borderColor: C.info }, plan.source === 'custom' && { borderColor: C.accent }]}>
                      <Text style={[s.srcT, plan.source === 'ai' && { color: C.info }, plan.source === 'custom' && { color: C.accent }]}>{sourceLabel(plan.source)}</Text>
                    </View>
                  </View>

                  {plan.tips ? (
                    <View style={s.tipsBox}>
                      <Text style={s.tipsT}>✎ {plan.tips}</Text>
                    </View>
                  ) : null}

                  <View style={s.exList}>
                    {plan.exercises.map((ex, i) => {
                      const meta = EXERCISE_BY_ID.get(ex.exerciseId);
                      const last = lastPerformanceFor(logs, ex.exerciseId, ex.name);
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
                    <Button title="开始训练" onPress={() => startPlan(plan)} />
                    <Button title="编辑" kind="ghost" small onPress={() => editAsCustom(plan)} />
                    <Button
                      title={savedToast ? '已保存 ✓' : '保存'}
                      kind="ghost"
                      small
                      onPress={() => { savePlan(plan); setSavedToast(true); }}
                    />
                  </View>
                </Card>
              </Animated.View>
            )}
          </>
        ) : (
          <>
            <SectionTitle>计划名称（可选）</SectionTitle>
            <TextInputLine value={cTitle} onChange={setCTitle} placeholder="如：胸 + 三头 强化" />

            <View style={{ marginTop: 16 }}>
              <SectionTitle right={<Sub>{`${cRows.filter((r) => r.name.trim()).length} 个动作`}</Sub>}>动作</SectionTitle>
              {cRows.map((r, i) => (
                <View key={r.key} style={s.cRow}>
                  <View style={s.cRowHead}>
                    <View style={[s.cIdx, r.exerciseId > 0 && s.cIdxLib]}>
                      <Text style={s.cIdxT}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={s.cName}
                      value={r.name}
                      onChangeText={(v) => {
                        const name = v.replace(/[^\u4e00-\u9fa5A-Za-z0-9()（）\s-]/g, '');
                        // 名称仍与库中动作一致时保留库关联（用于器械显示与历史成绩）
                        const libName = r.exerciseId > 0 ? EXERCISE_BY_ID.get(r.exerciseId)?.name : undefined;
                        updateRow(r.key, { name, exerciseId: libName && name === libName ? r.exerciseId : 0 });
                      }}
                      placeholder="动作名称（如：卧推 / 深蹲）"
                      placeholderTextColor={C.faint}
                      maxLength={24}
                    />
                    {cRows.length > 1 ? (
                      <Pressable hitSlop={8} onPress={() => setCRows((arr) => arr.filter((x) => x.key !== r.key))}>
                        <Text style={s.cDel}>✕</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={s.cRowNums}>
                    <NumBox label="组数" value={r.sets} onChange={(v) => updateRow(r.key, { sets: v.replace(/\D/g, '') })} />
                    <NumBox label="次数" value={r.reps} onChange={(v) => updateRow(r.key, { reps: v.replace(/[^\d\-~+一-龥]/g, '') })} />
                    <NumBox label="休息" value={r.restSec} onChange={(v) => updateRow(r.key, { restSec: v.replace(/\D/g, '') })} suffix="s" />
                  </View>
                </View>
              ))}
            </View>

            <View style={s.cActions}>
              <Button title="＋ 添加动作" kind="ghost" small onPress={addEmptyRow} />
              <Button title="从动作库选" kind="ghost" small onPress={() => { setPq(''); setPickerOpen(true); }} />
            </View>

            <View style={{ marginTop: 18 }}>
              <Button title="开始训练" onPress={startCustom} disabled={!customReady} />
            </View>
            <View style={s.cActions}>
              <Button title={savedToast ? '已保存 ✓' : '保存到我的计划'} kind="ghost" small onPress={saveCustom} disabled={!customReady} />
              {cRows.length > 1 ? (
                <Button title="清空" kind="ghost" small onPress={() => { setCRows([newRow()]); setCTitle(''); setSavedToast(false); }} />
              ) : null}
            </View>
            {!customReady ? <Sub style={{ marginTop: 10 }}>至少填写一个动作名称才能开始训练。</Sub> : null}
          </>
        )}
      </ScrollView>

      {/* 动作库选择 */}
      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="从动作库选（可连续添加）">
        <TextInput
          style={s.pSearch}
          value={pq}
          onChangeText={setPq}
          placeholder="搜索动作（如：卧推 / 深蹲）"
          placeholderTextColor={C.faint}
        />
        <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
          {pickerList.map((e) => (
            <Pressable key={e.id} style={s.pRow} onPress={() => addFromLibrary(e)}>
              <View style={{ flex: 1 }}>
                <Text style={s.pName}>{e.name}</Text>
                <Sub style={{ fontSize: 11 }}>{`${MUSCLE_ZH[e.primary]} · ${EQUIP_ZH[e.equipment]}`}</Sub>
              </View>
              <Text style={s.pAdd}>＋</Text>
            </Pressable>
          ))}
          {pickerList.length === 0 ? <Sub style={{ padding: 16, textAlign: 'center' }}>没找到，直接在上面手填名称也可以</Sub> : null}
        </ScrollView>
        <View style={{ marginTop: 10 }}>
          <Button title="完成" onPress={() => setPickerOpen(false)} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function NumBox({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <View style={s.numCol}>
      <Text style={s.numLabel}>{label}</Text>
      <View style={s.numBox}>
        <TextInput
          style={s.numInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={C.faint}
          maxLength={6}
        />
        {suffix ? <Text style={s.numSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, paddingBottom: 64 },
  title: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 8, letterSpacing: 0.5 },
  savedWrap: { flexDirection: 'row', alignItems: 'center' },
  savedChip: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.inkAlpha, borderRadius: R.md,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: 180,
  },
  savedT: { color: C.text, fontSize: 13, fontWeight: '700' },
  savedDel: { marginLeft: -6, marginBottom: 12, padding: 6 },
  savedDelT: { color: C.faint, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '30.5%', backgroundColor: C.card, borderWidth: 1.5, borderColor: C.inkAlpha,
    borderRadius: R.md, paddingVertical: 14, alignItems: 'center', gap: 3,
  },
  gridItemOn: { backgroundColor: C.marker, borderColor: 'rgba(107,90,16,0.4)' },
  gridT: { color: C.text, fontSize: 15, fontWeight: '700' },
  gridTOn: { color: C.markerInk },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loadingBox: {
    height: 120, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.inkAlpha, borderStyle: 'dashed',
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  result: { marginTop: 18 },
  resultHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resultT: { color: C.text, fontSize: 19, fontWeight: '800', marginBottom: 3 },
  srcBadge: {
    backgroundColor: C.inset, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1.5, borderColor: C.good,
  },
  srcT: { color: C.good, fontSize: 11, fontWeight: '800' },
  tipsBox: {
    backgroundColor: C.inset, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.inkAlphaSoft,
    padding: 12, marginTop: 12,
  },
  tipsT: { color: C.sub, fontSize: 12, lineHeight: 18 },
  exList: { marginTop: 6 },
  exRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.lineStrong, borderStyle: 'dashed' },
  exIdx: {
    width: 26, height: 26, borderRadius: 999, backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlphaSoft,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  exIdxT: { color: C.accent, fontSize: 12, fontWeight: '900', fontFamily: FONT.extra },
  exName: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },

  /* 自定义模式 */
  cRow: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.inkAlphaSoft, borderRadius: R.md,
    padding: 12, marginBottom: 10, gap: 10,
  },
  cRowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cIdx: {
    width: 24, height: 24, borderRadius: 999, backgroundColor: C.inset,
    alignItems: 'center', justifyContent: 'center',
  },
  cIdxLib: { backgroundColor: C.marker },
  cIdxT: { color: C.text, fontSize: 12, fontWeight: '800', fontFamily: FONT.extra },
  cName: {
    flex: 1, color: C.text, fontSize: 15, fontWeight: '600',
    borderBottomWidth: 1.5, borderBottomColor: C.line, paddingVertical: 4, paddingHorizontal: 2,
  },
  cDel: { color: C.faint, fontSize: 15, fontWeight: '700' },
  cRowNums: { flexDirection: 'row', gap: 10 },
  numCol: { flex: 1 },
  numLabel: { color: C.sub, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  numBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.inset,
    borderWidth: 1.5, borderColor: C.inkAlpha, borderRadius: R.sm, height: 40, paddingHorizontal: 10,
  },
  numInput: { flex: 1, color: C.text, fontSize: 15, fontWeight: '700', paddingVertical: 0, textAlign: 'center' },
  numSuffix: { color: C.sub, fontSize: 12, fontWeight: '600' },
  cActions: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },

  /* 动作库弹层 */
  pSearch: {
    color: C.text, backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlpha,
    borderRadius: R.sm, height: 42, paddingHorizontal: 14, fontSize: 14, marginBottom: 8,
  },
  pRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  pName: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  pAdd: { color: C.accent, fontSize: 18, fontWeight: '800', paddingHorizontal: 6 },
});
