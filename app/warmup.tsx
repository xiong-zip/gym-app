import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Card, Scroll, SectionTitle, Segmented, Sub, Tape, stagger } from '../src/components/ui';
import { GENERAL_WARMUP, STRETCH_GROUPS } from '../src/data/warmup';
import { C, FONT, R } from '../src/theme';
import type { MuscleGroup } from '../src/types';

const MUSCLE_KEY_SET = new Set<string>(STRETCH_GROUPS.map((g) => g.muscle));

export default function WarmupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; focus?: string }>();
  const [tab, setTab] = useState<'warmup' | 'stretch'>(params.tab === 'stretch' ? 'stretch' : 'warmup');

  // 今天课表的部位（session/summary 跳转时带上），拉伸时优先展示
  const focus = (typeof params.focus === 'string' ? params.focus : '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => MUSCLE_KEY_SET.has(s)) as MuscleGroup[];
  const focusGroups = STRETCH_GROUPS.filter((g) => focus.includes(g.muscle));
  const otherGroups = STRETCH_GROUPS.filter((g) => !focus.includes(g.muscle));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={s.closeT}>✕</Text>
        </Pressable>
        <Text style={s.headT}>热身与拉伸</Text>
        <View style={{ width: 20 }} />
      </View>

      <Scroll contentContainerStyle={s.body}>
        <Segmented
          options={[{ value: 'warmup', label: '🤸 练前热身' }, { value: 'stretch', label: '🧘 练后拉伸' }]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'warmup' ? (
          <>
            <Sub style={s.lead}>
              5 分钟把关节与心率叫醒，再做正式组，发力感和安全都会更好。强度以「身体发热、微微出汗」为准。
            </Sub>
            <Animated.View entering={stagger(0)}>
              <Card taped>
                {GENERAL_WARMUP.map((w, i) => (
                  <View key={w.name} style={s.item}>
                    <View style={s.idx}>
                      <Text style={s.idxT}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.itemHead}>
                        <Text style={s.itemT}>{w.name}</Text>
                        <Text style={s.itemDur}>{w.duration}</Text>
                      </View>
                      <Sub>{w.tip}</Sub>
                    </View>
                  </View>
                ))}
              </Card>
            </Animated.View>
          </>
        ) : (
          <>
            <Sub style={s.lead}>
              练完别急着走：静态拉伸每个动作保持 30 秒左右，拉到「紧但不痛」就停，别弹震。
            </Sub>
            {focusGroups.length > 0 ? (
              <Animated.View entering={stagger(0)}>
                <Card taped>
                  <SectionTitle right={<Sub>今天练的部位</Sub>}>优先拉伸</SectionTitle>
                  {focusGroups.map((g) => (
                    <StretchBlock key={g.muscle} label={g.label} items={g.items} highlight />
                  ))}
                </Card>
              </Animated.View>
            ) : null}
            <Animated.View entering={stagger(1)}>
              <Card>
                <SectionTitle>{focusGroups.length > 0 ? '其他部位' : '全身拉伸清单'}</SectionTitle>
                {otherGroups.map((g) => (
                  <StretchBlock key={g.muscle} label={g.label} items={g.items} />
                ))}
              </Card>
            </Animated.View>
          </>
        )}
      </Scroll>
    </SafeAreaView>
  );
}

function StretchBlock({ label, items, highlight }: { label: string; items: { name: string; duration: string; tip: string }[]; highlight?: boolean }) {
  return (
    <View style={[s.group, highlight && s.groupHighlight]}>
      <Text style={s.groupT}>{label}</Text>
      {items.map((it) => (
        <View key={it.name} style={s.item}>
          <View style={s.idx}>
            <Text style={s.idxT}>›</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.itemHead}>
              <Text style={s.itemT}>{it.name}</Text>
              <Text style={s.itemDur}>{it.duration}</Text>
            </View>
            <Sub>{it.tip}</Sub>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: C.inkAlphaSoft, backgroundColor: C.card,
  },
  closeT: { color: C.sub, fontSize: 20, fontWeight: '700' },
  headT: { color: C.text, fontSize: 16, fontWeight: '800' },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  lead: { lineHeight: 18, paddingHorizontal: 2 },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 9, alignItems: 'flex-start' },
  idx: {
    width: 24, height: 24, borderRadius: 999, backgroundColor: C.inset, borderWidth: 1.5, borderColor: C.inkAlphaSoft,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  idxT: { color: C.accent, fontSize: 12, fontWeight: '900', fontFamily: FONT.extra },
  itemHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2, flex: 1, paddingRight: 4 },
  itemT: { color: C.text, fontSize: 15, fontWeight: '700', flex: 1 },
  itemDur: { color: C.accent, fontSize: 12, fontWeight: '700', fontFamily: FONT.semi },
  group: { marginBottom: 6 },
  groupHighlight: {
    backgroundColor: '#FBF3D5', borderRadius: R.sm, borderWidth: 1.5, borderColor: 'rgba(107,90,16,0.25)',
    padding: 10, marginHorizontal: -10, marginBottom: 12,
  },
  groupT: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 4, fontFamily: FONT.extra },
});
