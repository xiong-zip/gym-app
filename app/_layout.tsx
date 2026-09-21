import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import { Caveat_600SemiBold, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { useDietStore } from '../src/store/diet';
import { useJournalStore } from '../src/store/journal';
import { useMetricsStore } from '../src/store/metrics';
import { useProfileStore } from '../src/store/profile';
import { useScheduleStore } from '../src/store/schedule';
import { useSessionDraftStore } from '../src/store/sessionDraft';
import { useSettingsStore } from '../src/store/settings';
import { useWorkoutsStore } from '../src/store/workouts';
import { rescheduleTrainingReminders, setupNotifications } from '../src/lib/notify';
import '../src/lib/alertPolyfill';
import '../src/lib/noScrollbar';
import { C, FONT } from '../src/theme';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
    Caveat_600SemiBold, Caveat_700Bold,
  });
  const ready =
    useProfileStore((s) => s._h) &&
    useSettingsStore((s) => s._h) &&
    useWorkoutsStore((s) => s._h) &&
    useDietStore((s) => s._h) &&
    useMetricsStore((s) => s._h) &&
    useScheduleStore((s) => s._h) &&
    useSessionDraftStore((s) => s._h) &&
    useJournalStore((s) => s._h);
  const hasProfile = useProfileStore((s) => s.profile !== null);
  const profile = useProfileStore((s) => s.profile);
  const reminder = useSettingsStore((s) => s.reminder);

  useEffect(() => {
    if (ready && !hasProfile && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [ready, hasProfile, pathname, router]);

  // 本地通知：启动即建渠道并滚动重排未来两周的训练日提醒（设置变化也会触发）
  useEffect(() => {
    if (!ready) return;
    void setupNotifications();
    void rescheduleTrainingReminders(profile, reminder);
  }, [ready, profile, reminder]);

  if (!ready || !fontsLoaded) {
    return (
      <View style={s.center}>
        <StatusBar style="dark" />
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={s.loadingT}>翻开手帐…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="session" options={{ presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 260 }} />
        <Stack.Screen name="summary" options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom', animationDuration: 300 }} />
        <Stack.Screen name="plog" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', animationDuration: 260 }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingT: { color: C.sub, fontSize: 15, fontFamily: FONT.hand, letterSpacing: 1 },
});
