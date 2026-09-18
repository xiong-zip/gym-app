import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useDietStore } from '../src/store/diet';
import { useMetricsStore } from '../src/store/metrics';
import { useProfileStore } from '../src/store/profile';
import { useScheduleStore } from '../src/store/schedule';
import { useSettingsStore } from '../src/store/settings';
import { useWorkoutsStore } from '../src/store/workouts';
import { C } from '../src/theme';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const ready =
    useProfileStore((s) => s._h) &&
    useSettingsStore((s) => s._h) &&
    useWorkoutsStore((s) => s._h) &&
    useDietStore((s) => s._h) &&
    useMetricsStore((s) => s._h) &&
    useScheduleStore((s) => s._h);
  const hasProfile = useProfileStore((s) => s.profile !== null);

  useEffect(() => {
    if (ready && !hasProfile && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [ready, hasProfile, pathname, router]);

  if (!ready) {
    return (
      <View style={s.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="session" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
});
