import type { Profile } from '../types';

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

/** Web 端不支持本地通知，全部为空实现 */
export async function setupNotifications(): Promise<void> {
  /* no-op */
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function rescheduleTrainingReminders(_profile: Profile | null, _r: ReminderSettings): Promise<void> {
  /* no-op */
}
