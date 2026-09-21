import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Profile } from '../types';
import { addDays, todayKey, weekdayOf } from './date';
import { SESSION_DEFS, sessionForWeekday } from './planner';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const CHANNEL_ID = 'training';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** App 启动时调用：建 Android 通知渠道 */
export async function setupNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: '训练提醒',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }
  } catch { /* 权限异常时静默，设置页会再引导 */ }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/**
 * 重排训练日提醒：按 profile 的周分化，滚动排未来 14 天内每个训练日的
 * 日历触发本地通知（App 每次启动都会调用，窗口自动向前滚）。
 */
export async function rescheduleTrainingReminders(profile: Profile | null, r: ReminderSettings): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!profile || !r.enabled) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;

    const triggers: { id: string; date: Date; body: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const key = addDays(todayKey(), i);
      const type = sessionForWeekday(profile.daysPerWeek, weekdayOf(key));
      if (!type) continue;
      const date = new Date(`${key}T00:00:00`);
      date.setHours(r.hour, r.minute, 0, 0);
      if (date.getTime() <= Date.now()) continue;
      triggers.push({ id: `training-${key}`, date, body: `今天的安排：${SESSION_DEFS[type].label}，打开看看课表吧。` });
    }
    for (const t of triggers) {
      await Notifications.scheduleNotificationAsync({
        identifier: t.id,
        content: { title: '练搭子时间到 💪', body: t.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: t.date, channelId: CHANNEL_ID },
      });
    }
  } catch { /* 排程失败静默，不阻塞启动 */ }
}
