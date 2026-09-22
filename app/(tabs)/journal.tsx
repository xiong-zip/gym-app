import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { JournalMini } from '../../src/components/JournalMini';
import { MonthCalendar } from '../../src/components/MonthCalendar';
import { HeatCalendar } from '../../src/components/HeatCalendar';
import { StrengthChart } from '../../src/components/StrengthChart';
import { Animated, Button, Card, Chip, NumberInput, Press, Scroll, SectionTitle, Sheet, Stamp, Stat, Sub, stagger } from '../../src/components/ui';
import { MUSCLE_ZH } from '../../src/data/exercises';
import { addDays, fmtCN, fmtDur, todayKey, weekdayOf } from '../../src/lib/date';
import { attachAiName, attachCutout, tiltOf } from '../../src/lib/photoSticker';
import { progressByExercise, volumeOfLog } from '../../src/lib/review';
import { seasonOf, seasonStickerFor } from '../../src/lib/season';
import { shareViewShot } from '../../src/lib/shot';
import { useDietStore } from '../../src/store/diet';
import { useJournalStore } from '../../src/store/journal';
import { useMetricsStore } from '../../src/store/metrics';
import { useScheduleStore } from '../../src/store/schedule';
import { useSettingsStore } from '../../src/store/settings';
import { useWorkoutsStore } from '../../src/store/workouts';
import { C, FONT, R, SH } from '../../src/theme';
import type { JournalPhoto } from '../../src/types';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const pad = (n: number) => String(n).padStart(2, '0');

/** 贴纸展示盒：不同照片等比缩放，墙上视觉尺寸一致 */
const STICKER_BOX = 108;
function stickerSize(p: JournalPhoto) {
  const w = p.cutoutW || 1;
  const h = p.cutoutH || 1;
  const k = Math.min(STICKER_BOX / w, STICKER_BOX / h);
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

export default function JournalScreen() {
  const router = useRouter();
  const entries = useJournalStore((s) => s.entries);
  const removeEntry = useJournalStore((s) => s.remove);
  const addEntry = useJournalStore((s) => s.add);
  const updateEntry = useJournalStore((s) => s.update);
  const logs = useWorkoutsStore((s) => s.logs);
  const dietLogs = useDietStore((s) => s.logs);
  const metrics = useMetricsStore((s) => s.entries);
  const addMetric = useMetricsStore((s) => s.add);
  const assignments = useScheduleStore((s) => s.assignments);

  const now = new Date();
  // 首页「本周安排」点某天跳转过来时带的日期；用完即清，避免之后再直接点 Tab 仍停在那一天
  const params = useLocalSearchParams<{ date?: string }>();
  const jumpDate = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : null;
  const [cursor, setCursor] = useState(
    jumpDate
      ? { y: +jumpDate.slice(0, 4), m: +jumpDate.slice(5, 7) - 1 }
      : { y: now.getFullYear(), m: now.getMonth() },
  );
  const [sel, setSel] = useState(jumpDate ?? todayKey());

  useEffect(() => {
    if (!params.date) return;
    if (jumpDate && jumpDate !== sel) {
      setSel(jumpDate);
      setCursor({ y: +jumpDate.slice(0, 4), m: +jumpDate.slice(5, 7) - 1 });
    }
    router.setParams({ date: undefined });
  }, [params.date]);
  const [wSheet, setWSheet] = useState(false);
  const [wFor, setWFor] = useState(todayKey()); // 这次记体重写到哪一天
  const [wInput, setWInput] = useState('');
  // 每页手帐的可截图视图（分享图片用）
  const shotRefs = useRef<Record<string, View | null>>({});
  // 照片墙：添加照片（AI 识别名称 + 主体抠图贴纸）
  const ai = useSettingsStore((s) => s.ai);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [busy, setBusy] = useState<string[]>([]);

  const shareEntry = (id: string, title: string) => {
    void shareViewShot({ current: shotRefs.current[id] ?? null }, `${title} · 健身搭子手帐`);
  };

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
  const monthVolume = monthLogs.reduce((a, l) => a + volumeOfLog(l), 0);

  // 打卡热力：近 90 天按日容量上色，点格子跳到那天
  const heatData: Record<string, number> = {};
  for (const l of logs) heatData[l.date] = (heatData[l.date] ?? 0) + volumeOfLog(l);
  const heatDays = new Set(logs.filter((l) => l.date >= addDays(today, -90)).map((l) => l.date)).size;

  // 力量进步：各动作估算 1RM 曲线（练得最多的排前面）
  const progresses = useMemo(() => progressByExercise(logs), [logs]);
  const topProgress = useMemo(
    () => [...progresses].sort((a, b) => b.points.length - a.points.length).slice(0, 8),
    [progresses],
  );
  const [strKey, setStrKey] = useState<string | null>(null);
  const strSel = topProgress.find((p) => p.key === strKey) ?? topProgress[0] ?? null;
  const season = seasonOf();

  const delEntry = (id: string) => {
    Alert.alert('删除这页手帐？', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeEntry(id) },
    ]);
  };

  const saveWeight = () => {
    const w = Number(wInput);
    if (!w || w < 30 || w > 250) return;
    addMetric({ id: `m-${Date.now()}`, date: wFor, weightKg: +w.toFixed(1) });
    setWSheet(false);
    setWInput('');
  };

  const openWeight = (date: string) => {
    const cur = metrics.find((m) => m.date === date);
    setWFor(date);
    setWInput(cur ? String(cur.weightKg) : '');
    setWSheet(true);
  };

  /* ---------- 照片墙：添加照片（AI 识别名称） + 长按删除 ---------- */

  const dayPhotos: JournalPhoto[] = dayEntries.flatMap((e) => e.photos ?? []);
  const canvasEntries = dayEntries.filter((e) => (e.stickers?.length ?? 0) > 0 || (e.doodles?.length ?? 0) > 0 || !!e.note || !!e.title);

  const pickPhotos = async (fromCamera: boolean) => {
    if (addingPhoto) return;
    setAddingPhoto(true);
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.55, base64: true, allowsEditing: false };
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true });
      if (res.canceled) return;
      // 先立刻上图，抠图与 AI 命名在后台补（等待期间照片墙不空着）
      const added: JournalPhoto[] = res.assets.map((asset) => ({
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        uri: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
        name: '照片',
      }));
      if (added.length) {
        addPhotos(added);
        added.forEach((p) => { void runPhotoJobs(p.id, p.uri); });
      }
    } catch {
      // 取消或权限拒绝时静默
    } finally {
      setAddingPhoto(false);
    }
  };

  /** 后台处理一张新照片：抠成贴纸 + AI 起名（各自完成即回填，互不阻塞） */
  const runPhotoJobs = async (id: string, uri: string): Promise<void> => {
    setBusy((arr) => [...arr, id]);
    const useAI = ai.enabled && !!ai.apiKey;
    await Promise.all([
      attachCutout(id, uri),
      useAI ? attachAiName(id, uri, ai) : Promise.resolve(),
    ]);
    setBusy((arr) => arr.filter((x) => x !== id));
  };

  // 老照片（没有 cutoutTried 标记）进入视野时补一次抠图：不用重拍也能变成贴纸
  const queued = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isToday) return;
    const pending = dayPhotos.filter((p) => !p.cutoutTried && !p.cutoutUri && !queued.current.has(p.id));
    if (!pending.length) return;
    pending.forEach((p) => queued.current.add(p.id));
    void (async () => {
      for (const p of pending) await runPhotoJobs(p.id, p.uri);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, dayPhotos.map((p) => p.id).join(',')]);

  const addPhotos = (photos: JournalPhoto[]) => {
    const target = entries.find((e) => e.date === sel && (e.photos?.length ?? 0) > 0 && (e.stickers?.length ?? 0) === 0 && (e.doodles?.length ?? 0) === 0 && !e.note && !e.title && !e.statsText);
    if (target) {
      updateEntry({ ...target, photos: [...(target.photos ?? []), ...photos] });
    } else {
      addEntry({
        id: `j-${Date.now()}`,
        date: sel,
        kind: 'free',
        title: '',
        note: '',
        stickers: [],
        doodles: [],
        photos,
        createdAt: Date.now(),
      });
    }
  };

  const delPhoto = (photo: JournalPhoto) => {
    Alert.alert('删除这张照片？', photo.name, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const host = entries.find((e) => e.photos?.some((p) => p.id === photo.id));
          if (!host) return;
          const rest = (host.photos ?? []).filter((p) => p.id !== photo.id);
          const empty = rest.length === 0 && (host.stickers?.length ?? 0) === 0 && (host.doodles?.length ?? 0) === 0 && !host.note && !host.title && !host.statsText;
          if (empty) removeEntry(host.id);
          else updateEntry({ ...host, photos: rest });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Scroll contentContainerStyle={s.body}>
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

        {/* 体重趋势卡已移到首页统计卡内 */}

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
                    const volume = volumeOfLog(l);
                return (
                  <View key={l.id} style={s.logBox}>
                    <View style={s.logHead}>
                      <Text style={s.logT}>{l.title}</Text>
                      <Stamp label="已完成" fontSize={8} rotate={-6} />
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
                    {isToday ? (
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
                  <View style={[s.logAction, { flexDirection: 'row', gap: 10 }]}>
                    <Button
                      title="开始训练"
                      small
                      onPress={() => router.push({ pathname: '/session', params: { plan: encodeURIComponent(JSON.stringify(dayPlan)) } })}
                    />
                    <Button
                      title="编辑课表"
                      kind="ghost"
                      small
                      onPress={() => router.push({ pathname: '/(tabs)/plans', params: { editDate: sel } })}
                    />
                  </View>
                ) : null}
              </View>
            ) : isToday ? (
              <Press hitSlop={8} onPress={() => router.navigate('/')}>
                <Text style={s.linkT}>今天还没有训练，去首页开始吧 ›</Text>
              </Press>
            ) : (
              <Sub>这天没有训练安排或记录</Sub>
            )}
          </Card>
        </Animated.View>

        {/* 当天手帐 */}
        <Animated.View entering={stagger(3)}>
          <Card style={s.block}>
            <View style={s.blockHead}>
              <Text style={s.blockT}>📷 手帐</Text>
              {dayPhotos.length > 0 ? (
                <Sub>
                  {busy.length > 0 ? `✂️ 抠图中 ${busy.length} 张…` : `${dayPhotos.length} 张 · 长按可删除`}
                </Sub>
              ) : null}
            </View>

            {/* 照片墙：抠图成功后按贴纸展示（nosh 风），长按删除 */}
            {dayPhotos.length > 0 ? (
              <View style={s.photoGrid}>
                {dayPhotos.map((p) => (
                  <Pressable key={p.id} onLongPress={() => isToday && delPhoto(p)} delayLongPress={400}>
                    {p.cutoutUri ? (
                      <View style={s.stickerCell}>
                        <View style={s.stickerBox}>
                          <Image
                            source={{ uri: p.cutoutUri }}
                            style={[stickerSize(p), { transform: [{ rotate: `${tiltOf(p.id)}deg` }] }]}
                            resizeMode="contain"
                          />
                        </View>
                        <Text style={s.stickerName} numberOfLines={1}>{p.name}</Text>
                      </View>
                    ) : (
                      <View style={s.photoCard}>
                        <Image source={{ uri: p.uri }} style={s.photoImg} resizeMode="cover" />
                        <Text style={s.photoSeason}>{seasonStickerFor(p.id, season)}</Text>
                        <View style={s.photoNameTag}>
                          <Text style={s.photoNameT} numberOfLines={1}>
                            {busy.includes(p.id) ? '✂️ 抠图中…' : p.name}
                          </Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* 旧版画布手帐兼容显示 */}
            {canvasEntries.map((e) => (
              <View key={e.id} style={s.entry}>
                <View style={s.entryHead}>
                  <Text style={s.entryTitle}>{e.title}</Text>
                  <View style={s.entryActions}>
                    <Press hitSlop={8} onPress={() => shareEntry(e.id, e.title)}>
                      <Text style={s.editT}>分享</Text>
                    </Press>
                    {isToday ? (
                      <>
                        <Press hitSlop={8} onPress={() => router.push({ pathname: '/plog', params: { id: e.id } })}>
                          <Text style={s.editT}>编辑</Text>
                        </Press>
                        <Press hitSlop={8} onPress={() => delEntry(e.id)}>
                          <Text style={s.delT}>✕</Text>
                        </Press>
                      </>
                    ) : null}
                  </View>
                </View>
                <View
                  ref={(el) => { shotRefs.current[e.id] = el; }}
                  collapsable={false}
                  style={{ backgroundColor: C.bg, borderRadius: 10, padding: 6 }}
                >
                  <JournalMini entry={e} />
                </View>
                <Text style={s.foot}>{fmtCN(e.date)}</Text>
              </View>
            ))}

            {dayPhotos.length === 0 && canvasEntries.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyPolaroid}>
                  <Text style={s.emptyEmoji}>📷</Text>
                </View>
                {isToday ? (
                  <>
                    <Text style={s.mascotT}>🏋️ 铁铁：拍张照贴进来吧！</Text>
                    <Sub style={{ textAlign: 'center' }}>练完拍张照、吃得好看拍一张，AI 帮你写名称</Sub>
                  </>
                ) : (
                  <Sub style={{ textAlign: 'center' }}>这天没有手帐记录</Sub>
                )}
              </View>
            ) : null}

            {isToday ? (
              <View style={s.addPhotoRow}>
                <Button
                  title="＋ 添加照片"
                  onPress={() => pickPhotos(false)}
                  disabled={addingPhoto}
                />
                <Sub style={{ marginTop: 8 }}>自动抠成白边贴纸 + AI 起名，几秒后自动完成</Sub>
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
              <Press style={s.wBtn} onPress={() => openWeight(sel)}>
                <Text style={s.wBtnT}>{dayWeight ? '改体重' : '记体重'}</Text>
              </Press>
            </View>
          </Card>
        </Animated.View>

        {/* 分析区放在当天内容之后：先看今天，再看趋势 */}
        <View style={s.sectionHead}>
          <Text style={s.sectionHeadT}>趋势与纪录</Text>
          <Sub>看长期变化时才往下翻</Sub>
        </View>

        <Animated.View entering={stagger(5)}>
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

        {/* 打卡热力：近 90 天一眼看清节奏 */}
        <Animated.View entering={stagger(5)}>
          <Card style={s.heatCard}>
            <View style={s.blockHead}>
              <Text style={s.blockT}>🔥 打卡热力</Text>
              <Sub>{`近 90 天练了 ${heatDays} 天`}</Sub>
            </View>
            <HeatCalendar data={heatData} selected={sel} onSelect={setSel} weeks={13} />
          </Card>
        </Animated.View>

        {/* 力量进步：各动作估算 1RM 曲线 */}
        <Animated.View entering={stagger(6)}>
          <Card style={s.block}>
            <View style={s.blockHead}>
              <Text style={s.blockT}>📈 力量进步</Text>
              {strSel ? <Sub>{`PR ${strSel.best}kg · ${fmtCN(strSel.bestDate)}`}</Sub> : null}
            </View>
            {topProgress.length > 0 && strSel ? (
              <>
                <Scroll horizontal style={{ flexGrow: 0, marginBottom: 6 }} contentContainerStyle={s.strChipRow}>
                  {topProgress.map((p) => (
                    <Chip key={p.key} label={p.name} selected={p.key === strSel.key} onPress={() => setStrKey(p.key)} />
                  ))}
                </Scroll>
                {strSel.points.length >= 2 ? (
                  <>
                    <StrengthChart points={strSel.points} />
                    <Sub>{`首次 ${strSel.first}kg → 最新 ${strSel.points[strSel.points.length - 1].value}kg · 共 ${strSel.points.length} 次训练（按 Epley 公式估算 1RM）`}</Sub>
                  </>
                ) : (
                  <Sub>{`「${strSel.name}」目前只有 1 次带重量的记录，多练几次就能看到曲线`}</Sub>
                )}
              </>
            ) : (
              <Sub>训练时把重量填上，这里会出现每个动作的 1RM 进步曲线与新纪录。</Sub>
            )}
          </Card>
        </Animated.View>
      </Scroll>

      <Sheet visible={wSheet} onClose={() => setWSheet(false)} title={`${fmtCN(wFor)}的体重`}>
        <View style={{ gap: 12 }}>
          {(() => {
            const cur = metrics.find((m) => m.date === wFor);
            return cur ? <Sub>{`当前记录：${cur.weightKg}kg`}</Sub> : null;
          })()}
          <NumberInput
            value={wInput}
            onChange={setWInput}
            suffix="kg"
            placeholder={`如 ${metrics.find((m) => m.date === wFor)?.weightKg ?? 70}`}
          />
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
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: {
    width: 150, backgroundColor: '#FFFDF6', borderRadius: 10,
    borderWidth: 1.5, borderColor: C.inkAlphaSoft, paddingBottom: 8, ...SH.sm,
  },
  photoImg: { width: '100%', height: 110, borderRadius: 8 },
  photoSeason: { position: 'absolute', top: 3, right: 6, fontSize: 15 },
  // nosh 风贴纸单元：透明 PNG 直接落在纸面上，只有一点点摆放角度
  stickerCell: { width: 128, alignItems: 'center', paddingTop: 4, paddingBottom: 2 },
  stickerBox: { height: STICKER_BOX, alignItems: 'center', justifyContent: 'center' },
  stickerName: {
    marginTop: 4, color: C.text, fontSize: 14, fontFamily: FONT.hand, fontWeight: '700',
    maxWidth: 122, textAlign: 'center',
  },
  photoNameTag: { alignItems: 'center', paddingTop: 5 },
  photoNameT: { color: C.text, fontSize: 13, fontWeight: '700', fontFamily: FONT.semi },
  addPhotoRow: { marginTop: 12 },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  entryTitle: { color: C.text, fontSize: 14, fontWeight: '700', flex: 1 },
  entryActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  editT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  delT: { color: C.faint, fontSize: 15, fontWeight: '700' },
  foot: { color: C.faint, fontSize: 11, marginTop: 6, fontWeight: '600' },
  sectionHeadT: { color: C.text, fontSize: 15, fontWeight: '800' },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dataItem: { flex: 1 },
  dataV: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 3, fontFamily: FONT.extra },
  linkT: { color: C.accent, fontSize: 12, fontWeight: '700' },
  heatCard: { paddingVertical: 14 },
  strChipRow: { gap: 8, paddingVertical: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  wBtn: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  wBtnT: { color: C.accent, fontSize: 12, fontWeight: '800' },
});
