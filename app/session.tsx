import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, FadeInDown, Press, Scroll, Stamp, Sub, haptic } from '../src/components/ui';
import { EQUIP_ZH, EXERCISE_BY_ID } from '../src/data/exercises';
import { dateKey, fmtDur, todayKey } from '../src/lib/date';
import { say, stopSay } from '../src/lib/say';
import { playSound } from '../src/lib/sound';
import { useSessionDraftStore, type DraftSetRow as SetRow } from '../src/store/sessionDraft';
import { useSettingsStore } from '../src/store/settings';
import { lastPerformanceFor, lastSetsFor, useWorkoutsStore } from '../src/store/workouts';
import { C, FONT, R, SH } from '../src/theme';
import type { GeneratedPlan, WorkoutLog } from '../src/types';

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

/** 旧版已保存的计划没有 timed 字段：按次数文案（"40秒/15分钟"）推断；自定义计划写"40秒"也按计时处理 */
function isTimed(ex: { timed?: boolean; reps: string }): boolean {
  return !!ex.timed || /秒|分/.test(ex.reps);
}

/** 大号数字格：两侧 ± 步进（撸铁时单手可点），中间仍可键盘精确输入 */
function StepInput({ value, onChange, step, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  placeholder?: string;
}) {
  const bump = (d: number) => {
    const cur = Number(value) || 0;
    const next = Math.min(9999, Math.max(0, +(cur + d).toFixed(1)));
    onChange(String(next));
  };
  return (
    <View style={s.stepWrap}>
      <Pressable style={s.stepBtn} onPress={() => bump(-step)} hitSlop={4}>
        <Text style={s.stepT}>−</Text>
      </Pressable>
      <TextInput
        style={s.stepInput}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={C.faint}
      />
      <Pressable style={s.stepBtn} onPress={() => bump(step)} hitSlop={4}>
        <Text style={s.stepT}>＋</Text>
      </Pressable>
    </View>
  );
}

export default function SessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string }>();
  const logs = useWorkoutsStore((s) => s.logs);
  const addLog = useWorkoutsStore((s) => s.addLog);
  const draft = useSessionDraftStore((s) => s.draft);
  const saveDraft = useSessionDraftStore((s) => s.save);
  const clearDraft = useSessionDraftStore((s) => s.clear);
  const soundOn = useSettingsStore((s) => s.sound);
  const voiceOn = useSettingsStore((s) => s.voice);

  // 恢复今天的草稿：无 plan 参数时（首页「继续训练」），或再次进入同一份计划时（避免覆盖进行中的进度）
  const paramsPlan = useMemo(() => parsePlan(typeof params.plan === 'string' ? params.plan : undefined), [params.plan]);
  const resumable = !!draft
    && dateKey(new Date(draft.startedAt)) === todayKey()
    && (!paramsPlan || paramsPlan.id === draft.plan.id);
  const resume = resumable ? draft : null;
  const plan = paramsPlan ?? resume?.plan ?? null;

  const startedAt = useRef(resume ? resume.startedAt : Date.now());
  const [elapsed, setElapsed] = useState(0);
  // si 记录这次休息是哪一组触发的，「开始训练」就从那组的下一页继续
  const [rest, setRest] = useState<{ total: number; remain: number; ex: number; si: number } | null>(null);
  // 首次训练的操作提示（当次会话内可关闭）
  const [showHint, setShowHint] = useState(logs.length === 0);
  const pagerRef = useRef<ScrollView>(null);
  const winW = Dimensions.get('window').width;

  const [sets, setSets] = useState<SetRow[][]>(() => {
    if (resume) return resume.sets.map((ex) => ex.map((r) => ({ ...r })));
    if (!plan) return [];
    return plan.exercises.map((ex) => {
      const last = lastPerformanceFor(logs, ex.exerciseId, ex.name);
      const w = last && last.weight > 0 ? String(last.weight) : '';
      return Array.from({ length: ex.sets }, () => ({ weight: w, reps: defaultReps(ex.reps), done: false }));
    });
  });

  // 每组一页：所有动作的组拍平成左右滑动的分页
  const pages = useMemo(
    () => (plan?.exercises ?? []).flatMap((_, ei) => (sets[ei] ?? []).map((__, si) => ({ ei, si }))),
    [plan, sets],
  );
  const [pageIdx, setPageIdx] = useState(() => {
    const i = pages.findIndex((p) => !sets[p.ei]?.[p.si]?.done);
    return i === -1 ? 0 : i;
  });

  const goToPage = (i: number) => {
    const c = Math.max(0, Math.min(pages.length - 1, i));
    setPageIdx(c);
    pagerRef.current?.scrollTo({ x: c * winW, animated: true });
  };

  // 进场定位到第一个没练完的组
  useEffect(() => {
    const i = pages.findIndex((p) => !sets[p.ei]?.[p.si]?.done);
    const target = (i === -1 ? 0 : i) * winW;
    const t = setTimeout(() => pagerRef.current?.scrollTo({ x: target, animated: false }), 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // 退出训练页时停掉未播完的语音
  useEffect(() => () => stopSay(), []);

  // 组记录实时落盘：中途退出 / App 被杀后可从首页恢复（至少完成一组才存，随手看看不会留下草稿）
  useEffect(() => {
    if (!plan) return;
    const done = sets.reduce((a, ex) => a + ex.filter((r) => r.done).length, 0);
    if (done > 0) saveDraft({ plan, sets, startedAt: startedAt.current });
  }, [plan, sets, saveDraft]);

  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => {
      setRest((r) => {
        if (!r || r.remain <= 0) return r; // 停在 0，等「多休息一分钟 / 开始训练」
        if (r.remain <= 1) {
          haptic('success');
          if (soundOn) playSound('ding');
          return { ...r, remain: 0 };
        }
        return { ...r, remain: r.remain - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [rest !== null, soundOn]);

  // 语音搭子：剩 30/10 秒播报，结束时语音收尾（提示音之外的「动嘴」版）
  useEffect(() => {
    if (!rest || !voiceOn || rest.remain <= 0) return;
    if (rest.remain === 30 && rest.total > 40) say('还有三十秒');
    else if (rest.remain === 10 && rest.total > 15) say('还有十秒');
  }, [rest?.remain, rest?.total, voiceOn]);

  useEffect(() => {
    if (rest && voiceOn && rest.remain === 0) say('休息结束，开始下一组');
  }, [rest?.remain, voiceOn]);

  // 最后 3 秒逐秒轻震 + 轻音，倒计时结束的「叮」在上面触发
  useEffect(() => {
    if (rest && rest.remain <= 3 && rest.remain > 0) {
      haptic('light');
      if (soundOn) playSound('tick');
    }
  }, [rest?.remain, soundOn]);

  if (!plan || plan.exercises.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Sub>计划数据无效</Sub>
          <Press style={s.backChip} onPress={() => router.back()}>
            <Text style={s.backChipT}>返回</Text>
          </Press>
        </View>
      </SafeAreaView>
    );
  }

  const totalDone = sets.reduce((a, ex) => a + ex.filter((r) => r.done).length, 0);
  const totalSets = sets.reduce((a, ex) => a + ex.length, 0);
  // 计时动作（秒数当次数）不计入容量：weight×秒数没有训练学意义
  const volume = sets.reduce((a, ex, ei) => (
    isTimed(plan.exercises[ei])
      ? a
      : a + ex.reduce((b, r) => (r.done ? b + (Number(r.weight) || 0) * (Number(r.reps) || 0) : b), 0)
  ), 0);

  const toggleSet = (ei: number, si: number) => {
    const willDone = !sets[ei][si].done;
    haptic(willDone ? 'medium' : 'light');
    setSets((prev) => prev.map((ex, i) => {
      if (i !== ei) return ex;
      return ex.map((r, j) => (j !== si ? r : { ...r, done: willDone }));
    }));
    if (willDone) {
      const exRest = plan.exercises[ei].restSec;
      setRest({ total: exRest, remain: exRest, ex: ei, si });
      // 自动滑到下一组（最后一组则停留）
      const pi = pages.findIndex((p) => p.ei === ei && p.si === si);
      if (pi >= 0 && pi < pages.length - 1) goToPage(pi + 1);
    } else {
      // 取消打卡时同步停掉已启动的休息计时
      setRest(null);
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
        { text: '放弃', style: 'destructive', onPress: () => { clearDraft(); router.back(); } },
      ]);
      return;
    }
    const entries = plan.exercises
      .map((ex, ei) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        timed: isTimed(ex) || undefined,
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
    clearDraft();
    haptic('success');
    if (voiceOn) say('训练完成，今天也辛苦了');
    router.replace({ pathname: '/summary', params: { id: log.id } });
  };

  const quit = () => {
    if (totalDone > 0) {
      Alert.alert('结束训练？', `已完成的 ${totalDone} 组可以保留进度，之后从首页继续。`, [
        { text: '继续训练', style: 'cancel' },
        { text: '保留进度并退出', onPress: () => router.back() },
        { text: '不保存退出', style: 'destructive', onPress: () => { clearDraft(); router.back(); } },
      ]);
    } else {
      clearDraft();
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
        <Press
          style={s.warmBtn}
          onPress={() => router.push({ pathname: '/warmup', params: { focus: plan.focus.join(',') } })}
        >
          <Text style={s.warmT}>热身</Text>
        </Press>
        <Press style={s.finishBtn} onPress={finish}>
          <Text style={s.finishT}>完成</Text>
        </Press>
      </View>

      {/* 进度条：当前动作 / 整体组进度，圆点可点跳动作 */}
      <View style={s.progRow}>
        <Text style={s.progT}>{`动作 ${(pages[pageIdx]?.ei ?? 0) + 1}/${plan.exercises.length}`}</Text>
        <View style={s.progDots}>
          {plan.exercises.map((_, i) => {
            const allDone = sets[i].length > 0 && sets[i].every((r) => r.done);
            const cur = pages[pageIdx]?.ei === i;
            return (
              <Press key={i} hitSlop={4} onPress={() => { const pi = pages.findIndex((p) => p.ei === i); if (pi >= 0) goToPage(pi); }}>
                <View style={[s.dot, allDone && s.dotDone, cur && s.dotCur]} />
              </Press>
            );
          })}
        </View>
        <Sub style={{ fontSize: 11 }}>{`${totalDone}/${totalSets} 组`}</Sub>
      </View>

      {showHint ? (
        <View style={s.hintBox}>
          <View style={{ flex: 1 }}>
            <Text style={s.hintT}>第一次训练看这里</Text>
            <Text style={s.hintSub}>左右滑动切换组 → 填好重量×次数 → 点「完成这一组」自动开始休息；倒计时结束点「开始训练」继续下一组。中途退出进度也会保留。</Text>
          </View>
          <Pressable hitSlop={10} onPress={() => setShowHint(false)}>
            <Text style={s.hintClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      {sets.every((ex) => ex.length > 0 && ex.every((r) => r.done)) ? (
        <View style={s.allDoneStrip}>
          <Text style={s.allDoneT}>🎉 全部动作完成！点右上角「完成」收尾。</Text>
        </View>
      ) : null}

      {/* 每组一页，左右滑动切换 */}
      <Scroll
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / winW);
          if (i >= 0 && i < pages.length && i !== pageIdx) setPageIdx(i);
        }}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / winW);
          if (i >= 0 && i < pages.length && i !== pageIdx) setPageIdx(i);
        }}
        scrollEventThrottle={64}
      >
        {pages.map(({ ei, si }, pi) => {
          const ex = plan.exercises[ei];
          const row = sets[ei][si];
          const meta = EXERCISE_BY_ID.get(ex.exerciseId);
          const lastSets = lastSetsFor(logs, ex.exerciseId, ex.name);
          const timed = isTimed(ex);
          return (
            <View key={`${ei}-${si}`} style={{ width: winW, padding: 16 }}>
              <Card style={[s.setCard, row.done && s.setCardDone]}>
                <View style={s.setNoRow}>
                  <Text style={s.setNoT}>{`第 ${si + 1} 组 · 共 ${sets[ei].length} 组`}</Text>
                  {row.done ? <Stamp label="已完成" fontSize={9} rotate={-6} /> : null}
                </View>
                <Text style={s.exT}>{ex.name}</Text>
                <Sub>
                  {`${ex.sets}组 × ${ex.reps} · 休息${ex.restSec}s${meta ? ` · ${EQUIP_ZH[meta.equipment]}` : ''}`}
                </Sub>
                {lastSets ? (
                  <Sub>{`上次 ${lastSets.sets.map((st) => (st.weight > 0 ? `${st.weight}kg×${st.reps}${timed ? '秒' : ''}` : `${st.reps}${timed ? '秒' : '次'}`)).join(' · ')}`}</Sub>
                ) : null}
                {ex.note ? <Sub style={{ marginTop: 4 }}>{ex.note}</Sub> : null}

                <View style={s.bigRow}>
                  {timed ? (
                    <>
                      <View style={s.bigField}>
                        <Text style={s.bigLabel}>秒数</Text>
                        <StepInput value={row.reps} onChange={(v) => editSet(ei, si, 'reps', v)} step={5} placeholder="0" />
                      </View>
                      <View style={s.bigField}>
                        <Text style={s.bigLabel}>负重 kg</Text>
                        <StepInput value={row.weight} onChange={(v) => editSet(ei, si, 'weight', v)} step={2.5} placeholder="可选" />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={s.bigField}>
                        <Text style={s.bigLabel}>重量 kg</Text>
                        <StepInput value={row.weight} onChange={(v) => editSet(ei, si, 'weight', v)} step={2.5} placeholder="0" />
                      </View>
                      <View style={s.bigField}>
                        <Text style={s.bigLabel}>次数</Text>
                        <StepInput value={row.reps} onChange={(v) => editSet(ei, si, 'reps', v)} step={1} placeholder="0" />
                      </View>
                    </>
                  )}
                </View>

                <View style={{ marginTop: 18 }}>
                  <Button title={row.done ? '已完成 ✓ 点按取消' : '完成这一组'} onPress={() => toggleSet(ei, si)} />
                </View>

                <View style={s.pageNavRow}>
                  <Press disabled={pi === 0} onPress={() => goToPage(pi - 1)} hitSlop={4}>
                    <Text style={[s.pageNavT, pi === 0 && { color: C.faint }]}>‹ 上一组</Text>
                  </Press>
                  <View style={s.pageDots}>
                    {sets[ei].map((r, k) => (
                      <View key={k} style={[s.pDot, k === si && s.pDotOn, r.done && s.pDotDone]} />
                    ))}
                  </View>
                  <Press disabled={pi === pages.length - 1} onPress={() => goToPage(pi + 1)} hitSlop={4}>
                    <Text style={[s.pageNavT, pi === pages.length - 1 && { color: C.faint }]}>下一组 ›</Text>
                  </Press>
                </View>

                <Press style={s.addSet} onPress={() => addSet(ei)}>
                  <Text style={s.addSetT}>＋ 加一组</Text>
                </Press>
              </Card>
            </View>
          );
        })}
      </Scroll>

      {rest && (() => {
        const ex = plan.exercises[rest.ex];
        const remaining = sets[rest.ex].filter((r) => !r.done).length;
        const nextEx = plan.exercises[rest.ex + 1];
        const last = lastPerformanceFor(logs, ex.exerciseId, ex.name);
        const ended = rest.remain <= 0;
        const urgent = !ended && rest.remain <= 3;
        // 从触发这次休息的那组的下一页继续
        const startNext = () => {
          setRest(null);
          const pi = pages.findIndex((p) => p.ei === rest.ex && p.si === rest.si);
          if (pi >= 0 && pi < pages.length - 1) goToPage(pi + 1);
        };
        const nextTip = remaining > 0
          ? `「${ex.name}」还剩 ${remaining} 组`
          : nextEx
            ? `下一个动作：${nextEx.name} ${nextEx.sets}×${nextEx.reps}`
            : '全部动作完成，收尾加油！';
        return (
          <Animated.View entering={FadeInDown.duration(260)} style={s.restBar}>
            {ended ? (
              <>
                <View style={s.restRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.restT}>休息结束！</Text>
                    <Text style={s.restInfoSub}>{nextTip}</Text>
                  </View>
                </View>
                <View style={s.restBtnRow}>
                  <View style={{ flex: 1 }}>
                    <Button title="多休息一分钟" kind="ghost" onPress={() => setRest((r) => (r ? { ...r, remain: r.remain + 60, total: r.total + 60 } : r))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="开始训练" onPress={startNext} />
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={s.restRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.restT, urgent && { color: C.danger }]}>
                      {urgent ? `马上开始 · ${rest.remain}s` : `组间休息 ${rest.remain}s`}
                    </Text>
                    <View style={s.restTrack}>
                      <View
                        style={[
                          s.restFill,
                          urgent && { backgroundColor: C.danger },
                          { width: `${(1 - rest.remain / rest.total) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Press style={s.restBtn} onPress={() => setRest((r) => (r ? { ...r, remain: r.remain + 30, total: r.total + 30 } : r))}>
                    <Text style={s.restBtnT}>+30s</Text>
                  </Press>
                  <Press style={[s.restBtn, s.restBtnSkip]} onPress={startNext}>
                    <Text style={[s.restBtnT, { color: C.sub }]}>跳过</Text>
                  </Press>
                </View>
                <View style={s.restInfo}>
                  <Text style={s.restInfoT}>
                    {last ? `上次 ${last.weight}kg×${last.reps} · ` : ''}目标 {ex.reps}
                    {isTimed(ex) ? '秒' : '次'}
                  </Text>
                  <Text style={s.restInfoSub}>{nextTip}</Text>
                </View>
              </>
            )}
          </Animated.View>
        );
      })()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  backChip: { backgroundColor: C.accent, borderRadius: R.md, paddingHorizontal: 20, paddingVertical: 10 },
  backChipT: { color: C.onAccent, fontWeight: '800' },
  head: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1.5, borderBottomColor: C.inkAlphaSoft, backgroundColor: C.card, gap: 12,
  },
  closeT: { color: C.sub, fontSize: 20, fontWeight: '700' },
  headT: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  finishBtn: {
    backgroundColor: C.accent, borderRadius: R.sm, paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1.5, borderColor: C.accentDeep, ...SH.sm,
  },
  finishT: { color: C.onAccent, fontWeight: '800', fontSize: 14 },
  warmBtn: {
    borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1.5, borderColor: C.inkAlpha,
  },
  warmT: { color: C.sub, fontWeight: '700', fontSize: 13 },
  exT: { color: C.text, fontSize: 21, fontWeight: '800', marginBottom: 3, marginTop: 6 },
  // 每组一页的大卡片
  setCard: { padding: 20 },
  setCardDone: { backgroundColor: '#FBF3D5', borderColor: 'rgba(107,90,16,0.28)' },
  setNoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  setNoT: { color: C.accent, fontSize: 15, fontWeight: '700', fontFamily: FONT.hand, lineHeight: 20 },
  bigRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  bigField: { flex: 1, gap: 6 },
  bigLabel: { color: C.sub, fontSize: 12, fontWeight: '700' },
  pageNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  pageNavT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  pageDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  pDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.lineStrong },
  pDotOn: { backgroundColor: C.accent, width: 9, height: 9 },
  pDotDone: { backgroundColor: C.good },
  stepWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlpha, borderRadius: R.sm,
    height: 56, paddingHorizontal: 4,
  },
  stepBtn: { width: 34, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  stepT: { color: C.accent, fontSize: 22, fontWeight: '900', fontFamily: FONT.extra },
  stepInput: { flex: 1, color: C.text, textAlign: 'center', fontSize: 20, fontWeight: '800', paddingVertical: 0, paddingHorizontal: 0, minWidth: 0 },
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EAF1E4',
    borderWidth: 1.5, borderColor: 'rgba(62,142,78,0.35)', borderRadius: R.md, padding: 12,
  },
  hintT: { color: C.good, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  hintSub: { color: C.sub, fontSize: 12, lineHeight: 17 },
  hintClose: { color: C.faint, fontSize: 15, fontWeight: '700' },
  // 进度条（圆点可点跳动作）
  progRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: C.card, borderBottomWidth: 1.5, borderBottomColor: C.inkAlphaSoft,
  },
  progT: { color: C.text, fontSize: 12, fontWeight: '800', fontFamily: FONT.extra },
  progDots: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: C.lineStrong },
  dotDone: { backgroundColor: C.good },
  dotCur: { backgroundColor: C.accent, width: 10, height: 10 },
  allDoneStrip: {
    backgroundColor: '#FBF3D5', borderWidth: 1.5, borderColor: 'rgba(107,90,16,0.28)',
    borderRadius: R.md, paddingVertical: 8, paddingHorizontal: 14, marginHorizontal: 16, marginTop: 8,
  },
  allDoneT: { color: C.text, fontSize: 13, fontWeight: '800' },
  addSet: { marginTop: 8, alignItems: 'center', paddingVertical: 8, borderRadius: R.sm, backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlphaSoft, borderStyle: 'dashed' },
  addSetT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  restBar: {
    position: 'absolute', left: 12, right: 12, bottom: 16,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.accent, borderRadius: R.lg,
    gap: 10, padding: 14, ...SH.lg,
  },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restT: { color: C.accent, fontSize: 15, fontWeight: '800', marginBottom: 7 },
  restTrack: { height: 6, backgroundColor: C.inset, borderRadius: 99, overflow: 'hidden', borderWidth: 1, borderColor: C.inkAlphaSoft },
  restFill: { height: 6, backgroundColor: C.accent, borderRadius: 99 },
  restBtn: {
    borderWidth: 1.5, borderColor: C.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  restBtnSkip: { borderColor: C.inkAlpha },
  restBtnT: { color: C.accent, fontSize: 12, fontWeight: '700' },
  restInfo: { borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed', paddingTop: 9 },
  restInfoT: { color: C.text, fontSize: 13, fontWeight: '700', fontFamily: FONT.semi },
  restInfoSub: { color: C.sub, fontSize: 12, marginTop: 3 },
  restBtnRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
});
