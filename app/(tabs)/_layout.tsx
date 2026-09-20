import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { C, FONT } from '../../src/theme';

const TABS = [
  { route: 'index', title: '今日', icon: 'today' },
  { route: 'plans', title: '计划', icon: 'barbell' },
  { route: 'diet', title: '饮食', icon: 'nutrition' },
  { route: 'journal', title: '手帐', icon: 'book' },
  { route: 'profile', title: '我的', icon: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.inkAlphaSoft,
          borderTopWidth: 1.5,
          height: 62,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', fontFamily: FONT.semi },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.route}
          name={t.route}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={(focused ? t.icon : `${t.icon}-outline`) as keyof typeof Ionicons.glyphMap} size={size - 2} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
