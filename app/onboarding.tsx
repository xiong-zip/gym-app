import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, NumberInput, Segmented, Sub } from '../src/components/ui';
import { ACTIVITY_ZH, calcNutrition } from '../src/lib/nutrition';
import { EQUIP_ACCESS_TEXT } from '../src/lib/planner';
import { useProfileStore } from '../src/store/profile';
import { C } from '../src/theme';
import type { ActivityLevel, EquipmentAccess, Experience, Gender, Goal, Profile } from '../src/types';

const STEPS = ['基本信息', '身体数据', '训练目标', '训练经验', '训练安排', '器械条件'];

const GOALS: { value: Goal; label: string; sub: string }[] = [
  { value: 'cut', label: '减脂', sub: '降低体脂，保留肌肉' },
  { value: 'recomp', label: '塑形', sub: '增肌减脂同时进行' },
  { value: 'bulk', label: '增肌', sub: '增加肌肉与力量' },
  { value: 'health', label: '保持健康', sub: '规律运动，养成习惯' },
];

const EXP: { value: Experience; label: string; sub: string }[] = [
  { value: 'beginner', label: '新手', sub: '训练 1 年以内' },
  { value: 'intermediate', label: '中级', sub: '训练 1-3 年' },
  { value: 'advanced', label: '高级', sub: '训练 3 年以上' },
];

const EQUIPS: { value: EquipmentAccess; label: string }[] = [
  { value: 'gym', label: '健身房' },
  { value: 'home', label: '家里练' },
  { value: 'bodyweight', label: '徒手' },
];

const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: '久坐' },
  { value: 'light', label: '轻度' },
  { value: 'moderate', label: '中度' },
  { value: 'high', label: '高强度' },
];

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editing = params.edit === '1';
  const existing = useProfileStore((s) => s.profile);
  const save = useProfileStore((s) => s.save);

  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender>(existing?.gender ?? 'male');
  const [age, setAge] = useState(existing ? String(existing.age) : '25');
  const [heightCm, setHeightCm] = useState(existing ? String(existing.heightCm) : '175');
  const [weightKg, setWeightKg] = useState(existing ? String(existing.weightKg) : '70');
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? 'cut');
  const [experience, setExperience] = useState<Experience>(existing?.experience ?? 'beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(existing?.daysPerWeek ?? 3);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existing?.activityLevel ?? 'light');
  const [equipment, setEquipment] = useState<EquipmentAccess>(existing?.equipment ?? 'gym');

  const buildProfile = (): Profile => {
    const now = Date.now();
    return {
      gender,
      age: Math.round(Number(age) || 25),
      heightCm: Math.round(Number(heightCm) || 175),
      weightKg: +(Number(weightKg) || 70).toFixed(1),
      goal,
      experience,
      daysPerWeek,
      equipment,
      activityLevel,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  };

  const stepValid = (): boolean => {
    switch (step) {
      case 0: {
        const a = Number(age);
        return a >= 14 && a <= 90;
      }
      case 1: {
        const h = Number(heightCm);
        const w = Number(weightKg);
        return h >= 120 && h <= 230 && w >= 30 && w <= 250;
      }
      default:
        return true;
    }
  };

  const finish = () => {
    save(buildProfile());
    if (editing) router.back();
    else router.replace('/');
  };

  const preview = buildProfile();
  const nut = calcNutrition(preview);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Text style={s.title}>{editing ? '修改个人信息' : '欢迎来到健身搭子'}</Text>
        <Sub>{editing ? '更新后热量与训练安排会自动重算' : `第 ${step + 1} 步 / 共 ${STEPS.length} 步 · ${STEPS[step]}`}</Sub>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Field label="性别">
              <View style={s.row2}>
                <Pressable style={[s.bigOpt, gender === 'male' && s.bigOptOn]} onPress={() => setGender('male')}>
                  <Text style={[s.bigOptT, gender === 'male' && s.bigOptTOn]}>男</Text>
                </Pressable>
                <Pressable style={[s.bigOpt, gender === 'female' && s.bigOptOn]} onPress={() => setGender('female')}>
                  <Text style={[s.bigOptT, gender === 'female' && s.bigOptTOn]}>女</Text>
                </Pressable>
              </View>
            </Field>
            <Field label="年龄">
              <NumberInput value={age} onChange={setAge} suffix="岁" placeholder="25" />
            </Field>
            <Sub>基础代谢与营养目标会根据性别、年龄、身高体重自动计算。</Sub>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="身高">
              <NumberInput value={heightCm} onChange={setHeightCm} suffix="cm" placeholder="175" />
            </Field>
            <Field label="体重">
              <NumberInput value={weightKg} onChange={setWeightKg} suffix="kg" placeholder="70" />
            </Field>
            <Sub>体重之后可以在「减脂」页随时更新，用于追踪变化。</Sub>
          </>
        )}

        {step === 2 && (
          <View style={s.col}>
            {GOALS.map((g) => (
              <Pressable key={g.value} style={[s.listOpt, goal === g.value && s.listOptOn]} onPress={() => setGoal(g.value)}>
                <View>
                  <Text style={[s.listOptT, goal === g.value && s.listOptTOn]}>{g.label}</Text>
                  <Sub>{g.sub}</Sub>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={s.col}>
            {EXP.map((e) => (
              <Pressable key={e.value} style={[s.listOpt, experience === e.value && s.listOptOn]} onPress={() => setExperience(e.value)}>
                <View>
                  <Text style={[s.listOptT, experience === e.value && s.listOptTOn]}>{e.label}</Text>
                  <Sub>{e.sub}</Sub>
                </View>
              </Pressable>
            ))}
            <Sub>经验等级影响推荐动作的难度与组次数安排。</Sub>
          </View>
        )}

        {step === 4 && (
          <>
            <Field label="每周训练几天">
              <Segmented
                options={[2, 3, 4, 5, 6].map((d) => ({ value: d, label: `${d}天` }))}
                value={daysPerWeek}
                onChange={setDaysPerWeek}
              />
            </Field>
            <Field label="日常活动量（不含训练）">
              <View style={s.wrap}>
                {ACTIVITY.map((a) => (
                  <Chip key={a.value} label={a.label} selected={activityLevel === a.value} onPress={() => setActivityLevel(a.value)} />
                ))}
              </View>
            </Field>
            <Sub>{`安排：${daysPerWeek <= 3 ? '全身训练为主' : daysPerWeek === 4 ? '上下肢分化' : '推拉腿分化'}；活动量影响每日消耗估算：${ACTIVITY_ZH[activityLevel]}`}</Sub>
          </>
        )}

        {step === 5 && (
          <>
            <Field label="训练条件">
              <View style={s.col}>
                {EQUIPS.map((e) => (
                  <Pressable key={e.value} style={[s.listOpt, equipment === e.value && s.listOptOn]} onPress={() => setEquipment(e.value)}>
                    <View>
                      <Text style={[s.listOptT, equipment === e.value && s.listOptTOn]}>{e.label}</Text>
                      <Sub>{EQUIP_ACCESS_TEXT[e.value]}</Sub>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Field>
            <Card style={s.preview}>
              <Text style={s.previewT}>你的每日目标</Text>
              <View style={s.previewRow}>
                <Text style={s.previewV}>{nut.kcal} kcal</Text>
                <Sub>{`蛋白 ${nut.protein}g · 碳水 ${nut.carbs}g · 脂肪 ${nut.fat}g`}</Sub>
              </View>
              <Sub>{`基础代谢 ${nut.bmr} kcal · 每日消耗 ${nut.tdee} kcal`}</Sub>
            </Card>
          </>
        )}
      </ScrollView>

      <View style={s.nav}>
        {step > 0 ? (
          <Button title="上一步" kind="ghost" onPress={() => setStep(step - 1)} small />
        ) : (
          <View style={{ width: 90 }} />
        )}
        {step < STEPS.length - 1 ? (
          <Button title="下一步" onPress={() => stepValid() && setStep(step + 1)} disabled={!stepValid()} />
        ) : (
          <Button title={editing ? '保存' : '完成设置'} onPress={finish} />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  progressTrack: { height: 5, backgroundColor: C.card2, borderRadius: 99, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: C.accent, borderRadius: 99 },
  body: { padding: 20, paddingTop: 24 },
  nav: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  row2: { flexDirection: 'row', gap: 12 },
  bigOpt: {
    flex: 1, height: 56, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center',
  },
  bigOptOn: { backgroundColor: C.accent, borderColor: C.accent },
  bigOptT: { color: C.text, fontSize: 17, fontWeight: '700' },
  bigOptTOn: { color: C.onAccent },
  col: { gap: 10 },
  listOpt: {
    borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  listOptOn: { borderColor: C.accent, backgroundColor: '#1E2A10' },
  listOptT: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  listOptTOn: { color: C.accent },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preview: { marginTop: 8 },
  previewT: { color: C.accent, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  previewV: { color: C.text, fontSize: 26, fontWeight: '800' },
});
