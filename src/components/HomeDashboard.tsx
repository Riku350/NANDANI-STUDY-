import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  FileText,
  Flame,
  ListChecks,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { APP_CONFIG } from '../config/appConfig';
import { useStudy } from '../context/StudyContext';
import {
  buildSubjectBreakdown,
  calculateStreaks,
  computeWeeklyReport,
  formatDuration,
  getFirstName,
  getLocalDateKey,
  getTimeGreeting,
  getWeakestSubject,
} from '../lib/studyStats';
import { getPriorityLabel, getTaskTypeLabel } from '../lib/taskMeta';
import type { DailyTask } from '../types/study';
import { AnimatedNumber } from './AnimatedNumber';
import { getAccentClasses, SubjectIcon } from './SubjectVisuals';
import { TaskComposerModal } from './TaskComposerModal';

interface HomeDashboardProps {
  onOpenSubject: (subjectId: string) => void;
  onNavigateProgress: () => void;
  onNavigateSubjects: () => void;
  onNavigatePdfs: () => void;
  onNavigateAiChat: () => void;
  onNavigateDaily: () => void;
  onNavigateLeaderboard: () => void;
}

export function HomeDashboard({
  onOpenSubject,
  onNavigateProgress,
  onNavigateSubjects,
  onNavigatePdfs,
  onNavigateAiChat,
  onNavigateDaily,
  onNavigateLeaderboard,
}: HomeDashboardProps) {
  const {
    user,
    profile,
    subjects,
    chapters,
    sessions,
    dailyTasks,
    dailyReviews,
    leaderboardEntries,
    setDailyTaskStatus,
    dataLoading,
    openTimerModal,
    activeTimer,
    elapsedSeconds,
    resolvedTheme,
  } = useStudy();

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);

  const todayKey = getLocalDateKey();

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.dateKey === todayKey),
    [sessions, todayKey]
  );

  const todayTotalSeconds = useMemo(
    () => todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [todaySessions]
  );

  const goalSeconds = (profile?.dailyGoalMinutes || 300) * 60;
  const goalPct = Math.min(100, Math.round((todayTotalSeconds / Math.max(1, goalSeconds)) * 100));

  const todayBreakdown = useMemo(
    () => buildSubjectBreakdown(todaySessions, subjects),
    [todaySessions, subjects]
  );

  const streak = useMemo(() => calculateStreaks(sessions), [sessions]);
  const weekly = useMemo(() => computeWeeklyReport(sessions, subjects), [sessions, subjects]);
  const weakest = useMemo(
    () => getWeakestSubject(subjects, chapters, sessions),
    [subjects, chapters, sessions]
  );

  const continueChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    if (sessions.length > 0) {
      const recent = chapters.find(
        (c) => c.id === sessions[0].chapterId && c.status !== 'completed'
      );
      if (recent) return recent;
    }
    return (
      chapters.find((c) => c.status === 'in_progress') ||
      chapters.find((c) => c.status === 'not_started') ||
      chapters[0]
    );
  }, [chapters, sessions]);

  const continueSubject = useMemo(
    () => subjects.find((s) => s.id === continueChapter?.subjectId),
    [subjects, continueChapter]
  );

  const totalChapters = chapters.length;
  const completedChapters = useMemo(
    () => chapters.filter((c) => c.status === 'completed').length,
    [chapters]
  );
  const overallSyllabusPct =
    totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const todayTasks = useMemo(
    () => dailyTasks.filter((t) => t.dateKey === todayKey),
    [dailyTasks, todayKey]
  );
  const todayCompletedTasks = useMemo(
    () => todayTasks.filter((t) => t.status === 'completed'),
    [todayTasks]
  );
  const todayPendingTasks = useMemo(
    () => todayTasks.filter((t) => t.status !== 'completed'),
    [todayTasks]
  );
  const todayTaskPct =
    todayTasks.length > 0 ? Math.round((todayCompletedTasks.length / todayTasks.length) * 100) : 0;
  const todayReview = useMemo(
    () => dailyReviews.find((r) => r.dateKey === todayKey),
    [dailyReviews, todayKey]
  );

  const myWeeklyRank = useMemo(() => {
    if (!user) return null;
    const idx = leaderboardEntries.findIndex((e) => e.uid === user.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboardEntries, user]);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - goalPct / 100);

  if (dataLoading && subjects.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 w-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-56 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {APP_CONFIG.APP_NAME} · {profile?.studentClass || 'Class 12th'}
          </p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {getTimeGreeting()}, {getFirstName(profile?.displayName)} 👋
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>
              {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'} Streak
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums font-medium text-slate-600 dark:text-slate-300">
            {completedChapters}/{totalChapters} chapters ({overallSyllabusPct}%)
          </span>
        </div>
      </motion.div>

      {/* 2. TOP PRIORITY: Today's Tasks (Direct + Add Task & Animated Checkboxes) */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Today&apos;s Tasks
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {todayCompletedTasks.length} Completed · {todayPendingTasks.length} Pending ·{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {todayTaskPct}% Complete
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateDaily}
              className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>Full Tracker</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setComposerOpen(true);
              }}
              className="min-h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${todayTaskPct}%` }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>

        {/* Task List */}
        {todayTasks.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No study tasks planned for today yet
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Add Physics chapters, Chemistry numericals, Biology revision, or Zoology notes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setComposerOpen(true);
              }}
              className="min-h-[40px] px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Task</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <AnimatePresence initial={false}>
              {todayTasks.slice(0, 6).map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="py-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() =>
                          void setDailyTaskStatus(task.id, isDone ? 'pending' : 'completed')
                        }
                        aria-label={isDone ? `Mark ${task.title} pending` : `Complete ${task.title}`}
                        className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {isDone && (
                            <motion.span
                              key="checked"
                              initial={{ scale: 0.4, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.4, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold leading-snug transition-colors ${
                            isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {task.subjectName || 'General'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{getTaskTypeLabel(task.taskType)}</span>
                          {task.chapterTopic && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[160px]">{task.chapterTopic}</span>
                            </>
                          )}
                          {task.estimatedMinutes > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{task.estimatedMinutes}m</span>
                            </>
                          )}
                          {task.dueTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Due {task.dueTime}</span>
                            </>
                          )}
                          {task.priority === 'high' && !isDone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {getPriorityLabel(task.priority)} Priority
                              </span>
                            </>
                          )}
                          {task.repeat && task.repeat !== 'none' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{task.repeat}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => openTimerModal(task.subjectId || undefined)}
                          title="Start focus session for this task"
                          className="min-w-[34px] min-h-[34px] rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 flex items-center justify-center cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(task);
                          setComposerOpen(true);
                        }}
                        aria-label={`Edit ${task.title}`}
                        className="min-w-[34px] min-h-[34px] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {todayTasks.length > 6 && (
              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onNavigateDaily}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  View all {todayTasks.length} tasks &amp; daily summary
                </button>
                {todayReview && todayReview.mistakes.length > 0 && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {todayReview.mistakes.length} mistakes reviewed
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </motion.section>

      {/* 3. Today's Study & Today's Progress */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-7"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Goal Progress Ring + Core Today KPIs */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-center gap-6">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  strokeWidth="10"
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="#2563EB"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
                  <AnimatedNumber value={goalPct} formatter={(v) => `${Math.round(v)}%`} />
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Progress</span>
              </div>
            </div>

            <div className="flex-1 w-full text-center sm:text-left">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Today&apos;s Study
              </p>
              <div className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                <AnimatedNumber value={todayTotalSeconds} formatter={(v) => formatDuration(v)} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Today&apos;s Goal</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatDuration(todayTotalSeconds)} / {formatDuration(goalSeconds)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Current Streak</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Today's Subject Breakdown + Primary CTA */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-6 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              {todayBreakdown.slice(0, 4).map((item) => {
                const subj = subjects.find((s) => s.id === item.subjectId);
                const accent = getAccentClasses(subj?.accentColor || 'blue');
                const widthPct =
                  todayTotalSeconds > 0
                    ? Math.max(4, Math.round((item.seconds / todayTotalSeconds) * 100))
                    : 0;
                return (
                  <div key={item.subjectId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.subjectName}
                      </span>
                      <span className="font-mono-num text-slate-500 dark:text-slate-400">
                        {formatDuration(item.seconds)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${accent.bar} transition-all duration-500`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => openTimerModal(continueChapter?.subjectId, continueChapter?.id)}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {activeTimer.isRunning
                  ? `Focus Running · ${formatDuration(elapsedSeconds)}`
                  : 'Start Study'}
              </span>
            </button>
          </div>
        </div>
      </motion.section>

      {/* 4. AI Study Assistant Card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl bg-slate-900 dark:bg-[#111827] border border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white">
              AI Study Assistant
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-300 leading-snug">
              Ask anything about your studies — get step-by-step solutions, NCERT short notes,
              MCQs, or a custom study plan.
            </p>
            {continueChapter && continueSubject && (
              <p className="mt-1.5 text-[11px] text-blue-300 truncate">
                Up next: {continueSubject.name} · Ch {continueChapter.chapterNumber}:{' '}
                {continueChapter.title}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateAiChat}
          className="min-h-[46px] px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Ask AI</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.section>

      {/* 5. Quick Actions Grid (Subjects · Progress · Notes & Mistakes · PDFs) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'Subjects',
            sub: `${subjects.length} subjects`,
            icon: BookOpen,
            color: 'bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400',
            onClick: onNavigateSubjects,
          },
          {
            label: 'Progress',
            sub: `${formatDuration(weekly.totalSeconds)} this week`,
            icon: BarChart3,
            color: 'bg-emerald-50 dark:bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
            onClick: onNavigateProgress,
          },
          {
            label: 'Notes & Mistakes',
            sub: `${todayReview?.mistakes.length || 0} logged today`,
            icon: NotebookPen,
            color: 'bg-rose-50 dark:bg-rose-500/12 text-rose-600 dark:text-rose-400',
            onClick: onNavigateDaily,
          },
          {
            label: 'PDFs',
            sub: 'Syllabus & sheets',
            icon: FileText,
            color: 'bg-amber-50 dark:bg-amber-500/12 text-amber-600 dark:text-amber-400',
            onClick: onNavigatePdfs,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="group text-left rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition-all flex items-center gap-3.5 cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {item.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                  {item.sub}
                </p>
              </div>
            </button>
          );
        })}
      </section>

      {/* 6. Subjects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Subjects
          </h2>
          <button
            type="button"
            onClick={onNavigateSubjects}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Full syllabus
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {subjects.map((subj, idx) => {
            const subjChapters = chapters.filter((c) => c.subjectId === subj.id);
            const done = subjChapters.filter((c) => c.status === 'completed').length;
            const total = subjChapters.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const accent = getAccentClasses(subj.accentColor);

            return (
              <motion.button
                key={subj.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04 * idx, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onOpenSubject(subj.id)}
                className="group text-left rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-xl ${accent.softBg} ${accent.text} flex items-center justify-center shrink-0`}
                  >
                    <SubjectIcon iconKey={subj.iconKey} className="w-5 h-5" />
                  </div>
                  <span className="font-mono-num text-sm font-bold text-slate-900 dark:text-white">
                    {pct}%
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {subj.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {done} of {total} chapters
                  </p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${accent.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 7. Bottom 2-Column Row: Weekly Progress Chart + Continue Studying & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
          className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Weekly Progress
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {formatDuration(weekly.totalSeconds)} this week · Avg {formatDuration(weekly.averageDailySeconds)}/day
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateProgress}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              Full report
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly.days} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <XAxis
                  dataKey="dayShort"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: resolvedTheme === 'dark' ? '#94A3B8' : '#64748B',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
                <Tooltip
                  cursor={{ fill: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 text-xs shadow-lg">
                        <p className="font-semibold">{d.dayFull}</p>
                        <p className="font-mono-num text-blue-300 mt-0.5">{formatDuration(d.seconds)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="minutes" radius={[8, 8, 8, 8]} maxBarSize={34}>
                  {weekly.days.map((entry) => (
                    <Cell
                      key={entry.dateKey}
                      fill={
                        entry.isToday
                          ? '#2563EB'
                          : entry.minutes > 0
                          ? resolvedTheme === 'dark'
                            ? '#3B82F6'
                            : '#93C5FD'
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
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="lg:col-span-5 flex flex-col gap-4"
        >
          {/* Continue Studying Card */}
          <div className="flex-1 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Continue Studying
                </span>
                {continueSubject && <span>{continueSubject.name}</span>}
              </div>

              {continueChapter ? (
                <>
                  <h3 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    Ch {continueChapter.chapterNumber}: {continueChapter.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {continueChapter.status === 'in_progress'
                      ? 'In Progress'
                      : continueChapter.status === 'completed'
                      ? 'Completed · Ready for revision'
                      : 'Not Started'}
                    {continueChapter.totalStudySeconds > 0
                      ? ` · ${formatDuration(continueChapter.totalStudySeconds)} studied`
                      : ''}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">All syllabus chapters ready.</p>
              )}
            </div>

            {continueChapter && (
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openTimerModal(continueChapter.subjectId, continueChapter.id)}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Focus Chapter</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSubject(continueChapter.subjectId)}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {weakest && (
            <button
              type="button"
              onClick={() => onOpenSubject(weakest.subject.id)}
              className="text-left rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Needs attention</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {weakest.subject.name} · {weakest.completionPct}% syllabus
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateLeaderboard}
            className="text-left rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Global Leaderboard</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate tabular-nums">
                  {myWeeklyRank
                    ? `Ranked #${myWeeklyRank} of ${leaderboardEntries.length} this week`
                    : 'See weekly class rankings'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </motion.section>
      </div>

      <TaskComposerModal
        open={composerOpen}
        defaultDateKey={todayKey}
        editingTask={editingTask}
        onClose={() => {
          setComposerOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
