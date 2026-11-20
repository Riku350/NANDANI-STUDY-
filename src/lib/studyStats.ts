import { ChapterProgress, StudySession, UserSubject } from '../types/study';

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getWeekStartDateKey(now: Date = new Date()): string {
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  return getLocalDateKey(monday);
}

export function getWeekRangeLabel(now: Date = new Date()): string {
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  if (seconds > 0) return `${seconds}s`;
  return '0m';
}

export function formatHoursDecimal(totalSeconds: number): string {
  const hours = Math.max(0, totalSeconds) / 3600;
  if (hours >= 10) return `${Math.round(hours)} Hours`;
  return `${hours.toFixed(1)} Hours`;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getFirstName(displayName?: string | null): string {
  if (!displayName?.trim()) return 'Student';
  return displayName.trim().split(/\s+/)[0];
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
}

export function calculateStreaks(sessions: StudySession[], now: Date = new Date()): StreakResult {
  const activeDates = new Set<string>();
  for (const s of sessions) {
    if (s.durationSeconds > 0 && s.dateKey) {
      activeDates.add(s.dateKey);
    }
  }

  if (activeDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0, studiedToday: false };
  }

  const todayKey = getLocalDateKey(now);
  const studiedToday = activeDates.has(todayKey);

  // Calculate current streak walking backwards from today (or yesterday if not studied yet today)
  let currentStreak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!studiedToday) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDates.has(getLocalDateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Calculate longest streak across sorted unique dates
  const sortedDates = Array.from(activeDates).sort();
  let longestStreak = 1;
  let running = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseDateKey(sortedDates[i - 1]);
    const curr = parseDateKey(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else if (diffDays > 1) {
      running = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    studiedToday,
  };
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export interface SubjectBreakdownItem {
  subjectId: string;
  subjectName: string;
  accentColor: string;
  seconds: number;
  minutes: number;
  hours: number;
  percentage: number;
}

export function buildSubjectBreakdown(
  sessions: StudySession[],
  subjects: UserSubject[]
): SubjectBreakdownItem[] {
  const secondsBySubject = new Map<string, number>();
  let total = 0;

  for (const s of sessions) {
    const prev = secondsBySubject.get(s.subjectId) || 0;
    secondsBySubject.set(s.subjectId, prev + s.durationSeconds);
    total += s.durationSeconds;
  }

  return subjects.map((subj) => {
    const sec = secondsBySubject.get(subj.id) || 0;
    return {
      subjectId: subj.id,
      subjectName: subj.name,
      accentColor: subj.accentColor,
      seconds: sec,
      minutes: Math.round(sec / 60),
      hours: Number((sec / 3600).toFixed(2)),
      percentage: total > 0 ? Math.round((sec / total) * 100) : 0,
    };
  });
}

export interface WeeklyDayPoint {
  dayShort: string;
  dayFull: string;
  dateKey: string;
  seconds: number;
  minutes: number;
  hours: number;
  isToday: boolean;
}

export interface WeeklyReportData {
  days: WeeklyDayPoint[];
  totalSeconds: number;
  averageDailySeconds: number;
  bestDayName: string;
  bestDaySeconds: number;
  subjectBreakdown: SubjectBreakdownItem[];
}

export function computeWeeklyReport(
  sessions: StudySession[],
  subjects: UserSubject[],
  now: Date = new Date()
): WeeklyReportData {
  // Monday-first week containing `now`
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const todayKey = getLocalDateKey(now);

  const dayShorts = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayFulls = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const dateKeysInWeek: string[] = [];
  const days: WeeklyDayPoint[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dk = getLocalDateKey(d);
    dateKeysInWeek.push(dk);
    days.push({
      dayShort: dayShorts[i],
      dayFull: dayFulls[i],
      dateKey: dk,
      seconds: 0,
      minutes: 0,
      hours: 0,
      isToday: dk === todayKey,
    });
  }

  const weekSet = new Set(dateKeysInWeek);
  const weekSessions = sessions.filter((s) => weekSet.has(s.dateKey));

  for (const s of weekSessions) {
    const idx = dateKeysInWeek.indexOf(s.dateKey);
    if (idx !== -1) {
      days[idx].seconds += s.durationSeconds;
    }
  }

  let totalSeconds = 0;
  let bestDayName = 'No sessions yet';
  let bestDaySeconds = 0;

  for (const d of days) {
    d.minutes = Math.round(d.seconds / 60);
    d.hours = Number((d.seconds / 3600).toFixed(2));
    totalSeconds += d.seconds;
    if (d.seconds > bestDaySeconds) {
      bestDaySeconds = d.seconds;
      bestDayName = d.dayFull;
    }
  }

  const daysElapsed = Math.max(1, dayOfWeek === 0 ? 7 : dayOfWeek);
  const averageDailySeconds = Math.round(totalSeconds / daysElapsed);

  return {
    days,
    totalSeconds,
    averageDailySeconds,
    bestDayName,
    bestDaySeconds,
    subjectBreakdown: buildSubjectBreakdown(weekSessions, subjects),
  };
}

export interface MonthlyReportData {
  monthKey: string;
  monthLabel: string;
  totalSeconds: number;
  averageDailySeconds: number;
  totalSessions: number;
  mostStudiedSubject: string;
  leastStudiedSubject: string;
  completedChaptersInMonth: number;
  subjectBreakdown: SubjectBreakdownItem[];
  dailyTrend: { day: number; dateKey: string; minutes: number; hours: number }[];
}

export function computeMonthlyReport(
  sessions: StudySession[],
  subjects: UserSubject[],
  chapters: ChapterProgress[],
  monthKey: string
): MonthlyReportData {
  const [yearNum, monthNum] = monthKey.split('-').map(Number);
  const monthDate = new Date(yearNum, (monthNum || 1) - 1, 1);
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(yearNum, monthNum || 1, 0).getDate();

  const monthSessions = sessions.filter((s) => s.monthKey === monthKey);
  const totalSeconds = monthSessions.reduce((acc, s) => acc + s.durationSeconds, 0);

  const now = new Date();
  const isCurrentMonth = getLocalMonthKey(now) === monthKey;
  const divisorDays = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
  const averageDailySeconds = Math.round(totalSeconds / divisorDays);

  const breakdown = buildSubjectBreakdown(monthSessions, subjects);
  const sortedDesc = [...breakdown].sort((a, b) => b.seconds - a.seconds);
  const mostStudiedSubject =
    sortedDesc.length > 0 && sortedDesc[0].seconds > 0 ? sortedDesc[0].subjectName : 'None yet';
  const leastStudiedSubject =
    sortedDesc.length > 0 ? sortedDesc[sortedDesc.length - 1].subjectName : 'None yet';

  const completedChaptersInMonth = chapters.filter(
    (ch) => ch.status === 'completed' && ch.completedAtIso.startsWith(monthKey)
  ).length;

  const byDay = new Map<number, number>();
  for (const s of monthSessions) {
    const dayNum = Number(s.dateKey.slice(8, 10));
    byDay.set(dayNum, (byDay.get(dayNum) || 0) + s.durationSeconds);
  }

  const dailyTrend: { day: number; dateKey: string; minutes: number; hours: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const sec = byDay.get(d) || 0;
    dailyTrend.push({
      day: d,
      dateKey: `${monthKey}-${String(d).padStart(2, '0')}`,
      minutes: Math.round(sec / 60),
      hours: Number((sec / 3600).toFixed(2)),
    });
  }

  return {
    monthKey,
    monthLabel,
    totalSeconds,
    averageDailySeconds,
    totalSessions: monthSessions.length,
    mostStudiedSubject,
    leastStudiedSubject,
    completedChaptersInMonth,
    subjectBreakdown: breakdown,
    dailyTrend,
  };
}

export function getRecentMonthOptions(count: number = 6, now: Date = new Date()): { key: string; label: string }[] {
  const options: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      key: getLocalMonthKey(d),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return options;
}

export function getSubjectColorHex(accentColor: string): string {
  switch (accentColor) {
    case 'blue':
      return '#3B82F6';
    case 'amber':
      return '#F59E0B';
    case 'emerald':
      return '#10B981';
    case 'rose':
      return '#F43F5E';
    case 'violet':
      return '#8B5CF6';
    case 'cyan':
      return '#06B6D4';
    case 'teal':
      return '#14B8A6';
    case 'indigo':
      return '#6366F1';
    default:
      return '#3B82F6';
  }
}

export function getWeakestSubject(
  subjects: UserSubject[],
  chapters: ChapterProgress[],
  sessions: StudySession[]
): { subject: UserSubject; completionPct: number; totalSeconds: number } | null {
  if (subjects.length === 0) return null;
  const scored = subjects.map((subj) => {
    const subjChapters = chapters.filter((c) => c.subjectId === subj.id);
    const done = subjChapters.filter((c) => c.status === 'completed').length;
    const completionPct = subjChapters.length > 0 ? Math.round((done / subjChapters.length) * 100) : 0;
    const totalSeconds = sessions
      .filter((s) => s.subjectId === subj.id)
      .reduce((acc, s) => acc + s.durationSeconds, 0);
    return { subject: subj, completionPct, totalSeconds };
  });

  scored.sort((a, b) => {
    if (a.completionPct !== b.completionPct) return a.completionPct - b.completionPct;
    return a.totalSeconds - b.totalSeconds;
  });

  return scored[0];
}
