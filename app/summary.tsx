import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Button, Card, Confetti, Stamp, Stat, Sub, stagger, useCountUp } from '../src/components/ui';
import { fmtDur } from '../src/lib/date';
import { useWorkoutsStore } from '../src/store/workouts';
import { C, FONT, R } from '../src/theme';

export default function SummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const logs = useWorkoutsStore((s) => s.logs);
  const log = logs.find((l) => l.id === id) ?? null;

  if (!log) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Sub>找不到这条训练记录</Sub>
          <Button title="回到首页" kind="ghost" onPress={() => router.navigate('/')} />
        </View>
      </SafeAreaView>
    );
  }

  const totalSets = log.exercises.reduce((a, e) => a + e.sets.length, 0);
  const volume = Math.round(log.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.weight * s.reps, 0), 0));

  // 新纪录检测：对比本次之前同动作的历史最高重量
  // 动作库动作按 ID 归组；自定义动作（ID <= 0）按名称归组
  const keyOf = (e: { exerciseId: number; name: string }) => (e.exerciseId > 0 ? `id:${e.exerciseId}` : `name:${e.name}`);
  const priorLogs = logs.filter((l) => l.id !== log.id);
  const prExercises = log.exercises.filter((e) => {
    const key = keyOf(e);
    const prevMax = Math.max(
      0,
      ...priorLogs
        .flatMap((pl) => pl.exercises.filter((pe) => keyOf(pe) === key).flatMap((pe) => pe.sets.map((s) => s.weight))),
    );
    const curMax = Math.max(...e.sets.map((s) => s.weight), 0);
    return prevMax > 0 && curMax > prevMax;
  });

  const statsText = `${log.title} · ${totalSets}组 · ${volume}kg · ${fmtDur(log.durationSec)}`;

  const goPlog = () => {
    router.push({
      pathname: '/plog',
      params: { kind: 'workout', title: log.title, stats: statsText },
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Confetti />
      <ScrollView contentContainerStyle={s.body}>
        <Animated.View entering={stagger(0)} style={s.stampWrap}>
          <Stamp label="训练完成" fontSize={20} rotate={-6} />
        </Animated.View>

        <Animated.View entering={stagger(1)}>
          <Card style={s.main} taped>
            <Text style={s.title}>{log.title}</Text>
            <View style={s.statRow}>
              <Stat label="完成组数" value={totalSets} unit="组" color={C.accent} count />
              <View style={s.statDivider} />
              <Stat label="总容量" value={volume} unit="kg" count />
              <View style={s.statDivider} />
              <Stat label="用时" value={fmtDur(log.durationSec)} />
            </View>
            <View style={s.dashDivider} />
            <Sub>下次同动作会自动参考本次重量，继续保持。</Sub>
          </Card>
        </Animated.View>

        {prExercises.length > 0 && (
          <Animated.View entering={stagger(2)}>
            <Card style={s.prCard}>
              <View style={s.prHead}>
                <Text style={s.prEmoji}>🏆</Text>
                <Text style={s.prT}>新纪录！</Text>
              </View>
              {prExercises.map((e) => {
                const best = Math.max(...e.sets.map((s) => s.weight));
                return (
                  <Text key={e.exerciseId} style={s.prItem}>{`✎ ${e.name} · ${best}kg`}</Text>
                );
              })}
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={stagger(3)} style={s.btnCol}>
          <Button title="📷 拍一张手帐" onPress={goPlog} />
          <Button title="回到首页" kind="ghost" onPress={() => router.navigate('/')} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  body: { padding: 20, paddingTop: 48, gap: 16, paddingBottom: 40 },
  stampWrap: { alignItems: 'center', marginTop: 20 },
  main: { padding: 20 },
  title: { color: C.text, fontSize: 21, fontWeight: '800', marginBottom: 14, textAlign: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: C.line, marginHorizontal: 6 },
  dashDivider: { borderStyle: 'dashed', borderWidth: 1, borderColor: C.line, marginVertical: 14, borderRadius: 0.5 },
  prCard: { backgroundColor: '#FBF3D5', borderColor: 'rgba(107,90,16,0.3)' },
  prHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  prEmoji: { fontSize: 20 },
  prT: { color: C.markerInk, fontSize: 16, fontWeight: '800' },
  prItem: { color: C.markerInk, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  btnCol: { gap: 10, marginTop: 8 },
});
