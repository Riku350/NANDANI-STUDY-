import { APP_CONFIG } from '../config/appConfig';

export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function triggerBrowserNotification(
  title: string,
  body: string,
  tag?: string
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }
  try {
    const notification = new Notification(title, {
      body,
      tag: tag || `nandani-study-${Date.now()}`,
      silent: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export const HOURS_24_MS = 24 * 60 * 60 * 1000;

export function getNotificationStorageKeys(uid: string) {
  return {
    goalReachedDateKey: `nandani_study_notif_goal_date_${uid}`,
    inactivityAlertMsKey: `nandani_study_notif_inactivity_ms_${uid}`,
    firstSeenMsKey: `nandani_study_first_seen_ms_${uid}`,
  };
}

export function getOrInitFirstSeenMs(uid: string): number {
  const { firstSeenMsKey } = getNotificationStorageKeys(uid);
  try {
    const existing = localStorage.getItem(firstSeenMsKey);
    if (existing) {
      const parsed = Number(existing);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const now = Date.now();
    localStorage.setItem(firstSeenMsKey, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function hasNotifiedGoalToday(uid: string, todayKey: string): boolean {
  const { goalReachedDateKey } = getNotificationStorageKeys(uid);
  try {
    return localStorage.getItem(goalReachedDateKey) === todayKey;
  } catch {
    return false;
  }
}

export function markGoalNotifiedToday(uid: string, todayKey: string): void {
  const { goalReachedDateKey } = getNotificationStorageKeys(uid);
  try {
    localStorage.setItem(goalReachedDateKey, todayKey);
  } catch {
    // ignore storage errors
  }
}

export function canNotifyInactivity(uid: string, nowMs: number = Date.now()): boolean {
  const { inactivityAlertMsKey } = getNotificationStorageKeys(uid);
  try {
    const raw = localStorage.getItem(inactivityAlertMsKey);
    if (!raw) return true;
    const lastMs = Number(raw);
    if (!Number.isFinite(lastMs)) return true;
    return nowMs - lastMs >= HOURS_24_MS;
  } catch {
    return true;
  }
}

export function markInactivityNotified(uid: string, nowMs: number = Date.now()): void {
  const { inactivityAlertMsKey } = getNotificationStorageKeys(uid);
  try {
    localStorage.setItem(inactivityAlertMsKey, String(nowMs));
  } catch {
    // ignore storage errors
  }
}

export function buildGoalReachedCopy(goalText: string) {
  return {
    title: `Daily Goal Reached — ${APP_CONFIG.APP_NAME}`,
    body: `Well done! You reached your ${goalText} study goal for today.`,
  };
}

export function buildInactivityCopy(hoursElapsed: number) {
  const roundedHours = Math.max(24, Math.floor(hoursElapsed));
  return {
    title: `Time to Study — ${APP_CONFIG.APP_NAME}`,
    body: `It has been ${roundedHours} hours since your last study session. Start a quick session to stay on track.`,
  };
}
