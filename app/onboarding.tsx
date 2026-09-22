import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Field, NumberInput, Press, Scroll, Segmented, Sub } from '../src/components/ui';
import { ACTIVITY_ZH, calcNutrition } from '../src/lib/nutrition';
import { EQUIP_ACCESS_TEXT } from '../src/lib/planner';
import { useProfileStore } from '../src/store/profile';
import { C, FONT, R } from '../src/theme';
import type { ActivityLevel, EquipmentAccess, Experience, Gender, Goal, Profile } from '../src/types';

const STEPS = ['基本信息', '目标与经验', '训练安排'];

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
    if (step !== 0) return true;
    const a = Number(age);
    const h = Number(heightCm);
    const w = Number(weightKg);
    return a >= 14 && a <= 90 && h >= 120 && h <= 230 && w >= 30 && w <= 250;
  };

  // 越界时告诉用户为什么点不动「下一步」
  const stepError = (): string | null => {
    if (step !== 0) return null;
    const a = Number(age);
    if (!a || a < 14 || a > 90) return '年龄需填 14-90 之间，未成年人请在家长指导下训练';
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!h || h < 120 || h > 230) return '身高需填 120-230cm 之间';
    if (!w || w < 30 || w > 250) return '体重需填 30-250kg 之间';
    return null;
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

      <Scroll contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Field label="性别">
              <View style={s.row2}>
                <Press style={[s.bigOpt, gender === 'male' && s.bigOptOn]} onPress={() => setGender('male')} haptic="medium">
                  <Text style={[s.bigOptT, gender === 'male' && s.bigOptTOn]}>男</Text>
                </Press>
                <Press style={[s.bigOpt, gender === 'female' && s.bigOptOn]} onPress={() => setGender('female')} haptic="medium">
                  <Text style={[s.bigOptT, gender === 'female' && s.bigOptTOn]}>女</Text>
                </Press>
              </View>
            </Field>
            <View style={s.row3}>
              <Field label="年龄" style={{ flex: 1 }}>
                <NumberInput value={age} onChange={setAge} suffix="岁" placeholder="25" />
              </Field>
              <Field label="身高" style={{ flex: 1 }}>
                <NumberInput value={heightCm} onChange={setHeightCm} suffix="cm" placeholder="175" />
              </Field>
              <Field label="体重" style={{ flex: 1 }}>
                <NumberInput value={weightKg} onChange={setWeightKg} suffix="kg" placeholder="70" />
              </Field>
            </View>
            <Sub>基础代谢、营养目标与训练安排都会照这些自动算，之后随时可改。</Sub>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="训练目标">
              <View style={s.grid2}>
                {GOALS.map((g) => (
                  <Press key={g.value} style={[s.gridCell, goal === g.value && s.gridCellOn]} onPress={() => setGoal(g.value)} haptic="medium">
                    <Text style={[s.gridT, goal === g.value && s.gridTTOn]}>{g.label}</Text>
                    <Sub style={{ fontSize: 11, color: goal === g.value ? C.markerInk : C.sub }}>{g.sub}</Sub>
                  </Press>
                ))}
              </View>
            </Field>
            <Field label="训练经验">
              <View style={s.row3}>
                {EXP.map((e) => (
                  <Press key={e.value} style={[s.expCell, experience === e.value && s.gridCellOn]} onPress={() => setExperience(e.value)} haptic="medium">
                    <Text style={[s.gridT, experience === e.value && s.gridTTOn]}>{e.label}</Text>
                    <Sub style={{ fontSize: 11, color: experience === e.value ? C.markerInk : C.sub }}>
                      {e.value === 'beginner' ? '1 年内' : e.value === 'intermediate' ? '1-3 年' : '3 年以上'}
                    </Sub>
                  </Press>
                ))}
              </View>
            </Field>
            <Sub>经验等级影响推荐动作的难度与组次数安排。</Sub>
          </>
        )}

        {step === 2 && (
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
            <Field label="训练条件">
              <View style={s.row3}>
                {EQUIPS.map((e) => (
                  <Press key={e.value} style={[s.expCell, equipment === e.value && s.gridCellOn]} onPress={() => setEquipment(e.value)} haptic="medium">
                    <Text style={[s.gridT, equipment === e.value && s.gridTTOn]}>{e.label}</Text>
                  </Press>
                ))}
              </View>
            </Field>
            <Sub>{`安排：${daysPerWeek <= 3 ? '全身训练为主' : daysPerWeek === 4 ? '上下肢分化' : '推拉腿分化'} · ${ACTIVITY_ZH[activityLevel]}\n${EQUIP_ACCESS_TEXT[equipment]}`}</Sub>
            <Card style={s.preview}>
              <View style={s.previewMark}>
                <Text style={s.previewT}>你的每日目标</Text>
              </View>
              <View style={s.previewRow}>
                <Text style={s.previewV}>{nut.kcal} kcal</Text>
                <Sub>{`蛋白 ${nut.protein}g · 碳水 ${nut.carbs}g · 脂肪 ${nut.fat}g`}</Sub>
              </View>
              <Sub>{`基础代谢 ${nut.bmr} kcal · 每日消耗 ${nut.tdee} kcal`}</Sub>
            </Card>
          </>
        )}
      </Scroll>

      {stepError() ? (
        <View style={s.errBox}>
          <Text style={s.errT}>{`⚠︎ ${stepError()}`}</Text>
        </View>
      ) : null}

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
  title: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  progressTrack: { height: 8, backgroundColor: C.inset, borderRadius: 99, marginTop: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: C.inkAlphaSoft },
  progressFill: { height: 8, backgroundColor: C.accent, borderRadius: 99 },
  body: { padding: 20, paddingTop: 24 },
  nav: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1.5,
    borderTopColor: C.inkAlphaSoft,
    backgroundColor: C.card,
  },
  row2: { flexDirection: 'row', gap: 12 },
  row3: { flexDirection: 'row', gap: 10 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: {
    width: '47.5%', borderRadius: R.md, borderWidth: 1.5, borderColor: C.inkAlpha, backgroundColor: C.card,
    paddingHorizontal: 14, paddingVertical: 11, gap: 2,
  },
  gridCellOn: { backgroundColor: C.marker, borderColor: 'rgba(107,90,16,0.4)' },
  gridT: { color: C.text, fontSize: 16, fontWeight: '700' },
  gridTTOn: { color: C.markerInk },
  expCell: {
    flex: 1, borderRadius: R.md, borderWidth: 1.5, borderColor: C.inkAlpha, backgroundColor: C.card,
    paddingVertical: 11, alignItems: 'center', gap: 2,
  },
  bigOpt: {
    flex: 1, height: 56, borderRadius: R.md, borderWidth: 1.5, borderColor: C.inkAlpha,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  bigOptOn: { backgroundColor: C.marker, borderColor: 'rgba(107,90,16,0.4)' },
  bigOptT: { color: C.text, fontSize: 17, fontWeight: '700' },
  bigOptTOn: { color: C.markerInk },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  errBox: {
    marginHorizontal: 20, marginBottom: 8, backgroundColor: '#F6DBD5',
    borderWidth: 1.5, borderColor: 'rgba(192,59,46,0.35)', borderRadius: R.sm, padding: 10,
  },
  errT: { color: C.danger, fontSize: 12, fontWeight: '700' },
  preview: { marginTop: 8 },
  previewMark: {
    alignSelf: 'flex-start', backgroundColor: C.marker, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 2,
    marginBottom: 10, transform: [{ rotate: '-0.6deg' }],
  },
  previewT: { color: C.markerInk, fontSize: 13, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  previewV: { color: C.text, fontSize: 26, fontWeight: '800', fontFamily: FONT.extra },
});
