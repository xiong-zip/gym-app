import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bar, Button, Card, Chip, Ring, Sub } from '../../src/components/ui';
import { FOOD_CATS, FOODS } from '../../src/data/foods';
import { addDays, fmtCN, todayKey } from '../../src/lib/date';
import { calcNutrition } from '../../src/lib/nutrition';
import { useDietStore } from '../../src/store/diet';
import { useProfileStore } from '../../src/store/profile';
import { C } from '../../src/theme';
import type { Food, MealType } from '../../src/types';

const MEALS: { k: MealType; label: string }[] = [
  { k: 'breakfast', label: '早餐' },
  { k: 'lunch', label: '午餐' },
  { k: 'dinner', label: '晚餐' },
  { k: 'snack', label: '加餐' },
];

export default function DietScreen() {
  const profile = useProfileStore((s) => s.profile);
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

  if (!profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const nut = calcNutrition(profile);
  const dayLogs = logs.filter((l) => l.date === date);
  const sum = dayLogs.reduce(
    (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    return FOODS.filter((f) => (cat === '全部' || f.cat === cat) && (!q || f.name.includes(q)));
  }, [query, cat]);

  const openSheet = (meal: MealType) => {
    setSheetMeal(meal);
    setMode('lib');
    setPickedFood(null);
    setQuery('');
    setGrams('100');
  };

  const closeSheet = () => setSheetMeal(null);

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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.dateNav}>
          <Pressable style={s.dateBtn} onPress={() => setDate(addDays(date, -1))}>
            <Text style={s.dateBtnT}>‹</Text>
          </Pressable>
          <Text style={s.dateT}>{fmtCN(date)}</Text>
          <Pressable
            style={[s.dateBtn, date >= todayKey() ? { opacity: 0.3 } : null]}
            onPress={() => date < todayKey() && setDate(addDays(date, 1))}
          >
            <Text style={s.dateBtnT}>›</Text>
          </Pressable>
        </View>

        <Card style={s.summary}>
          <Ring size={130} stroke={11} progress={nut.kcal > 0 ? sum.kcal / nut.kcal : 0} color={overKcal ? C.danger : C.accent}>
            <Text style={s.ringBig}>{Math.round(sum.kcal)}</Text>
            <Text style={s.ringSub}>{`/ ${nut.kcal} kcal`}</Text>
          </Ring>
          <View style={{ flex: 1, gap: 12 }}>
            {([
              { label: '蛋白质', v: sum.protein, t: nut.protein, color: C.info, unit: 'g' },
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

        {overKcal && (
          <View style={s.overBox}>
            <Text style={s.overT}>{`已超出目标 ${Math.round(sum.kcal - nut.kcal)} kcal，明天继续加油`}</Text>
          </View>
        )}

        {MEALS.map((m) => {
          const items = dayLogs.filter((l) => l.meal === m.k);
          const kcal = items.reduce((a, b) => a + b.kcal, 0);
          return (
            <Card key={m.k} style={s.meal}>
              <View style={s.mealHead}>
                <Text style={s.mealT}>{m.label}</Text>
                {items.length > 0 ? <Sub>{`${Math.round(kcal)} kcal`}</Sub> : null}
                <Pressable style={s.addBtn} onPress={() => openSheet(m.k)}>
                  <Text style={s.addBtnT}>＋ 添加</Text>
                </Pressable>
              </View>
              {items.map((it) => (
                <View key={it.id} style={s.foodRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.foodT}>{it.name}</Text>
                    {it.grams > 1 ? <Sub>{`${it.grams}g · ${it.kcal} kcal`}</Sub> : <Sub>{`${it.kcal} kcal`}</Sub>}
                  </View>
                  <Pressable hitSlop={8} onPress={() => removeLog(it.id)}>
                    <Text style={s.delT}>🗑</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          );
        })}

        <Card style={s.hint}>
          <Sub>
            {`目标基于你的资料自动计算：基础代谢 ${nut.bmr} kcal，每日消耗 ${nut.tdee} kcal。可在「我的」页修改资料。`}
          </Sub>
        </Card>
      </ScrollView>

      {sheetMeal !== null && (
        <View style={s.sheetHost}>
          <Pressable style={s.backdrop} onPress={closeSheet} />
          <View style={s.sheet}>
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
                  placeholderTextColor={C.sub}
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
                  <Pressable style={[s.modeBtn, mode === 'lib' && s.modeBtnOn]} onPress={() => setMode('lib')}>
                    <Text style={[s.modeT, mode === 'lib' && s.modeTOn]}>食物库</Text>
                  </Pressable>
                  <Pressable style={[s.modeBtn, mode === 'custom' && s.modeBtnOn]} onPress={() => setMode('custom')}>
                    <Text style={[s.modeT, mode === 'custom' && s.modeTOn]}>手动输入</Text>
                  </Pressable>
                </View>

                {mode === 'lib' ? (
                  <>
                    <TextInput
                      style={s.search}
                      value={query}
                      onChangeText={setQuery}
                      placeholder="搜索食物（如：鸡胸肉）"
                      placeholderTextColor={C.sub}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 8 }}>
                      <View style={s.catRow}>
                        {FOOD_CATS.map((c) => (
                          <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
                        ))}
                      </View>
                    </ScrollView>
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
                    <TextInput style={s.search} value={cName} onChangeText={setCName} placeholder="食物名称" placeholderTextColor={C.sub} />
                    <View style={s.customRow}>
                      <TextInput style={s.customInput} value={cKcal} onChangeText={(t) => setCKcal(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="热量 kcal" placeholderTextColor={C.sub} />
                    </View>
                    <View style={s.customRow}>
                      <TextInput style={s.customInput} value={cP} onChangeText={(t) => setCP(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="蛋白g" placeholderTextColor={C.sub} />
                      <TextInput style={s.customInput} value={cC} onChangeText={(t) => setCC(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="碳水g" placeholderTextColor={C.sub} />
                      <TextInput style={s.customInput} value={cF} onChangeText={(t) => setCF(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="脂肪g" placeholderTextColor={C.sub} />
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
  body: { padding: 16, gap: 12, paddingBottom: 32 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 4 },
  dateBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dateBtnT: { color: C.text, fontSize: 20, fontWeight: '700' },
  dateT: { color: C.text, fontSize: 17, fontWeight: '800' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 20 },
  ringBig: { color: C.text, fontSize: 24, fontWeight: '800' },
  ringSub: { color: C.sub, fontSize: 11, marginTop: 2 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroT: { color: C.text, fontSize: 13, fontWeight: '700' },
  overBox: { backgroundColor: '#3A1518', borderRadius: 12, borderWidth: 1, borderColor: '#5B2226', padding: 12 },
  overT: { color: C.danger, fontSize: 13, fontWeight: '600' },
  meal: { paddingVertical: 14 },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  mealT: { color: C.text, fontSize: 16, fontWeight: '800', flex: 1 },
  addBtn: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnT: { color: C.accent, fontSize: 12, fontWeight: '700' },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, marginTop: 4 },
  foodT: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  delT: { fontSize: 15 },
  hint: { backgroundColor: 'transparent', borderWidth: 0, padding: 8 },
  sheetHost: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 10 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, borderColor: C.border, padding: 18, maxHeight: '85%',
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetT: { color: C.text, fontSize: 17, fontWeight: '800' },
  closeT: { color: C.sub, fontSize: 16 },
  pickedT: { color: C.accent, fontSize: 19, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: 8 },
  gramsInput: {
    color: C.text, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, height: 46, paddingHorizontal: 14, fontSize: 16, fontWeight: '600',
  },
  calcT: { color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2, paddingVertical: 8, alignItems: 'center' },
  modeBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  modeT: { color: C.sub, fontSize: 13, fontWeight: '700' },
  modeTOn: { color: C.onAccent },
  search: {
    color: C.text, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, height: 42, paddingHorizontal: 14, fontSize: 14, marginBottom: 8,
  },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  foodItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  foodItemT: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  arrow: { color: C.sub, fontSize: 20 },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: {
    flex: 1, color: C.text, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, height: 42, paddingHorizontal: 12, fontSize: 14,
  },
});
