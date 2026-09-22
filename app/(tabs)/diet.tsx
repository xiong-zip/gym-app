import { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Bar, Button, Card, Chip, Press, Ring, Scroll, SectionTitle, Sticker, Sub, Tape, stagger } from '../../src/components/ui';
import { FOOD_CATS, FOODS } from '../../src/data/foods';
import { recognizeMeal, type MealItem, type MealRecognition } from '../../src/lib/ai';
import { addDays, fmtCN, todayKey, weekdayOf } from '../../src/lib/date';
import { calcNutrition } from '../../src/lib/nutrition';
import { attachCutout } from '../../src/lib/photoSticker';
import { frequentCombos, suggestMeal, type MealCombo } from '../../src/lib/suggest';
import { useDietStore } from '../../src/store/diet';
import { useJournalStore } from '../../src/store/journal';
import { useProfileStore } from '../../src/store/profile';
import { useSettingsStore } from '../../src/store/settings';
import { C, FONT, R, TAPE } from '../../src/theme';
import type { Food, MealType } from '../../src/types';

const MEALS: { k: MealType; label: string; icon: string }[] = [
  { k: 'breakfast', label: '早餐', icon: '🌅' },
  { k: 'lunch', label: '午餐', icon: '🍱' },
  { k: 'dinner', label: '晚餐', icon: '🌙' },
  { k: 'snack', label: '加餐', icon: '🍎' },
];

export default function DietScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const ai = useSettingsStore((s) => s.ai);
  const journalEntries = useJournalStore((s) => s.entries);
  const addJournalEntry = useJournalStore((s) => s.add);
  const updateJournalEntry = useJournalStore((s) => s.update);
  const logs = useDietStore((s) => s.logs);
  const addLog = useDietStore((s) => s.addLog);
  const removeLog = useDietStore((s) => s.removeLog);

  const [date, setDate] = useState(todayKey());
  const [sheetMeal, setSheetMeal] = useState<MealType | null>(null);
  const [mode, setMode] = useState<'lib' | 'custom'>('lib');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('全部');
  const [pickedFood, setPickedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [cName, setCName] = useState('');
  const [cKcal, setCKcal] = useState('');
  const [cP, setCP] = useState('');
  const [cC, setCC] = useState('');
  const [cF, setCF] = useState('');

  // 拍照识餐
  const [snapUri, setSnapUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [snapResult, setSnapResult] = useState<MealRecognition | null>(null);
  const [snapGrams, setSnapGrams] = useState<string[]>([]);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [snapMeal, setSnapMeal] = useState<MealType>('lunch');

  // 下一餐推荐的换一批（同一时段内保持稳定，点了才换）
  const [suggestSeed, setSuggestSeed] = useState(0);

  if (!profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const nut = calcNutrition(profile);
  const dayLogs = logs.filter((l) => l.date === date);
  const sum = dayLogs.reduce(
    (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // 近 7 天小结：每天总摄入、达标天数（目标 ±10% 内）、mini 柱图
  const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];
  const week7 = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i - 6));
  const weekKcals = week7.map((k) => logs.filter((l) => l.date === k).reduce((a, b) => a + b.kcal, 0));
  const recordedDays = weekKcals.filter((v) => v > 0).length;
  const avgKcal = recordedDays ? Math.round(weekKcals.reduce((a, b) => a + b, 0) / recordedDays) : 0;
  const onTargetDays = weekKcals.filter((v) => v > 0 && Math.abs(v - nut.kcal) <= nut.kcal * 0.1).length;
  const BAR_H = 64;
  const BAR_CAP = 1.15; // 柱高按目标倍数封顶
  const barH = (v: number) => (Math.min(v / nut.kcal, BAR_CAP) / BAR_CAP) * BAR_H;
  const barColor = (v: number) => {
    if (v <= 0) return C.line;
    if (v > nut.kcal * 1.1) return C.danger;
    if (v < nut.kcal * 0.9) return C.warn;
    return C.good;
  };

  const filtered = useMemo(() => {
    const q = query.trim();
    return FOODS.filter((f) => (cat === '全部' || f.cat === cat) && (!q || f.name.includes(q)));
  }, [query, cat]);

  /** 最近吃过的食物（按频次排序）：库里的走克数表单，手输的直接照抄上次 */
  const recentItems = useMemo(() => {
    const byName = new Map<string, { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; count: number }>();
    for (let i = logs.length - 1; i >= 0; i--) {
      const l = logs[i];
      const cur = byName.get(l.name);
      if (cur) cur.count++;
      else byName.set(l.name, { name: l.name, grams: l.grams, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat, count: 1 });
    }
    return [...byName.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [logs]);

  /** 常吃组合：同一餐反复一起出现的搭配，一键整餐入账 */
  const combos = useMemo(() => frequentCombos(logs), [logs]);

  /** 按剩余宏量推荐下一餐（蛋白优先，热量不超额度） */
  const remain = {
    kcal: Math.max(0, nut.kcal - Math.round(sum.kcal)),
    protein: Math.max(0, nut.protein - sum.protein),
    carbs: Math.max(0, nut.carbs - sum.carbs),
    fat: Math.max(0, nut.fat - sum.fat),
  };
  const suggestion = suggestMeal(remain, `${date}|${Math.floor(new Date().getHours() / 3)}|${suggestSeed}`);

  const addCombo = (c: MealCombo) => {
    if (!sheetMeal) return;
    for (const it of c.items) {
      addLog({
        id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        meal: sheetMeal,
        name: it.name,
        grams: it.grams,
        kcal: it.kcal,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
      });
    }
    closeSheet();
  };

  const openSheet = (meal: MealType) => {
    setSheetMeal(meal);
    setMode('lib');
    setPickedFood(null);
    setQuery('');
    setGrams('100');
  };

  const closeSheet = () => setSheetMeal(null);

  /** 点「最近吃过」：按上次份量直接入账；想改克数就走下面的食物库 */
  const tapRecent = (r: { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }) => {
    if (!sheetMeal) return;
    const libFood = FOODS.find((f) => f.name === r.name);
    const g = Math.max(1, r.grams > 1 ? r.grams : libFood?.portionG ?? 100);
    addLog({
      id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      meal: sheetMeal,
      name: r.name,
      grams: g,
      kcal: libFood ? Math.round((libFood.kcal * g) / 100) : r.kcal,
      protein: libFood ? +((libFood.protein * g) / 100).toFixed(1) : r.protein,
      carbs: libFood ? +((libFood.carbs * g) / 100).toFixed(1) : r.carbs,
      fat: libFood ? +((libFood.fat * g) / 100).toFixed(1) : r.fat,
    });
    closeSheet();
  };

  const addFromLib = (food: Food) => {
    if (!sheetMeal) return;
    const g = Math.max(1, Number(grams) || 100);
    addLog({
      id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      meal: sheetMeal,
      name: food.name,
      grams: g,
      kcal: Math.round((food.kcal * g) / 100),
      protein: +((food.protein * g) / 100).toFixed(1),
      carbs: +((food.carbs * g) / 100).toFixed(1),
      fat: +((food.fat * g) / 100).toFixed(1),
    });
    closeSheet();
  };

  const addCustom = () => {
    if (!sheetMeal || !cName.trim() || !Number(cKcal)) return;
    addLog({
      id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      meal: sheetMeal,
      name: cName.trim(),
      grams: 1,
      kcal: Math.round(Number(cKcal)),
      protein: Number(cP) || 0,
      carbs: Number(cC) || 0,
      fat: Number(cF) || 0,
    });
    setCName(''); setCKcal(''); setCP(''); setCC(''); setCF('');
    closeSheet();
  };

  const mealLabel = sheetMeal ? MEALS.find((m) => m.k === sheetMeal)?.label ?? '' : '';
  const overKcal = sum.kcal > nut.kcal;

  /* ---------- 拍照识餐 ---------- */

  const aiReady = ai.enabled && !!ai.apiKey;

  const autoMealByTime = (): MealType => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 17) return 'snack';
    return 'dinner';
  };

  const nextMealLabel = MEALS.find((m) => m.k === autoMealByTime())?.label ?? '加餐';

  /** 一键记入：推荐组合按当前时段自动归到对应餐 */
  const addSuggestion = () => {
    if (!suggestion) return;
    const meal = autoMealByTime();
    for (const it of suggestion.items) {
      addLog({
        id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        meal,
        name: it.name,
        grams: it.grams,
        kcal: it.kcal,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
      });
    }
  };

  const resetSnap = () => {
    setSnapUri(null);
    setSnapResult(null);
    setSnapGrams([]);
    setSnapError(null);
    setAnalyzing(false);
  };

  /** AI 估重不一定准：改克数后按比例重算热量与宏量 */
  const scaleItem = (it: MealItem, grams: number): MealItem => {
    const g = Math.max(1, Math.round(grams));
    const r = it.grams > 0 ? g / it.grams : 1;
    return {
      ...it,
      grams: g,
      kcal: Math.max(1, Math.round(it.kcal * r)),
      protein: +(it.protein * r).toFixed(1),
      carbs: +(it.carbs * r).toFixed(1),
      fat: +(it.fat * r).toFixed(1),
    };
  };

  const snapItemsScaled = (snapResult?.items ?? []).map((it, i) =>
    scaleItem(it, Number(snapGrams[i]) || it.grams),
  );

  const pickSnap = async (fromCamera: boolean) => {
    if (!aiReady) {
      Alert.alert('先启用 AI', '拍照识餐需要 AI 服务。已内置 DeepSeek（deepseek-flash），去「我的 → AI 能力」打开开关即可。');
      return;
    }
    try {
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: false,
      };
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      const asset = res.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setSnapUri(uri);
      setSnapResult(null);
      setSnapError(null);
      setSnapMeal(autoMealByTime());
      setAnalyzing(true);
      try {
        const r = await recognizeMeal(ai, uri);
        if (!r.items.length) throw new Error('没认出图里的食物，换个角度试试');
        setSnapResult(r);
        setSnapGrams(r.items.map((it) => String(it.grams)));
      } catch (e) {
        setSnapError(e instanceof Error ? e.message : '识别失败，请重试');
      } finally {
        setAnalyzing(false);
      }
    } catch {
      // 选图取消或权限拒绝时静默
    }
  };

  const addSnapToDiet = () => {
    if (!snapResult) return;
    for (const it of snapItemsScaled) {
      addLog({
        id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        meal: snapMeal,
        name: it.name,
        grams: it.grams,
        kcal: it.kcal,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
      });
    }
    resetSnap();
  };

  const snapToPlog = () => {
    if (!snapUri) return;
    // 直接贴进手帐照片墙（名称用 AI 识别结果），后台再抠成白边贴纸
    const name = snapItemsScaled.map((i) => i.name).join('·').slice(0, 8) || '这一餐';
    const photo = { id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, uri: snapUri, name };
    const host = journalEntries.find((e) => e.date === date && (e.photos?.length ?? 0) > 0 && (e.stickers?.length ?? 0) === 0 && !e.note && !e.title && !e.statsText);
    if (host) updateJournalEntry({ ...host, photos: [...(host.photos ?? []), photo] });
    else addJournalEntry({
      id: `j-${Date.now()}`, date, kind: 'meal', title: '', note: '', stickers: [], doodles: [], photos: [photo], createdAt: Date.now(),
    });
    void attachCutout(photo.id, photo.uri);
    resetSnap();
    router.navigate('/journal');
  };

  const snapTotal = snapItemsScaled.reduce((a, b) => a + b.kcal, 0);
  const snapP = Math.round(snapItemsScaled.reduce((a, b) => a + b.protein, 0));
  const snapC = Math.round(snapItemsScaled.reduce((a, b) => a + b.carbs, 0));
  const snapF = Math.round(snapItemsScaled.reduce((a, b) => a + b.fat, 0));
  const snapMealLabel = MEALS.find((m) => m.k === snapMeal)?.label ?? '';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Scroll contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.dateNav}>
          <Press style={s.dateBtn} onPress={() => setDate(addDays(date, -1))}>
            <Text style={s.dateBtnT}>‹</Text>
          </Press>
          <Text style={s.dateT}>{fmtCN(date)}</Text>
          <Press
            style={[s.dateBtn, date >= todayKey() ? { opacity: 0.35 } : null]}
            onPress={() => date < todayKey() && setDate(addDays(date, 1))}
          >
            <Text style={s.dateBtnT}>›</Text>
          </Press>
        </View>

        <Animated.View entering={stagger(0)}>
          <Card style={s.summary} taped={TAPE.red}>
            <Ring size={130} stroke={11} progress={nut.kcal > 0 ? sum.kcal / nut.kcal : 0} color={overKcal ? C.danger : C.good}>
              <Text style={s.ringBig}>{Math.round(sum.kcal)}</Text>
              <Text style={s.ringSub}>{`/ ${nut.kcal} kcal`}</Text>
            </Ring>
            <View style={{ flex: 1, gap: 12 }}>
              {([
                { label: '蛋白质', v: sum.protein, t: nut.protein, color: C.good, unit: 'g' },
                { label: '碳水', v: sum.carbs, t: nut.carbs, color: C.warn, unit: 'g' },
                { label: '脂肪', v: sum.fat, t: nut.fat, color: C.pink, unit: 'g' },
              ]).map((m) => (
                <View key={m.label}>
                  <View style={s.macroHead}>
                    <Text style={s.macroT}>{m.label}</Text>
                    <Sub>{`${Math.round(m.v)} / ${m.t}${m.unit}`}</Sub>
                  </View>
                  <Bar value={m.v} target={m.t} color={m.color} />
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* 下一餐怎么吃：按剩余宏量推荐组合 */}
        <Animated.View entering={stagger(1)}>
          <Card style={s.nextCard} taped={TAPE.green}>
            <View style={s.weekHead}>
              <Text style={s.weekT}>🥗 下一餐怎么吃</Text>
              <Sub>{`还差 ${remain.kcal} kcal · 蛋白 ${Math.round(remain.protein)}g · 碳水 ${Math.round(remain.carbs)}g`}</Sub>
            </View>
            {suggestion ? (
              <>
                <View style={s.sugList}>
                  {suggestion.items.map((it, i) => (
                    <View key={`${it.name}-${i}`} style={s.sugRow}>
                      <Text style={s.sugName} numberOfLines={1}>{it.name}</Text>
                      <Text style={s.sugNums}>{`${it.grams}g · ${it.kcal} kcal · 蛋白${it.protein}g`}</Text>
                    </View>
                  ))}
                </View>
                <Sub>{`合计约 ${suggestion.kcal} kcal · 蛋白 ${suggestion.protein}g · 碳水 ${suggestion.carbs}g，吃了不超今天额度`}</Sub>
                <View style={s.snapBtnRow}>
                  <Button title={`一键记入${nextMealLabel}`} small onPress={addSuggestion} />
                  <Button title="换一换" kind="ghost" small onPress={() => setSuggestSeed((v) => v + 1)} />
                </View>
              </>
            ) : (
              <Sub>今天额度快用完了，多喝水，明天再战 💪</Sub>
            )}
          </Card>
        </Animated.View>

        {/* 近 7 天小结 */}
        <Animated.View entering={stagger(1)}>
          <Card style={s.weekCard}>
            <View style={s.weekHead}>
              <Text style={s.weekT}>近 7 天</Text>
              <Sub>
                {recordedDays > 0
                  ? `平均 ${avgKcal} kcal/天 · 达标 ${onTargetDays}/${recordedDays} 天（目标 ±10%）`
                  : '记几天饮食，这里就能看到趋势'}
              </Sub>
            </View>
            <View style={s.barsWrap}>
              <View style={[s.targetLine, { bottom: barH(nut.kcal) }]} />
              {week7.map((k, i) => {
                const v = weekKcals[i];
                const isToday = k === todayKey();
                return (
                  <View key={k} style={s.barCol}>
                    <View style={[s.bar, { height: Math.max(v > 0 ? 4 : 2, barH(v)), backgroundColor: barColor(v) }]} />
                    <Text style={[s.barLabel, isToday && { color: C.accent, fontWeight: '800' }]}>
                      {WEEKDAY_ZH[weekdayOf(k)]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        {/* 拍照识餐 */}
        <Animated.View entering={stagger(2)}>
          <Card style={s.snapCard}>
            <SectionTitle>📷 拍照识餐</SectionTitle>
            {!snapUri ? (
              <>
                <Sub style={s.snapHint}>
                  {aiReady ? '拍一下这一餐，AI 帮你认食物、估重量、算热量' : '在「我的」页启用 AI 后，拍一下就能自动记账（glm-4v-flash 免费可用）'}
                </Sub>
                <View style={s.snapBtnRow}>
                  {Platform.OS !== 'web' ? <Button title="拍照" small onPress={() => pickSnap(true)} /> : null}
                  <Button
                    title={Platform.OS !== 'web' ? '从相册选' : '选一张食物照片'}
                    kind={Platform.OS !== 'web' ? 'ghost' : 'primary'}
                    small
                    onPress={() => pickSnap(false)}
                  />
                </View>
              </>
            ) : analyzing ? (
              <View style={s.snapBody}>
                <Sticker source={{ uri: snapUri }} rotation={-3} width={104} />
                <View style={{ flex: 1 }}>
                  <Text style={s.snapStatus}>🧐 AI 正在看图…</Text>
                  <Sub>认食物 · 估重量 · 算热量</Sub>
                </View>
              </View>
            ) : snapError ? (
              <View style={s.snapBody}>
                <Sticker source={{ uri: snapUri }} rotation={-3} width={104} />
                <View style={{ flex: 1, gap: 10 }}>
                  <Text style={s.snapErr}>😮 {snapError}</Text>
                  <View style={s.snapBtnRow}>
                    <Button title="换一张" small onPress={() => pickSnap(false)} />
                    <Button title="取消" kind="ghost" small onPress={resetSnap} />
                  </View>
                </View>
              </View>
            ) : snapResult ? (
              <>
                <View style={s.snapBody}>
                  <Sticker source={{ uri: snapUri }} rotation={-3} width={104} />
                  <View style={{ flex: 1, gap: 7 }}>
                    {snapResult.note ? <Text style={s.snapNote}>{snapResult.note}</Text> : null}
                    {snapItemsScaled.map((it, i) => (
                      <View key={i} style={s.snapItem}>
                        <View style={{ flex: 1 }}>
                          <View style={s.snapItemTop}>
                            <Text style={s.snapItemName} numberOfLines={1}>{it.name}</Text>
                            <View style={s.snapGramsBox}>
                              <TextInput
                                style={s.snapGramsInput}
                                value={snapGrams[i] ?? String(it.grams)}
                                onChangeText={(t) => setSnapGrams((arr) => arr.map((g, j) => (j === i ? t.replace(/[^\d]/g, '') : g)))}
                                keyboardType="number-pad"
                                maxLength={4}
                              />
                              <Text style={s.snapItemKcal}>{`g · ${it.kcal} kcal`}</Text>
                            </View>
                          </View>
                          <View style={s.macroLine}>
                            <Text style={[s.macroTag, { color: C.good }]}>{`蛋白 ${it.protein}g`}</Text>
                            <Text style={[s.macroTag, { color: C.warn }]}>{`碳水 ${it.carbs}g`}</Text>
                            <Text style={[s.macroTag, { color: C.pink }]}>{`脂肪 ${it.fat}g`}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                    <Text style={s.snapTotal}>{`合计约 ${snapTotal} kcal · 估重不准可改克数`}</Text>
                    <Text style={s.snapMacroTotal}>
                      <Text style={{ color: C.good }}>{`蛋白 ${snapP}g`}</Text>
                      {' · '}
                      <Text style={{ color: C.warn }}>{`碳水 ${snapC}g`}</Text>
                      {' · '}
                      <Text style={{ color: C.pink }}>{`脂肪 ${snapF}g`}</Text>
                    </Text>
                  </View>
                </View>
                <View style={s.snapMealRow}>
                  {MEALS.map((m) => (
                    <Chip key={m.k} label={m.label} selected={snapMeal === m.k} onPress={() => setSnapMeal(m.k)} />
                  ))}
                </View>
                <View style={s.snapBtnRow}>
                  <Button title={`加入${snapMealLabel}`} small onPress={addSnapToDiet} />
                  <Button title="贴进手帐" kind="ghost" small onPress={snapToPlog} />
                  <Press hitSlop={8} onPress={resetSnap}>
                    <Text style={s.snapReset}>✕</Text>
                  </Press>
                </View>
              </>
            ) : null}
          </Card>
        </Animated.View>

        {overKcal && (
          <Animated.View entering={stagger(1)}>
            <View style={s.overBox}>
              <Text style={s.overT}>{`已超出目标 ${Math.round(sum.kcal - nut.kcal)} kcal，明天继续加油`}</Text>
            </View>
          </Animated.View>
        )}

        {MEALS.map((m, mi) => {
          const items = dayLogs.filter((l) => l.meal === m.k);
          const kcal = items.reduce((a, b) => a + b.kcal, 0);
          return (
            <Animated.View key={m.k} entering={stagger(mi + 2)}>
              <Card style={s.meal}>
                <View style={s.mealHead}>
                  <Text style={s.mealIcon}>{m.icon}</Text>
                  <Text style={s.mealT}>{m.label}</Text>
                  {items.length > 0 ? <Sub>{`${Math.round(kcal)} kcal`}</Sub> : null}
                  <Press style={s.addBtn} onPress={() => openSheet(m.k)}>
                    <Text style={s.addBtnT}>＋ 添加</Text>
                  </Press>
                </View>
                {items.map((it) => (
                  <View key={it.id} style={s.foodRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.foodT}>{it.name}</Text>
                      {it.grams > 1 ? <Sub>{`${it.grams}g · ${it.kcal} kcal`}</Sub> : <Sub>{`${it.kcal} kcal`}</Sub>}
                      {(it.protein > 0 || it.carbs > 0 || it.fat > 0) ? (
                        <View style={s.macroLine}>
                          <Text style={[s.macroTag, { color: C.good }]}>{`蛋白${it.protein}`}</Text>
                          <Text style={[s.macroTag, { color: C.warn }]}>{`碳水${it.carbs}`}</Text>
                          <Text style={[s.macroTag, { color: C.pink }]}>{`脂肪${it.fat}`}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => Alert.alert('删除这条记录？', `「${it.name}」删除后无法恢复。`, [
                        { text: '取消', style: 'cancel' },
                        { text: '删除', style: 'destructive', onPress: () => removeLog(it.id) },
                      ])}
                    >
                      <Text style={s.delT}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </Card>
            </Animated.View>
          );
        })}

        <View style={s.hint}>
          <Sub>
            {`目标基于你的资料自动计算：基础代谢 ${nut.bmr} kcal，每日消耗 ${nut.tdee} kcal。可在「我的」页修改资料。`}
          </Sub>
        </View>
      </Scroll>

      {sheetMeal !== null && (
        <View style={s.sheetHost}>
          <Pressable style={s.backdrop} onPress={closeSheet} />
          <View style={s.sheet}>
            <Tape width={64} />
            <View style={s.sheetHead}>
              <Text style={s.sheetT}>{`添加到${mealLabel}`}</Text>
              <Pressable onPress={closeSheet} hitSlop={8}>
                <Text style={s.closeT}>✕</Text>
              </Pressable>
            </View>

            {pickedFood ? (
              <View style={{ gap: 12 }}>
                <Text style={s.pickedT}>{pickedFood.name}</Text>
                <Sub>{`每100g：${pickedFood.kcal} kcal · 蛋白${pickedFood.protein}g · 碳水${pickedFood.carbs}g · 脂肪${pickedFood.fat}g`}</Sub>
                <View style={s.quickRow}>
                  {[50, 100, 150, 200].map((g) => (
                    <Chip key={g} label={`${g}g`} selected={Number(grams) === g} onPress={() => setGrams(String(g))} />
                  ))}
                </View>
                <TextInput
                  style={s.gramsInput}
                  value={grams}
                  onChangeText={(t) => setGrams(t.replace(/[^\d.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="克数"
                  placeholderTextColor={C.faint}
                />
                <Text style={s.calcT}>
                  {`≈ ${Math.round((pickedFood.kcal * (Number(grams) || 0)) / 100)} kcal`}
                </Text>
                <View style={s.sheetBtns}>
                  <Button title="返回重选" kind="ghost" small onPress={() => setPickedFood(null)} />
                  <Button title={`加入${mealLabel}`} onPress={() => addFromLib(pickedFood)} />
                </View>
              </View>
            ) : (
              <>
                <View style={s.modeRow}>
                  <Press style={[s.modeBtn, mode === 'lib' && s.modeBtnOn]} onPress={() => setMode('lib')}>
                    <Text style={[s.modeT, mode === 'lib' && s.modeTOn]}>食物库</Text>
                  </Press>
                  <Press style={[s.modeBtn, mode === 'custom' && s.modeBtnOn]} onPress={() => setMode('custom')}>
                    <Text style={[s.modeT, mode === 'custom' && s.modeTOn]}>手动输入</Text>
                  </Press>
                </View>

                {mode === 'lib' ? (
                  <>
                    {combos.length > 0 ? (
                      <View style={{ marginBottom: 12 }}>
                        <Sub style={{ marginBottom: 6 }}>常吃组合（点一下整餐入账）</Sub>                        {combos.slice(0, 4).map((c) => (
                          <Press key={c.name} style={s.comboRow} onPress={() => addCombo(c)}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.comboT} numberOfLines={1}>{c.name}</Text>
                              <Sub style={{ fontSize: 11 }}>{`约 ${c.kcal} kcal · 吃过 ${c.count} 次（份量照最近一次）`}</Sub>
                            </View>
                            <Text style={s.comboAdd}>＋</Text>
                          </Press>
                        ))}
                      </View>
                    ) : null}
                    {recentItems.length > 0 ? (
                      <View style={{ marginBottom: 10 }}>
                        <Sub style={{ marginBottom: 6 }}>最近吃过（点一下按上次份量直接记）</Sub>
                        <Scroll horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                          <View style={s.recentRow}>
                            {recentItems.map((r) => (
                              <Chip
                                key={r.name}
                                label={r.grams > 1 ? `${r.name} ${r.grams}g` : r.name}
                                selected={false}
                                onPress={() => tapRecent(r)}
                              />
                            ))}
                          </View>
                        </Scroll>
                      </View>
                    ) : null}
                    <TextInput
                      style={s.search}
                      value={query}
                      onChangeText={setQuery}
                      placeholder="搜索食物（如：鸡胸肉）"
                      placeholderTextColor={C.faint}
                    />
                    <Scroll horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 8 }}>
                      <View style={s.catRow}>
                        {FOOD_CATS.map((c) => (
                          <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
                        ))}
                      </View>
                    </Scroll>
                    <FlatList
                      data={filtered}
                      keyExtractor={(f) => String(f.id)}
                      style={{ maxHeight: 330 }}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <Pressable style={s.foodItem} onPress={() => { setPickedFood(item); setGrams(String(item.portionG ?? 100)); }}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.foodItemT}>{item.name}</Text>
                            <Sub style={{ fontSize: 11 }}>{`${item.kcal} kcal/100g · P${item.protein} C${item.carbs} F${item.fat}`}</Sub>
                          </View>
                          <Text style={s.arrow}>›</Text>
                        </Pressable>
                      )}
                      ListEmptyComponent={<Sub style={{ padding: 20, textAlign: 'center' }}>没有找到，试试手动输入</Sub>}
                    />
                  </>
                ) : (
                  <View style={{ gap: 10 }}>
                    <TextInput style={s.search} value={cName} onChangeText={setCName} placeholder="食物名称" placeholderTextColor={C.faint} />
                    <View style={s.customRow}>
                      <TextInput style={s.customInput} value={cKcal} onChangeText={(t) => setCKcal(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="热量 kcal" placeholderTextColor={C.faint} />
                    </View>
                    <View style={s.customRow}>
                      <TextInput style={s.customInput} value={cP} onChangeText={(t) => setCP(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="蛋白g" placeholderTextColor={C.faint} />
                      <TextInput style={s.customInput} value={cC} onChangeText={(t) => setCC(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="碳水g" placeholderTextColor={C.faint} />
                      <TextInput style={s.customInput} value={cF} onChangeText={(t) => setCF(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="脂肪g" placeholderTextColor={C.faint} />
                    </View>
                    <Button title={`加入${mealLabel}`} onPress={addCustom} disabled={!cName.trim() || !Number(cKcal)} />
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 4 },
  dateBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.inkAlpha, alignItems: 'center', justifyContent: 'center' },
  dateBtnT: { color: C.text, fontSize: 20, fontWeight: '700', marginTop: -2 },
  dateT: { color: C.text, fontSize: 17, fontWeight: '800' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 20 },
  ringBig: { color: C.text, fontSize: 24, fontWeight: '800', fontFamily: FONT.extra },
  ringSub: { color: C.sub, fontSize: 11, marginTop: 2 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroT: { color: C.text, fontSize: 13, fontWeight: '700' },
  overBox: { backgroundColor: '#F6DBD5', borderRadius: R.md, borderWidth: 1.5, borderColor: 'rgba(192,59,46,0.35)', padding: 12 },
  overT: { color: C.danger, fontSize: 13, fontWeight: '600' },
  meal: { paddingVertical: 14 },
  weekCard: { paddingVertical: 14 },
  nextCard: { paddingVertical: 14 },
  sugList: { gap: 2, marginBottom: 8 },
  sugRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  sugName: { color: C.text, fontSize: 14, fontWeight: '700', flex: 1 },
  sugNums: { color: C.sub, fontSize: 11, fontWeight: '600', fontFamily: FONT.semi },
  comboRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  comboT: { color: C.text, fontSize: 14, fontWeight: '700' },
  comboAdd: { color: C.accent, fontSize: 18, fontWeight: '800', paddingHorizontal: 4 },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 4 },
  weekT: { color: C.text, fontSize: 15, fontWeight: '700' },
  barsWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 84 },
  targetLine: { position: 'absolute', left: 0, right: 0, borderStyle: 'dashed', borderWidth: 1, borderColor: C.faint, borderRadius: 0.5 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '70%', maxWidth: 26, borderRadius: 4 },
  barLabel: { color: C.sub, fontSize: 10, fontWeight: '600' },
  snapCard: { paddingVertical: 14 },
  snapHint: { marginBottom: 12 },
  snapBtnRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  snapBody: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  snapStatus: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  snapErr: { color: C.danger, fontSize: 14, fontWeight: '700' },
  snapNote: { color: C.accent, fontSize: 14, fontFamily: FONT.semi, fontWeight: '600' },
  snapItem: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed' },
  snapItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  snapItemName: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  snapItemKcal: { color: C.sub, fontSize: 12, fontWeight: '600', fontFamily: FONT.semi },
  snapTotal: { color: C.text, fontSize: 13, fontWeight: '800', fontFamily: FONT.extra },
  snapMacroTotal: { color: C.sub, fontSize: 12, fontWeight: '700', fontFamily: FONT.semi, marginTop: 2 },
  macroLine: { flexDirection: 'row', gap: 10, marginTop: 2 },
  macroTag: { fontSize: 11, fontWeight: '700', fontFamily: FONT.semi },
  snapMealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  snapReset: { color: C.faint, fontSize: 16, fontWeight: '700', paddingLeft: 4 },
  snapGramsBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  snapGramsInput: {
    color: C.accent, fontSize: 13, fontWeight: '800', fontFamily: FONT.semi,
    borderBottomWidth: 1.5, borderBottomColor: C.accent, paddingHorizontal: 2, paddingVertical: 0,
    minWidth: 34, textAlign: 'center',
  },
  recentRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  mealIcon: { fontSize: 17 },
  mealT: { color: C.text, fontSize: 16, fontWeight: '800', flex: 1 },
  addBtn: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnT: { color: C.accent, fontSize: 12, fontWeight: '800' },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed', marginTop: 4 },
  foodT: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  delT: { color: C.faint, fontSize: 15, fontWeight: '700' },
  hint: { padding: 8 },
  sheetHost: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 10 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,36,22,0.45)' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1.5, borderColor: C.inkAlpha, padding: 18, maxHeight: '85%',
    shadowColor: C.shadowInk, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 6,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 6 },
  sheetT: { color: C.text, fontSize: 17, fontWeight: '800' },
  closeT: { color: C.sub, fontSize: 16 },
  pickedT: { color: C.accent, fontSize: 19, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: 8 },
  gramsInput: {
    color: C.text, backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlpha,
    borderRadius: R.sm, height: 46, paddingHorizontal: 14, fontSize: 16, fontWeight: '600',
  },
  calcT: { color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: { flex: 1, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.inkAlpha, backgroundColor: C.card, paddingVertical: 8, alignItems: 'center' },
  modeBtnOn: { backgroundColor: C.marker, borderColor: 'rgba(107,90,16,0.35)' },
  modeT: { color: C.sub, fontSize: 13, fontWeight: '700' },
  modeTOn: { color: C.markerInk },
  search: {
    color: C.text, backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlpha,
    borderRadius: R.sm, height: 42, paddingHorizontal: 14, fontSize: 14, marginBottom: 8,
  },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  foodItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed' },
  foodItemT: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  arrow: { color: C.sub, fontSize: 20 },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: {
    flex: 1, color: C.text, backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlpha,
    borderRadius: R.sm, height: 42, paddingHorizontal: 12, fontSize: 14,
  },
});
