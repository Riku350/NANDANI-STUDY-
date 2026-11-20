import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  ListChecks,
  Play,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStudy } from '../context/StudyContext';
import {
  buildSubjectBreakdown,
  calculateStreaks,
  computeMonthlyReport,
  computeWeeklyReport,
  formatDuration,
  formatHoursDecimal,
  getLocalDateKey,
  getLocalMonthKey,
  getRecentMonthOptions,
  getSubjectColorHex,
} from '../lib/studyStats';
import type { AnalyticsRange } from '../types/study';
import { AnimatedNumber } from './AnimatedNumber';
import { GlobalLeaderboard } from './GlobalLeaderboard';
import { getAccentClasses } from './SubjectVisuals';

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all_time', label: 'All-Time' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

interface ProgressAnalyticsProps {
  onOpenDailyDate?: (dateKey?: string) => void;
  initialRange?: AnalyticsRange | null;
}

export function ProgressAnalytics({ onOpenDailyDate, initialRange }: ProgressAnalyticsProps) {
  const {
    profile,
    subjects,
    chapters,
    sessions,
    dailyTasks,
    dailyReviews,
    resolvedTheme,
    openTimerModal,
    deleteStudySession,
  } = useStudy();

  const [range, setRange] = useState<AnalyticsRange>(initialRange || 'today');
  const monthOptions = useMemo(() => getRecentMonthOptions(6), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthKey());

  useEffect(() => {
    if (initialRange) {
      setRange(initialRange);
    }
  }, [initialRange]);

  const todayKey = getLocalDateKey();
  const todaySessions = useMemo(
    () => sessions.filter((s) => s.dateKey === todayKey),
    [sessions, todayKey]
  );
  const todayTotalSeconds = useMemo(
    () => todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [todaySessions]
  );
  const todayBreakdown = useMemo(
    () => buildSubjectBreakdown(todaySessions, subjects),
    [todaySessions, subjects]
  );

  const weekly = useMemo(() => computeWeeklyReport(sessions, subjects), [sessions, subjects]);
  const monthly = useMemo(
    () => computeMonthlyReport(sessions, subjects, chapters, selectedMonth),
    [sessions, subjects, chapters, selectedMonth]
  );
  const streak = useMemo(() => calculateStreaks(sessions), [sessions]);

  const allTimeTotalSeconds = useMemo(
    () => sessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [sessions]
  );
  const allTimeBreakdown = useMemo(
    () => buildSubjectBreakdown(sessions, subjects),
    [sessions, subjects]
  );
  const completedChaptersCount = useMemo(
    () => chapters.filter((c) => c.status === 'completed').length,
    [chapters]
  );

  const goalSeconds = (profile?.dailyGoalMinutes || 300) * 60;
  const todayGoalPct = Math.min(100, Math.round((todayTotalSeconds / Math.max(1, goalSeconds)) * 100));

  // Daily Tasks & Review analytics across Today, Weekly, Monthly, and All-Time
  const todayTasks = useMemo(
    () => dailyTasks.filter((t) => t.dateKey === todayKey),
    [dailyTasks, todayKey]
  );
  const todayTasksDone = useMemo(
    () => todayTasks.filter((t) => t.status === 'completed').length,
    [todayTasks]
  );
  const todayReview = useMemo(
    () => dailyReviews.find((r) => r.dateKey === todayKey),
    [dailyReviews, todayKey]
  );

  const weeklyDateSet = useMemo(() => new Set(weekly.days.map((d) => d.dateKey)), [weekly.days]);
  const weeklyTasks = useMemo(
    () => dailyTasks.filter((t) => weeklyDateSet.has(t.dateKey)),
    [dailyTasks, weeklyDateSet]
  );
  const weeklyTasksDone = useMemo(
    () => weeklyTasks.filter((t) => t.status === 'completed').length,
    [weeklyTasks]
  );

  const monthlyTasks = useMemo(
    () => dailyTasks.filter((t) => t.monthKey === selectedMonth),
    [dailyTasks, selectedMonth]
  );
  const monthlyTasksDone = useMemo(
    () => monthlyTasks.filter((t) => t.status === 'completed').length,
    [monthlyTasks]
  );
  const monthlyReviews = useMemo(
    () =>
      dailyReviews.filter(
        (r) =>
          r.monthKey === selectedMonth &&
          (r.mistakes.length > 0 || r.improvements.length > 0 || r.tomorrowFocus.length > 0)
      ),
    [dailyReviews, selectedMonth]
  );

  const allTimeTasksDone = useMemo(
    () => dailyTasks.filter((t) => t.status === 'completed').length,
    [dailyTasks]
  );

  // Unified Daily History timeline for All-Time tab (combines sessions, tasks, and reviews per date)
  const dailyHistoryRecords = useMemo(() => {
    const dateSet = new Set<string>();
    for (const s of sessions) dateSet.add(s.dateKey);
    for (const t of dailyTasks) dateSet.add(t.dateKey);
    for (const r of dailyReviews) {
      if (r.mistakes.length > 0 || r.improvements.length > 0 || r.tomorrowFocus.length > 0) {
        dateSet.add(r.dateKey);
      }
    }
    return Array.from(dateSet)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 14)
      .map((dateKey) => {
        const dSessions = sessions.filter((s) => s.dateKey === dateKey);
        const dTasks = dailyTasks.filter((t) => t.dateKey === dateKey);
        const dReview = dailyReviews.find((r) => r.dateKey === dateKey);
        return {
          dateKey,
          studySeconds: dSessions.reduce((acc, s) => acc + s.durationSeconds, 0),
          sessionCount: dSessions.length,
          tasksDone: dTasks.filter((t) => t.status === 'completed').length,
          tasksTotal: dTasks.length,
          mistakesCount: dReview?.mistakes.length || 0,
          improvementsCount: dReview?.improvements.length || 0,
        };
      });
  }, [sessions, dailyTasks, dailyReviews]);

  const axisColor = resolvedTheme === 'dark' ? '#94A3B8' : '#64748B';
  const gridTint = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)';

  return (
    <div className="space-y-6">
      {/* Header & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Study Progress
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analytics calculated automatically from your study sessions
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                range === r.key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* =================================================== */}
      {/* TODAY REPORT */}
      {/* =================================================== */}
      {range === 'today' && (
        <motion.div
          key="today"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Today Summary & Subject Chart */}
            <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Today&apos;s Total Study
                  </p>
                  <p className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    <AnimatedNumber value={todayTotalSeconds} formatter={(v) => formatDuration(v)} />
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Goal: {formatDuration(goalSeconds)} · {todayGoalPct}% achieved
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openTimerModal()}
                  className="min-h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Study</span>
                </button>
              </div>

              <div className="space-y-4">
                {todayBreakdown.map((item) => {
                  const subj = subjects.find((s) => s.id === item.subjectId);
                  const accent = getAccentClasses(subj?.accentColor || 'blue');
                  return (
                    <div key={item.subjectId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.subjectName}
                        </span>
                        <span className="font-mono-num text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {formatDuration(item.seconds)}
                          {item.percentage > 0 ? ` · ${item.percentage}%` : ''}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 0.55 }}
                          className={`h-full rounded-full ${accent.bar}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Sessions List */}
            <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Today&apos;s Sessions
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {todaySessions.length} logged
                </span>
              </div>

              {todaySessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2.5" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No sessions recorded today
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Start the Focus Timer to record your first Class 12 study session today.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-80">
                  {todaySessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {sess.subjectName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {sess.chapterTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono-num text-xs font-bold text-blue-600 dark:text-blue-400">
                          {formatDuration(sess.durationSeconds)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void deleteStudySession(sess.id)}
                          aria-label="Delete session"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Today's Tasks & Mistakes Snapshot */}
          <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Today&apos;s Tasks</p>
                  <p className="font-mono-num text-base font-bold text-slate-900 dark:text-white">
                    {todayTasksDone} Completed · {Math.max(0, todayTasks.length - todayTasksDone)} Pending
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/12 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Daily Review</p>
                  <p className="font-mono-num text-base font-bold text-slate-900 dark:text-white">
                    {todayReview?.mistakes.length || 0} Mistakes · {todayReview?.improvements.length || 0} Improvements
                  </p>
                </div>
              </div>
            </div>

            {onOpenDailyDate && (
              <button
                type="button"
                onClick={() => onOpenDailyDate(todayKey)}
                className="min-h-[42px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <span>Open Daily Summary</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* =================================================== */}
      {/* WEEKLY REPORT */}
      {/* =================================================== */}
      {range === 'weekly' && (
        <motion.div
          key="weekly"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Weekly Total</p>
              <p className="mt-1.5 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatDuration(weekly.totalSeconds)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily Average</p>
              <p className="mt-1.5 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatDuration(weekly.averageDailySeconds)}/day
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Best Study Day</p>
              <p className="mt-1.5 font-display text-2xl font-extrabold text-blue-600 dark:text-blue-400 truncate">
                {weekly.bestDayName}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Completed</p>
              <p className="mt-1.5 font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {weeklyTasksDone}/{weeklyTasks.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white mb-5">
                Monday – Sunday Study Hours
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <XAxis
                      dataKey="dayShort"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: axisColor, fontSize: 11 }}
                      unit="m"
                    />
                    <Tooltip
                      cursor={{ fill: gridTint }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs shadow-lg">
                            <p className="font-semibold">{d.dayFull}</p>
                            <p className="font-mono-num text-blue-300 mt-0.5">
                              {formatDuration(d.seconds)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="minutes" radius={[10, 10, 10, 10]} maxBarSize={42}>
                      {weekly.days.map((entry) => (
                        <Cell
                          key={entry.dateKey}
                          fill={
                            entry.isToday
                              ? '#2563EB'
                              : entry.minutes > 0
                              ? '#60A5FA'
                              : resolvedTheme === 'dark'
                              ? '#1E293B'
                              : '#E2E8F0'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white mb-4">
                Day Breakdown
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {weekly.days.map((d) => {
                  const dTasks = dailyTasks.filter((t) => t.dateKey === d.dateKey);
                  const dDone = dTasks.filter((t) => t.status === 'completed').length;
                  return (
                    <button
                      key={d.dateKey}
                      type="button"
                      onClick={() => onOpenDailyDate?.(d.dateKey)}
                      className="w-full py-2.5 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg px-1.5 -mx-1.5 transition-colors cursor-pointer"
                    >
                      <span
                        className={
                          d.isToday
                            ? 'font-bold text-blue-600 dark:text-blue-400'
                            : 'font-medium text-slate-700 dark:text-slate-300'
                        }
                      >
                        {d.dayShort} {d.isToday ? '· Today' : ''}
                      </span>
                      <span className="flex items-center gap-2 font-mono-num text-xs">
                        {dTasks.length > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {dDone}/{dTasks.length} tasks
                          </span>
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatDuration(d.seconds)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* =================================================== */}
      {/* MONTHLY REPORT */}
      {/* =================================================== */}
      {range === 'monthly' && (
        <motion.div
          key="monthly"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {monthly.monthLabel}
              </h2>
            </div>

            <select
              aria-label="Select month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="min-h-[42px] rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 px-3.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Study</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatDuration(monthly.totalSeconds)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily Average</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatDuration(monthly.averageDailySeconds)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Most Studied</p>
              <p className="mt-1 font-display text-xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                {monthly.mostStudiedSubject}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Least Studied</p>
              <p className="mt-1 font-display text-xl font-extrabold text-amber-600 dark:text-amber-400 truncate">
                {monthly.leastStudiedSubject}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Monthly Daily Curve */}
            <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Daily Study Activity
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {monthly.totalSessions} sessions · {monthly.completedChaptersInMonth} chapters done
                </span>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly.dailyTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="monthlyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: axisColor, fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: axisColor, fontSize: 11 }}
                      unit="m"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs shadow-lg">
                            <p className="font-semibold">{p.dateKey}</p>
                            <p className="font-mono-num text-blue-300 mt-0.5">{p.minutes} min</p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#monthlyAreaGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Share in Month */}
            <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-4">
                Subject Breakdown
              </h3>
              <div className="space-y-4">
                {monthly.subjectBreakdown.map((item) => {
                  const subj = subjects.find((s) => s.id === item.subjectId);
                  const accent = getAccentClasses(subj?.accentColor || 'blue');
                  return (
                    <div key={item.subjectId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.subjectName}
                        </span>
                        <span className="font-mono-num text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {formatDuration(item.seconds)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${accent.bar}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Monthly Tasks Completed</span>
                  <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                    {monthlyTasksDone}/{monthlyTasks.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Streak</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {streak.currentStreak} Days 🔥
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Mistake & Improvement Review Log */}
          <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Monthly Mistake &amp; Improvement Log
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {monthlyReviews.length} {monthlyReviews.length === 1 ? 'day' : 'days'} reviewed in {monthly.monthLabel}
                </p>
              </div>
            </div>

            {monthlyReviews.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-3">
                No mistake or improvement notes logged in {monthly.monthLabel} yet. Add daily reviews in the Daily tab to track patterns over time.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyReviews.map((rev) => (
                  <button
                    key={rev.dateKey}
                    type="button"
                    onClick={() => onOpenDailyDate?.(rev.dateKey)}
                    className="w-full py-3.5 text-left flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="font-mono-num text-xs font-bold text-blue-600 dark:text-blue-400">
                        {rev.dateKey}
                      </p>
                      {rev.mistakes.length > 0 && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">Mistakes:</span>{' '}
                          {rev.mistakes.join(' · ')}
                        </p>
                      )}
                      {rev.improvements.length > 0 && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">Improve:</span>{' '}
                          {rev.improvements.join(' · ')}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* =================================================== */}
      {/* ALL-TIME REPORT */}
      {/* =================================================== */}
      {range === 'all_time' && (
        <motion.div
          key="all_time"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Study Time</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatHoursDecimal(allTimeTotalSeconds)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <TrendingUp className="w-4 h-4 text-indigo-500 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Sessions</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {sessions.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <ListChecks className="w-4 h-4 text-emerald-500 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Completed</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {allTimeTasksDone}/{dailyTasks.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Completed Chapters</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {completedChaptersCount}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <Flame className="w-4 h-4 text-amber-500 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Current Streak</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {streak.currentStreak} Days
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5">
              <Award className="w-4 h-4 text-rose-500 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Longest Streak</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {streak.longestStreak} Days
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mb-5">
              All-Time Hours by Subject
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allTimeBreakdown} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <XAxis
                    dataKey="subjectName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: axisColor, fontSize: 11 }}
                    unit="h"
                  />
                  <Tooltip
                    cursor={{ fill: gridTint }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold">{p.subjectName}</p>
                          <p className="font-mono-num text-blue-300 mt-0.5">
                            {formatDuration(p.seconds)} ({p.percentage}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="hours" radius={[10, 10, 10, 10]} maxBarSize={54}>
                    {allTimeBreakdown.map((entry) => (
                      <Cell key={entry.subjectId} fill={getSubjectColorHex(entry.accentColor)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* All-Time Daily History Archive */}
          <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Daily History Archive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap any day to open its full study summary, tasks, and mistake review
                </p>
              </div>
            </div>

            {dailyHistoryRecords.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-3">
                Your daily study records will appear here automatically as you log sessions, tasks, and reviews.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dailyHistoryRecords.map((rec) => (
                  <button
                    key={rec.dateKey}
                    type="button"
                    onClick={() => onOpenDailyDate?.(rec.dateKey)}
                    className="w-full py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="font-mono-num text-sm font-bold text-slate-900 dark:text-white">
                        {rec.dateKey}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {rec.sessionCount} {rec.sessionCount === 1 ? 'session' : 'sessions'} ·{' '}
                        {rec.tasksDone}/{rec.tasksTotal} tasks done
                        {rec.mistakesCount > 0 ? ` · ${rec.mistakesCount} mistakes noted` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-num text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatDuration(rec.studySeconds)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* =================================================== */}
      {/* GLOBAL LEADERBOARD */}
      {/* =================================================== */}
      {range === 'leaderboard' && <GlobalLeaderboard />}
    </div>
  );
}
