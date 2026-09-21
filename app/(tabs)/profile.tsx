import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, Chip, Press, Scroll, SectionTitle, Sub, TextInputLine, stagger } from '../../src/components/ui';
import { chat } from '../../src/lib/ai';
import { requestNotificationPermission, rescheduleTrainingReminders } from '../../src/lib/notify';
import { ACTIVITY_ZH, bmi, calcNutrition, GENDER_ZH, GOAL_ZH } from '../../src/lib/nutrition';
import { EQUIP_ACCESS_TEXT } from '../../src/lib/planner';
import { useDietStore } from '../../src/store/diet';
import { useJournalStore } from '../../src/store/journal';
import { latestWeight, useMetricsStore } from '../../src/store/metrics';
import { useProfileStore } from '../../src/store/profile';
import { useScheduleStore } from '../../src/store/schedule';
import { useSessionDraftStore } from '../../src/store/sessionDraft';
import { useSettingsStore } from '../../src/store/settings';
import { useWorkoutsStore } from '../../src/store/workouts';
import { C, FONT } from '../../src/theme';

const AI_PRESETS = [
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash' },
  { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
];

const AI_HINTS = [
  '内置已接 DeepSeek（deepseek-flash）：支持拍照识餐与计划生成，开箱即用',
  '也可换成其他兼容 OpenAI 的服务；Key 只保存在本机。',
];

const TIME_PRESETS: [string, number, number][] = [
  ['7:00', 7, 0], ['12:00', 12, 0], ['18:00', 18, 0], ['19:00', 19, 0], ['20:00', 20, 0], ['21:00', 21, 0],
];

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const ai = useSettingsStore((s) => s.ai);
  const setAI = useSettingsStore((s) => s.setAI);
  const metrics = useMetricsStore((s) => s.entries);
  const clearWorkouts = useWorkoutsStore((s) => s.clear);
  const clearDiet = useDietStore((s) => s.clear);
  const clearMetrics = useMetricsStore((s) => s.clear);
  const clearSchedule = useScheduleStore((s) => s.clear);
  const clearJournal = useJournalStore((s) => s.clear);
  const clearDraft = useSessionDraftStore((s) => s.clear);
  const clearProfile = useProfileStore((s) => s.clear);

  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sound = useSettingsStore((s) => s.sound);
  const setSound = useSettingsStore((s) => s.setSound);
  const reminder = useSettingsStore((s) => s.reminder);
  const setReminder = useSettingsStore((s) => s.setReminder);

  const pad2 = (n: number) => String(n).padStart(2, '0');

  const toggleReminder = async (v: boolean) => {
    if (v) {
      if (Platform.OS === 'web') {
        Alert.alert('仅手机端支持', '本地通知需要在手机 App 上开启。');
        return;
      }
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert('未获得通知权限', '去系统设置 → 应用 → 健身搭子，开启「通知」权限后再回来打开。');
        return;
      }
      setReminder({ enabled: true });
      void rescheduleTrainingReminders(profile, { ...reminder, enabled: true });
    } else {
      setReminder({ enabled: false });
      void rescheduleTrainingReminders(profile, { ...reminder, enabled: false });
    }
  };

  const changeReminderTime = (hour: number, minute: number) => {
    setReminder({ hour, minute });
    void rescheduleTrainingReminders(profile, { ...reminder, hour, minute });
  };

  if (!profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const nut = calcNutrition(profile);
  const expLabel = profile.experience === 'beginner' ? '新手' : profile.experience === 'intermediate' ? '中级' : '高级';
  const bmiVal = bmi(latestWeight(metrics) ?? profile.weightKg, profile.heightCm);

  const rows: [string, string][] = [
    ['性别 / 年龄', `${GENDER_ZH[profile.gender]} · ${profile.age}岁`],
    ['身高 / 体重', `${profile.heightCm}cm · ${profile.weightKg}kg`],
    ['BMI', `${bmiVal}（按最新体重）`],
    ['目标', GOAL_ZH[profile.goal]],
    ['训练经验', expLabel],
    ['每周训练', `${profile.daysPerWeek} 天`],
    ['器械条件', EQUIP_ACCESS_TEXT[profile.equipment]],
    ['日常活动量', ACTIVITY_ZH[profile.activityLevel]],
  ];

  const clearAll = () => {
    Alert.alert('清空所有数据？', '包括个人信息、训练记录、饮食记录、体重与手帐，不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => {
          clearWorkouts();
          clearDiet();
          clearMetrics();
          clearSchedule();
          clearJournal();
          clearDraft();
          clearProfile();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const applyPreset = (p: (typeof AI_PRESETS)[number]) => {
    setAI({ baseUrl: p.baseUrl, model: p.model });
    setTestMsg(null);
  };

  const testConn = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      await chat(ai, [{ role: 'user', content: '请只回复：ok' }], 0.2, 15000);
      setTestMsg({ ok: true, text: '连接成功，模型已正常回复 ✓' });
    } catch (e) {
      setTestMsg({ ok: false, text: e instanceof Error ? e.message : '连接失败，请重试' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Scroll contentContainerStyle={s.body}>
        <Text style={s.title}>我的</Text>

        <Animated.View entering={stagger(0)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle
              right={
                <Text style={s.editT} onPress={() => router.push('/onboarding?edit=1')}>重新设置 ›</Text>
              }
            >
              个人信息
            </SectionTitle>
            {rows.map(([k, v]) => (
              <View key={k} style={s.row}>
                <Sub>{k}</Sub>
                <Text style={s.rowV}>{v}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(1)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle>每日营养目标</SectionTitle>
            <View style={s.nutGrid}>
              <View style={s.nutItem}><Text style={s.nutV}>{nut.kcal}</Text><Sub>热量 kcal</Sub></View>
              <View style={s.nutItem}><Text style={[s.nutV, { color: C.good }]}>{nut.protein}g</Text><Sub>蛋白质</Sub></View>
              <View style={s.nutItem}><Text style={[s.nutV, { color: C.warn }]}>{nut.carbs}g</Text><Sub>碳水</Sub></View>
              <View style={s.nutItem}><Text style={[s.nutV, { color: C.pink }]}>{nut.fat}g</Text><Sub>脂肪</Sub></View>
            </View>
            <Sub>{`基础代谢 ${nut.bmr} kcal · 每日消耗 ${nut.tdee} kcal（Mifflin-St Jeor 公式）`}</Sub>
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(2)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle
              right={
                <Switch
                  value={ai.enabled}
                  onValueChange={(v) => setAI({ enabled: v })}
                  trackColor={{ false: C.line, true: C.accent }}
                  thumbColor="#FFFDF6"
                />
              }
            >
              AI 能力
            </SectionTitle>
            <Sub>{ai.enabled ? '已启用：训练计划与减脂建议会优先调用 AI' : '未启用：使用内置规则引擎（无需联网）'}</Sub>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {AI_PRESETS.map((p) => {
                const on = ai.baseUrl === p.baseUrl;
                return (
                  <Press
                    key={p.label}
                    style={[s.presetChip, on && s.presetOn]}
                    onPress={() => applyPreset(p)}
                  >
                    <Text style={[s.presetT, on && { color: C.accent }]}>{p.label}</Text>
                  </Press>
                );
              })}
            </View>
            <View style={{ gap: 10, marginTop: 10, opacity: ai.enabled ? 1 : 0.45 }}>
              <TextInputLine value={ai.baseUrl} onChange={(v) => { setAI({ baseUrl: v }); setTestMsg(null); }} placeholder="接口地址（兼容 OpenAI 格式）" />
              <TextInputLine value={ai.model} onChange={(v) => { setAI({ model: v }); setTestMsg(null); }} placeholder="模型名称" />
              <TextInputLine value={ai.apiKey} onChange={(v) => { setAI({ apiKey: v }); setTestMsg(null); }} placeholder="API Key" secure />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <Button
                title="测试连接"
                kind="ghost"
                small
                loading={testing}
                disabled={!ai.apiKey || !ai.baseUrl || !ai.model || testing}
                onPress={testConn}
              />
              {testMsg ? (
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: testMsg.ok ? C.good : C.danger }}>
                  {testMsg.text}
                </Text>
              ) : null}
            </View>
            <View style={{ marginTop: 12, gap: 4 }}>
              {AI_HINTS.map((h) => (
                <Sub key={h} style={{ fontSize: 11 }}>{h}</Sub>
              ))}
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(3)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle>提醒与反馈</SectionTitle>
            <View style={s.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.rowTitleT}>组间休息提示音</Text>
                <Sub>倒计时结束「叮」一声，手机放地上也听得见（静音模式照常响）</Sub>
              </View>
              <Switch
                value={sound}
                onValueChange={setSound}
                trackColor={{ false: C.line, true: C.accent }}
                thumbColor="#FFFDF6"
              />
            </View>
            <View style={[s.switchRow, { marginTop: 14 }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.rowTitleT}>训练日提醒</Text>
                <Sub>
                  {reminder.enabled
                    ? `每个训练日 ${pad2(reminder.hour)}:${pad2(reminder.minute)} 提醒，通知带当天部位`
                    : '按你的周计划在训练日提醒，App 没开也能收到'}
                </Sub>
              </View>
              <Switch
                value={reminder.enabled}
                onValueChange={(v) => { void toggleReminder(v); }}
                trackColor={{ false: C.line, true: C.accent }}
                thumbColor="#FFFDF6"
              />
            </View>
            {reminder.enabled ? (
              <View style={{ gap: 8, marginTop: 12 }}>
                <Sub style={{ fontSize: 11 }}>提醒时间（快选或自定义）</Sub>
                <View style={s.chipWrap}>
                  {TIME_PRESETS.map(([label, h, m]) => (
                    <Chip
                      key={label}
                      label={label}
                      selected={reminder.hour === h && reminder.minute === m}
                      onPress={() => changeReminderTime(h, m)}
                    />
                  ))}
                </View>
                <View style={s.chipWrap}>
                  {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => (
                    <Chip key={h} label={`${h}点`} selected={reminder.hour === h} onPress={() => changeReminderTime(h, reminder.minute)} />
                  ))}
                </View>
                <View style={s.chipWrap}>
                  {[0, 15, 30, 45].map((m) => (
                    <Chip key={m} label={`${pad2(m)}分`} selected={reminder.minute === m} onPress={() => changeReminderTime(reminder.hour, m)} />
                  ))}
                </View>
                <Sub style={{ fontSize: 11, marginTop: 4 }}>
                  小米 / 华为等机型请在系统里允许健身搭子自启动并加入省电白名单，否则通知可能被拦截。
                </Sub>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(4)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle>数据管理</SectionTitle>
            <Button title="清空所有数据" kind="danger" small onPress={clearAll} />
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(5)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle>关于</SectionTitle>
            <Sub>
              健身搭子 v1.4.0{'\n'}
              本应用提供的训练与饮食建议仅供健康人群参考，不构成医疗建议。如有伤病、孕期或慢性疾病，请先咨询医生。食物营养数据为近似值。
            </Sub>
          </Card>
        </Animated.View>
      </Scroll>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { padding: 16, paddingBottom: 40 },
  title: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 8, letterSpacing: 0.5 },
  editT: { color: C.accent, fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed',
  },
  rowV: { color: C.text, fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  nutGrid: { flexDirection: 'row', marginBottom: 12 },
  nutItem: { flex: 1, alignItems: 'center' },
  nutV: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 3, fontFamily: FONT.extra },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  rowTitleT: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    borderRadius: 999, borderWidth: 1.5, borderColor: C.inkAlpha, backgroundColor: C.card,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  presetOn: { borderColor: C.accent, backgroundColor: '#FBEAE2' },
  presetT: { color: C.sub, fontSize: 13, fontWeight: '700' },
});
