import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, Chip, FadeInDown, Press, Scroll, SectionTitle, Segmented, Sheet, Sub, TextInputLine, stagger } from '../../src/components/ui';
import { EMPHASIS, EQUIP_ZH, EXERCISES, EXERCISE_BY_ID, MUSCLE_ORDER, MUSCLE_ZH } from '../../src/data/exercises';
import { addDays, fmtCN, todayKey, weekdayOf } from '../../src/lib/date';
import { DURATION_OPTIONS, generateAIPlan, generateRulePlan, weekSchedule } from '../../src/lib/planner';
import { useProfileStore } from '../../src/store/profile';
import { useScheduleStore } from '../../src/store/schedule';
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
  const params = useLocalSearchParams<{ editDate?: string }>();
  const profile = useProfileStore((s) => s.profile);
  const ai = useSettingsStore((s) => s.ai);
  const logs = useWorkoutsStore((s) => s.logs);
  const savedPlans = useWorkoutsStore((s) => s.savedPlans);
  const savePlan = useWorkoutsStore((s) => s.savePlan);
  const deletePlan = useWorkoutsStore((s) => s.deletePlan);
  const assign = useScheduleStore((s) => s.assign);
  const assignments = useScheduleStore((s) => s.assignments);

  const [mode, setMode] = useState<'gen' | 'custom'>('gen');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [emphasis, setEmphasis] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState(45);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [degraded, setDegraded] = useState(false); // AI 失败降级为规则引擎时显著提示
  // 自定义编辑正对应哪份已保存的计划（回写而不是另存一份）
  const [editingMeta, setEditingMeta] = useState<{ id: string; createdAt: number } | null>(null);

  // 自定义计划：分页编辑（一屏一个动作，左右滑动）
  const [cTitle, setCTitle] = useState('');
  const [cDate, setCDate] = useState<string | null>(todayKey()); // 排到哪天；null = 仅保存不排期
  const [cRows, setCRows] = useState<CRow[]>([newRow()]);
  const [cPage, setCPage] = useState(0);
  // 动作编辑视图：整理（列表通览，默认） / 逐个编辑（大卡片）
  const [cView, setCView] = useState<'list' | 'card'>('list');
  // 卡片左右滑动手势的起点
  const swipeX = useRef<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false); // 保存后弹出「我的计划」列表，可二次编辑
  const [pq, setPq] = useState('');

  // 从首页/手帐页「编辑」进入：把那天的排期课表载入编辑器（只执行一次）
  const loadedEditDate = useRef(false);
  useEffect(() => {
    if (loadedEditDate.current) return;
    const d = typeof params.editDate === 'string' ? params.editDate : '';
    if (!d) return;
    loadedEditDate.current = true;
    const a = assignments.find((x) => x.date === d);
    if (!a) return;
    setCRows(a.plan.exercises.map((ex) => newRow({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: String(ex.sets),
      reps: ex.reps,
      restSec: String(ex.restSec),
    })));
    setCTitle(a.plan.title);
    setMode('custom');
    setSavedToast(false);
    setDegraded(false);
    setEditingMeta({ id: a.plan.id, createdAt: a.plan.createdAt });
    setCDate(d);
    setCPage(0);
  }, [params.editDate, assignments]);

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
      let fellBack = false;
      if (ai.enabled && ai.apiKey) {
        try {
          p = await generateAIPlan(opts, ai);
        } catch (e) {
          p = generateRulePlan(opts);
          p.tips = `AI 暂时联系不上（${e instanceof Error ? e.message : '未知错误'}），这份是内置规则引擎生成的，可以先练。`;
          fellBack = true;
        }
      } else {
        p = generateRulePlan(opts);
      }
      setPlan(p);
      setDegraded(fellBack);
      setSavedToast(false);
      setEditingMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const startPlan = (p: GeneratedPlan, date?: string | null) => {
    // 同步记为训练日的安排（自定义模式带上所选日期，否则记今天）
    assign(date ?? todayKey(), p);
    router.push({ pathname: '/session', params: { plan: encodeURIComponent(JSON.stringify(p)) } });
  };

  const confirmDeletePlan = (p: GeneratedPlan) => {
    Alert.alert('删除这份计划？', `「${p.title}」删除后无法恢复。`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deletePlan(p.id) },
    ]);
  };

  /* ---------- 自定义计划 ---------- */

  const updateRow = (key: string, patch: Partial<CRow>) => {
    setCRows((arr) => arr.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const goCPage = (i: number) => {
    setCPage(Math.max(0, Math.min(cRows.length - 1, i)));
  };

  /** 新建一个动作并翻到它（可带预填内容） */
  const createNextRow = (patch?: Partial<CRow>) => {
    setCRows((arr) => [...arr, newRow(patch)]);
    setCPage(cRows.length); // 新行所在页
  };

  const delCRow = (i: number) => {
    if (cRows.length <= 1) return;
    setCRows((arr) => arr.filter((_, k) => k !== i));
    setCPage(Math.max(0, Math.min(cRows.length - 2, cPage)));
  };

  /** 整理模式：上下移动动作顺序 */
  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cRows.length) return;
    setCRows((arr) => {
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  /** 当前页是空白占位就填进去，否则新建一个动作（从动作库/历史复用共用） */
  const fillOrCreate = (patch: Partial<CRow>) => {
    const cur = cRows[cPage];
    if (cur && !cur.name.trim()) {
      updateRow(cur.key, patch);
    } else {
      createNextRow(patch);
    }
  };

  const addFromLibrary = (ex: Exercise) => {
    fillOrCreate({ exerciseId: ex.id, name: ex.name });
  };

  /** 最近练过：排期/保存的计划（带休息秒数）优先，实际训练记录补充 */
  const historyMoves = useMemo(() => {
    const map = new Map<string, { name: string; sets: string; reps: string; restSec: string }>();
    for (const p of [...savedPlans, ...assignments.map((a) => a.plan)]) {
      for (const ex of p.exercises) {
        if (!map.has(ex.name)) map.set(ex.name, { name: ex.name, sets: String(ex.sets), reps: ex.reps, restSec: String(ex.restSec) });
      }
    }
    for (let i = logs.length - 1; i >= 0; i--) {
      for (const e of logs[i].exercises) {
        if (!map.has(e.name) && e.sets.length > 0) {
          map.set(e.name, { name: e.name, sets: String(e.sets.length), reps: String(e.sets[e.sets.length - 1]?.reps ?? 10), restSec: '90' });
        }
      }
    }
    return [...map.values()].slice(0, 12);
  }, [savedPlans, assignments, logs]);

  const tapHistory = (h: { name: string; sets: string; reps: string; restSec: string }) => {
    const lib = EXERCISES.find((e) => e.name === h.name);
    fillOrCreate({ name: h.name, sets: h.sets, reps: h.reps, restSec: h.restSec, exerciseId: lib?.id ?? 0 });
  };

  /** 从「我的计划」列表载入二次编辑 */
  const editSaved = (p: GeneratedPlan) => {
    setCRows(p.exercises.map((ex) => newRow({
      exerciseId: ex.exerciseId > 0 ? ex.exerciseId : 0,
      name: ex.name,
      sets: String(ex.sets),
      reps: ex.reps,
      restSec: String(ex.restSec),
    })));
    setCTitle(p.title);
    setEditingMeta({ id: p.id, createdAt: p.createdAt });
    // 这份计划如果已排到未来某天，编辑时默认对准那天
    const assigned = assignments.find((a) => a.plan.id === p.id && a.date >= todayKey());
    setCDate(assigned ? assigned.date : null);
    setSavedOpen(false);
    setSavedToast(false);
    setDegraded(false);
    setCPage(0);
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
      // 正在编辑一份已保存的计划时，沿用原 id 覆盖保存
      id: editingMeta?.id ?? `custom-${Date.now()}`,
      title,
      sessionType: 'custom',
      focus: [],
      durationMin,
      source: 'custom',
      tips: '',
      exercises,
      createdAt: editingMeta?.createdAt ?? Date.now(),
    };
  };

  const customReady = cRows.some((r) => r.name.trim());
  const cDuration = buildCustomPlan()?.durationMin ?? 0;

  const startCustom = () => {
    const p = buildCustomPlan();
    if (p) startPlan(p, cDate);
  };

  const saveCustom = () => {
    const p = buildCustomPlan();
    if (!p) return;
    // 始终存进「我的计划」（列表里可二次编辑）；选了日期则同时排到那天
    savePlan(p);
    if (cDate) assign(cDate, p);
    setSavedToast(true);
    setSavedOpen(true);
  };

  /** 把生成好的计划转成自定义编辑（可改动作/组数/次数）；编辑已保存的计划时保存会覆盖原计划 */
  const editAsCustom = (p: GeneratedPlan) => {
    setCRows(p.exercises.map((ex) => newRow({
      exerciseId: ex.exerciseId > 0 ? ex.exerciseId : 0,
      name: ex.name,
      sets: String(ex.sets),
      reps: ex.reps,
      restSec: String(ex.restSec),
    })));
    setCTitle(p.title);
    setMode('custom');
    setSavedToast(false);
    setDegraded(false);
    // 已保存过的计划（或生成结果尚未保存）都沿用其 id，保存即回写
    setEditingMeta({ id: p.id, createdAt: p.createdAt });
    setCDate(todayKey());
    setCPage(0);
  };

  const pickerList = useMemo(() => {
    const q = pq.trim();
    const list = q ? EXERCISES.filter((e) => e.name.includes(q)) : EXERCISES;
    return list.slice(0, 60);
  }, [pq]);

  const emphOptions = muscle ? EMPHASIS[muscle] ?? [] : [];
  const sched = weekSchedule(profile.daysPerWeek);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Scroll contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>训练计划</Text>
        {mode === 'custom' && editingMeta && cDate ? (
          <Text style={s.editDateT}>{`正在编辑 ${fmtCN(cDate)} 的课表 · 保存后直接更新当天安排`}</Text>
        ) : null}
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
                    <View style={[s.tipsBox, degraded && s.tipsBoxWarn]}>
                      <Text style={[s.tipsT, degraded && { color: C.danger, fontWeight: '700' }]}>
                        {`${degraded ? '⚠︎ ' : '✎ '}${plan.tips}`}
                      </Text>
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

            {/* 安排到哪天：当天或提前排期，也可仅保存 */}
            <View style={{ marginTop: 14 }}>
              <SectionTitle right={<Sub>{cDate ? `将排到 ${fmtCN(cDate)}` : '仅保存，不排期'}</Sub>}>安排到哪天</SectionTitle>
              <Scroll horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                <Chip label="仅保存" selected={cDate === null} onPress={() => setCDate(null)} />
                {Array.from({ length: 14 }, (_, k) => addDays(todayKey(), k)).map((key) => {
                  const wd = weekdayOf(key);
                  const isTrainDay = sched.days.includes(wd);
                  const isOtherMonth = key.slice(0, 7) !== todayKey().slice(0, 7);
                  const label = key === todayKey()
                    ? '今天'
                    : key === addDays(todayKey(), 1)
                      ? '明天'
                      : Number(key.slice(8, 10)) === 1 || (isOtherMonth && Number(key.slice(8, 10)) <= 14)
                        ? `${Number(key.slice(5, 7))}月${Number(key.slice(8, 10))}日`
                        : `${Number(key.slice(8, 10))}日`;
                  return (
                    <Chip
                      key={key}
                      label={isTrainDay ? `${label}·练` : label}
                      selected={cDate === key}
                      onPress={() => setCDate(key)}
                    />
                  );
                })}
              </Scroll>
            </View>

            {/* 动作：整理（列表通览）为主，逐个编辑（大卡片）为辅 */}
            <View style={{ marginTop: 14 }}>
              <SectionTitle>动作</SectionTitle>
              <View style={s.cViewRow}>
                <Sub style={{ flex: 1 }}>{`${cRows.filter((r) => r.name.trim()).length} 个动作 · 约 ${cDuration} 分钟`}</Sub>
                <Press style={[s.cViewBtn, cView === 'list' && s.cViewBtnOn]} onPress={() => setCView('list')}>
                  <Text style={[s.cViewT, cView === 'list' && s.cViewTOn]}>整理</Text>
                </Press>
                <Press style={[s.cViewBtn, cView === 'card' && s.cViewBtnOn]} onPress={() => setCView('card')}>
                  <Text style={[s.cViewT, cView === 'card' && s.cViewTOn]}>逐个编辑</Text>
                </Press>
              </View>

              {cView === 'list' ? (
                <Animated.View entering={FadeInDown.duration(180)} key="clist">
                  {/* 整理模式：紧凑列表，通览全部动作，可排序/删除，点行进卡片细调 */}
                  <Card style={s.cListCard}>
                    {cRows.map((r, i) => (
                      <View key={r.key} style={s.cListRow}>
                        <Press style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => { setCPage(i); setCView('card'); }}>
                          <View style={[s.cIdx, r.exerciseId > 0 && s.cIdxLib]}>
                            <Text style={s.cIdxT}>{i + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.cListName} numberOfLines={1}>{r.name.trim() || '未命名动作'}</Text>
                            <Sub style={{ fontSize: 11 }}>{`${r.sets || 3}×${r.reps || '10'} · 休息${r.restSec || 90}s`}</Sub>
                          </View>
                          <Text style={s.cListEdit}>编辑 ›</Text>
                        </Press>
                        <Press hitSlop={6} disabled={i === 0} onPress={() => moveRow(i, -1)}>
                          <Text style={[s.cListOp, i === 0 && { color: C.lineStrong }]}>↑</Text>
                        </Press>
                        <Press hitSlop={6} disabled={i === cRows.length - 1} onPress={() => moveRow(i, 1)}>
                          <Text style={[s.cListOp, i === cRows.length - 1 && { color: C.lineStrong }]}>↓</Text>
                        </Press>
                        {cRows.length > 1 ? (
                          <Press hitSlop={6} onPress={() => delCRow(i)}>
                            <Text style={s.cListDel}>✕</Text>
                          </Press>
                        ) : null}
                      </View>
                    ))}

                    {historyMoves.length > 0 ? (
                      <View style={{ marginTop: 10 }}>
                        <Sub style={{ fontSize: 11, marginBottom: 6 }}>最近练过（点一下加进计划）</Sub>
                        <Scroll horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                          {historyMoves.map((h) => (
                            <Chip key={h.name} label={`${h.name} ${h.sets}×${h.reps}`} selected={false} onPress={() => tapHistory(h)} />
                          ))}
                        </Scroll>
                      </View>
                    ) : null}

                    <View style={s.cActions}>
                      <Button title="＋ 添加动作" kind="ghost" small onPress={() => createNextRow()} />
                      <Button title="从动作库选" kind="ghost" small onPress={() => { setPq(''); setPickerOpen(true); }} />
                    </View>
                  </Card>
                </Animated.View>
              ) : (
              <Animated.View
                key={cRows[cPage]?.key ?? 'empty'}
                entering={FadeInDown.duration(180)}
                onTouchStart={(e) => { swipeX.current = e.nativeEvent.touches[0]?.pageX ?? null; }}
                onTouchEnd={(e) => {
                  const x0 = swipeX.current;
                  const x1 = e.nativeEvent.changedTouches[0]?.pageX ?? null;
                  swipeX.current = null;
                  if (x0 == null || x1 == null) return;
                  const dx = x1 - x0;
                  if (dx < -44) goCPage(cPage + 1);
                  else if (dx > 44) goCPage(cPage - 1);
                }}
              >
                {(() => {
                  const r = cRows[cPage];
                  const i = Math.min(cPage, cRows.length - 1);
                  if (!r) return null;
                  return (
                    <Card style={s.cCard}>
                      <View style={s.cPageHead}>
                        <View style={[s.cIdx, r.exerciseId > 0 && s.cIdxLib]}>
                          <Text style={s.cIdxT}>{i + 1}</Text>
                        </View>
                        <Text style={s.cPageT}>{`动作 ${i + 1}/${cRows.length}`}</Text>
                        {cRows.length > 1 ? (
                          <Pressable hitSlop={8} style={s.cDelWrap} onPress={() => delCRow(i)}>
                            <Text style={s.cDel}>删除</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      <View style={s.cLibRow}>
                        <Button title="从动作库选" kind="ghost" small onPress={() => { setPq(''); setPickerOpen(true); }} />
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
                      <View style={s.cRowNums}>
                        <NumBox label="组数" value={r.sets} onChange={(v) => updateRow(r.key, { sets: v.replace(/\D/g, '') })} />
                        <NumBox label="次数" value={r.reps} onChange={(v) => updateRow(r.key, { reps: v.replace(/[^\d\-~+一-龥]/g, '') })} />
                        <NumBox label="休息" value={r.restSec} onChange={(v) => updateRow(r.key, { restSec: v.replace(/\D/g, '') })} suffix="s" />
                      </View>

                      {historyMoves.length > 0 ? (
                        <View style={{ marginTop: 12 }}>
                          <Sub style={{ fontSize: 11, marginBottom: 6 }}>最近练过（点一下填入）</Sub>
                          <Scroll horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                            {historyMoves.map((h) => (
                              <Chip key={h.name} label={`${h.name} ${h.sets}×${h.reps}`} selected={false} onPress={() => tapHistory(h)} />
                            ))}
                          </Scroll>
                        </View>
                      ) : null}

                      <View style={s.cNavRow}>
                        <Press disabled={i === 0} onPress={() => goCPage(i - 1)} hitSlop={4}>
                          <Text style={[s.cNavT, i === 0 && { color: C.faint }]}>‹ 上一个</Text>
                        </Press>
                        <View style={s.cDots}>
                          {cRows.map((_, k) => (
                            <View key={k} style={[s.cDot, k === i && s.cDotOn]} />
                          ))}
                        </View>
                        <Press disabled={i === cRows.length - 1} onPress={() => goCPage(i + 1)} hitSlop={4}>
                          <Text style={[s.cNavT, i === cRows.length - 1 && { color: C.faint }]}>下一个 ›</Text>
                        </Press>
                      </View>

                      {i === cRows.length - 1 ? (
                        <View style={{ marginTop: 14 }}>
                          <Button title="＋ 创建下一个动作" onPress={() => createNextRow()} />
                        </View>
                      ) : null}
                    </Card>
                  );
                })()}
              </Animated.View>
              )}
            </View>

            <View style={{ marginTop: 18 }}>
              <Button title="开始训练" onPress={startCustom} disabled={!customReady} />
            </View>
            <View style={s.cActions}>
              <Button
                title={
                  savedToast ? '已保存 ✓'
                    : editingMeta && cDate ? `更新 ${fmtCN(cDate)} 课表`
                    : cDate ? `保存并排到 ${fmtCN(cDate)}`
                    : editingMeta ? '更新这份计划'
                    : '保存到我的计划'
                }
                kind="ghost"
                small
                onPress={saveCustom}
                disabled={!customReady}
              />
              <Button
                title={`我的计划（${savedPlans.length}）`}
                kind="ghost"
                small
                onPress={() => setSavedOpen(true)}
              />
            </View>
            {!customReady ? <Sub style={{ marginTop: 10 }}>至少填写一个动作名称才能开始训练。</Sub> : null}
          </>
        )}
      </Scroll>

      {/* 动作库选择 */}
      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="从动作库选（可连续添加）">
        <TextInput
          style={s.pSearch}
          value={pq}
          onChangeText={setPq}
          placeholder="搜索动作（如：卧推 / 深蹲）"
          placeholderTextColor={C.faint}
        />
        <Scroll style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
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
        </Scroll>
        <View style={{ marginTop: 10 }}>
          <Button title="完成" onPress={() => setPickerOpen(false)} />
        </View>
      </Sheet>

      {/* 我的计划：保存后弹出，点选进行二次编辑 */}
      <Sheet visible={savedOpen} onClose={() => setSavedOpen(false)} title="我的计划（点选进行二次编辑）">
        {savedPlans.length === 0 ? (
          <Sub style={{ padding: 16, textAlign: 'center' }}>还没有保存过计划，编辑好后点「保存」就会出现在这里</Sub>
        ) : (
          <Scroll style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {savedPlans.map((p) => {
              const day = assignments.find((a) => a.plan.id === p.id && a.date >= todayKey());
              return (
                <View key={p.id} style={s.savedRow}>
                  <Press style={{ flex: 1 }} onPress={() => editSaved(p)}>
                    <Text style={s.savedName} numberOfLines={1}>{p.title}</Text>
                    <Sub style={{ fontSize: 11 }}>
                      {`${p.exercises.length}个动作 · ${p.durationMin}分钟 · ${sourceLabel(p.source)}${day ? ` · 已排到${fmtCN(day.date)}` : ''}`}
                    </Sub>
                  </Press>
                  <View style={s.savedDelWrap}>
                    <Button title="删除" kind="danger" small onPress={() => confirmDeletePlan(p)} />
                  </View>
                </View>
              );
            })}
          </Scroll>
        )}
        <View style={{ marginTop: 10 }}>
          <Button title="关闭" kind="ghost" onPress={() => setSavedOpen(false)} />
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
  editDateT: { color: C.accent, fontSize: 13, fontWeight: '700', marginBottom: 4 },
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
  tipsBoxWarn: { backgroundColor: '#F6DBD5', borderColor: 'rgba(192,59,46,0.35)' },
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

  /* 自定义模式：分页编辑 */
  cViewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cViewBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.inkAlpha, backgroundColor: C.card,
  },
  cViewBtnOn: { backgroundColor: C.marker, borderColor: 'rgba(107,90,16,0.4)' },
  cViewT: { color: C.sub, fontSize: 12, fontWeight: '700' },
  cViewTOn: { color: C.markerInk },
  cListCard: { padding: 12, gap: 4 },
  cListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  cListName: { color: C.text, fontSize: 14, fontWeight: '700' },
  cListEdit: { color: C.accent, fontSize: 11, fontWeight: '700' },
  cListOp: { color: C.sub, fontSize: 15, fontWeight: '800', paddingHorizontal: 4 },
  cListDel: { color: C.faint, fontSize: 14, fontWeight: '700', paddingHorizontal: 2 },
  cCard: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.inkAlphaSoft, borderRadius: R.md,
    padding: 14, gap: 10,
  },
  cPageHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cPageT: { color: C.sub, fontSize: 13, fontWeight: '700', flex: 1 },
  cIdx: {
    width: 24, height: 24, borderRadius: 999, backgroundColor: C.inset,
    alignItems: 'center', justifyContent: 'center',
  },
  cIdxLib: { backgroundColor: C.marker },
  cIdxT: { color: C.text, fontSize: 12, fontWeight: '800', fontFamily: FONT.extra },
  cLibRow: { flexDirection: 'row' },
  cName: {
    color: C.text, fontSize: 15, fontWeight: '600',
    borderBottomWidth: 1.5, borderBottomColor: C.line, paddingVertical: 4, paddingHorizontal: 2,
  },
  cDelWrap: { height: 28, justifyContent: 'center', alignItems: 'center' },
  cDel: { color: C.danger, fontSize: 12, fontWeight: '700', lineHeight: 20 },
  cRowNums: { flexDirection: 'row', gap: 10 },
  cNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  cNavT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  cDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  cDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.lineStrong },
  cDotOn: { backgroundColor: C.accent, width: 9, height: 9 },
  numCol: { flex: 1 },
  numLabel: { color: C.sub, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  numBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.inset,
    borderWidth: 1.5, borderColor: C.inkAlpha, borderRadius: R.sm, height: 40, paddingHorizontal: 8,
  },
  numInput: {
    flex: 1, color: C.text, fontSize: 14, fontWeight: '700', fontFamily: FONT.semi,
    paddingVertical: 0, paddingHorizontal: 0, minWidth: 0, textAlign: 'center',
  },
  // 后缀绝对定位，不占输入区宽度——三个数字框的数字都以整框居中，互不偏移
  numSuffix: {
    position: 'absolute', right: 10, top: 0, bottom: 0, lineHeight: 37,
    color: C.sub, fontSize: 12, fontWeight: '600',
  },
  cActions: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },

  /* 我的计划列表（二次编辑） */
  savedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  savedName: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  savedDelWrap: { marginLeft: 8 },

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
