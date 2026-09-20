import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, SectionTitle, Sub, TextInputLine, stagger } from '../../src/components/ui';
import { ACTIVITY_ZH, calcNutrition, GENDER_ZH, GOAL_ZH } from '../../src/lib/nutrition';
import { EQUIP_ACCESS_TEXT } from '../../src/lib/planner';
import { useDietStore } from '../../src/store/diet';
import { useMetricsStore } from '../../src/store/metrics';
import { useProfileStore } from '../../src/store/profile';
import { useScheduleStore } from '../../src/store/schedule';
import { useSettingsStore } from '../../src/store/settings';
import { useWorkoutsStore } from '../../src/store/workouts';
import { C, FONT } from '../../src/theme';

const AI_HINTS = [
  'OpenAI：https://api.openai.com/v1 · gpt-4o-mini',
  '智谱 GLM：https://open.bigmodel.cn/api/paas/v4 · glm-4-flash',
  'DeepSeek：https://api.deepseek.com · deepseek-chat',
  '拍照识餐需视觉模型：glm-4v-flash（免费）/ gpt-4o-mini',
];

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const ai = useSettingsStore((s) => s.ai);
  const setAI = useSettingsStore((s) => s.setAI);
  const clearWorkouts = useWorkoutsStore((s) => s.clear);
  const clearDiet = useDietStore((s) => s.clear);
  const clearMetrics = useMetricsStore((s) => s.clear);
  const clearSchedule = useScheduleStore((s) => s.clear);
  const clearProfile = useProfileStore((s) => s.clear);

  if (!profile) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const nut = calcNutrition(profile);
  const expLabel = profile.experience === 'beginner' ? '新手' : profile.experience === 'intermediate' ? '中级' : '高级';

  const rows: [string, string][] = [
    ['性别 / 年龄', `${GENDER_ZH[profile.gender]} · ${profile.age}岁`],
    ['身高 / 体重', `${profile.heightCm}cm · ${profile.weightKg}kg`],
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
          clearProfile();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.body}>
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
            <View style={{ gap: 10, marginTop: 12, opacity: ai.enabled ? 1 : 0.45 }}>
              <TextInputLine value={ai.baseUrl} onChange={(v) => setAI({ baseUrl: v })} placeholder="接口地址（兼容 OpenAI 格式）" />
              <TextInputLine value={ai.model} onChange={(v) => setAI({ model: v })} placeholder="模型名称" />
              <TextInputLine value={ai.apiKey} onChange={(v) => setAI({ apiKey: v })} placeholder="API Key" secure />
            </View>
            <View style={{ marginTop: 12, gap: 4 }}>
              {AI_HINTS.map((h) => (
                <Sub key={h} style={{ fontSize: 11 }}>{h}</Sub>
              ))}
            </View>
            <Sub style={{ marginTop: 8, fontSize: 11 }}>Key 只保存在本机，请求直接从手机发到你所填的服务地址。</Sub>
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(3)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle>数据管理</SectionTitle>
            <Button title="清空所有数据" kind="danger" small onPress={clearAll} />
          </Card>
        </Animated.View>

        <Animated.View entering={stagger(4)}>
          <Card style={{ marginTop: 14 }}>
            <SectionTitle>关于</SectionTitle>
            <Sub>
              健身搭子 v1.4.0{'\n'}
              本应用提供的训练与饮食建议仅供健康人群参考，不构成医疗建议。如有伤病、孕期或慢性疾病，请先咨询医生。食物营养数据为近似值。
            </Sub>
          </Card>
        </Animated.View>
      </ScrollView>
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
});
