import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import {
  buildSubjectBreakdown,
  formatDuration,
  getLocalDateKey,
} from '../lib/studyStats';
import {
  addDaysToDateKey,
  getPriorityLabel,
  getTaskTypeLabel,
} from '../lib/taskMeta';
import type { DailyTask, DailyTaskStatus } from '../types/study';
import { AnimatedNumber } from './AnimatedNumber';
import { getAccentClasses } from './SubjectVisuals';
import { TaskComposerModal } from './TaskComposerModal';

type DailySectionTab = 'tasks' | 'review' | 'summary';

function formatDateHeading(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === addDaysToDateKey(todayKey, 1)) return 'Tomorrow';
  if (dateKey === addDaysToDateKey(todayKey, -1)) return 'Yesterday';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

interface DailyTrackerViewProps {
  initialDate?: string | null;
}

export function DailyTrackerView({ initialDate }: DailyTrackerViewProps) {
  const {
    subjects,
    chapters,
    sessions,
    dailyTasks,
    dailyReviews,
    aiChats,
    addDailyTask,
    setDailyTaskStatus,
    moveTaskToDate,
    deleteDailyTask,
    saveDailyReview,
    openTimerModal,
    showToast,
  } = useStudy();

  const todayKey = getLocalDateKey();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayKey);
  const [sectionTab, setSectionTab] = useState<DailySectionTab>('tasks');

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Add Task form state + Smart Task Modal state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubjectId, setTaskSubjectId] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [addedTomorrowKeys, setAddedTomorrowKeys] = useState<Record<string, boolean>>({});

  // Daily Review inputs
  const [mistakeInput, setMistakeInput] = useState('');
  const [improvementInput, setImprovementInput] = useState('');
  const [focusInput, setFocusInput] = useState('');

  const nextDayKey = useMemo(() => addDaysToDateKey(selectedDate, 1), [selectedDate]);

  // 7-day interactive strip: 5 past days + Today + Tomorrow
  const dateStrip = useMemo(() => {
    const items: {
      dateKey: string;
      dayLetter: string;
      dayNum: number;
      isToday: boolean;
      isTomorrow: boolean;
      hasActivity: boolean;
    }[] = [];

    for (let offset = -5; offset <= 1; offset++) {
      const dk = addDaysToDateKey(todayKey, offset);
      const [y, m, d] = dk.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      const hasStudy = sessions.some((s) => s.dateKey === dk);
      const hasTask = dailyTasks.some((t) => t.dateKey === dk);
      items.push({
        dateKey: dk,
        dayLetter: dt.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
        dayNum: d,
        isToday: offset === 0,
        isTomorrow: offset === 1,
        hasActivity: hasStudy || hasTask,
      });
    }
    return items;
  }, [todayKey, sessions, dailyTasks]);

  // Selected date filtered records
  const dayTasks = useMemo(
    () => dailyTasks.filter((t) => t.dateKey === selectedDate),
    [dailyTasks, selectedDate]
  );

  const tomorrowScheduledTasks = useMemo(
    () => dailyTasks.filter((t) => t.dateKey === nextDayKey),
    [dailyTasks, nextDayKey]
  );

  const daySessions = useMemo(
    () => sessions.filter((s) => s.dateKey === selectedDate),
    [sessions, selectedDate]
  );

  const dayCompletedChapters = useMemo(
    () =>
      chapters.filter(
        (c) => c.status === 'completed' && c.completedAtIso.startsWith(selectedDate)
      ),
    [chapters, selectedDate]
  );

  const dayReview = useMemo(
    () =>
      dailyReviews.find((r) => r.dateKey === selectedDate) || {
        id: selectedDate,
        userId: '',
        dateKey: selectedDate,
        monthKey: selectedDate.slice(0, 7),
        mistakes: [],
        improvements: [],
        tomorrowFocus: [],
      },
    [dailyReviews, selectedDate]
  );

  const completedTasks = useMemo(
    () => dayTasks.filter((t) => t.status === 'completed'),
    [dayTasks]
  );
  const inProgressTasks = useMemo(
    () => dayTasks.filter((t) => t.status === 'in_progress'),
    [dayTasks]
  );
  const pendingTasks = useMemo(
    () => dayTasks.filter((t) => t.status !== 'completed'),
    [dayTasks]
  );

  const taskCompletionPct =
    dayTasks.length > 0 ? Math.round((completedTasks.length / dayTasks.length) * 100) : 0;

  const dayStudySeconds = useMemo(
    () => daySessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [daySessions]
  );

  const daySubjectBreakdown = useMemo(
    () => buildSubjectBreakdown(daySessions, subjects),
    [daySessions, subjects]
  );

  // Unique studied items (Subject + Chapter) from recorded study sessions
  const studiedChaptersSummary = useMemo(() => {
    const map = new Map<string, { subjectName: string; chapterTitle: string; seconds: number }>();
    for (const s of daySessions) {
      const key = `${s.subjectId}::${s.chapterId}`;
      const existing = map.get(key);
      if (existing) {
        existing.seconds += s.durationSeconds;
      } else {
        map.set(key, {
          subjectName: s.subjectName,
          chapterTitle: s.chapterTitle,
          seconds: s.durationSeconds,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
  }, [daySessions]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || addingTask) return;
    setAddingTask(true);
    await addDailyTask(selectedDate, taskTitle.trim(), taskSubjectId || undefined);
    setTaskTitle('');
    setAddingTask(false);
  };

  const handleAddReviewItem = async (
    field: 'mistakes' | 'improvements' | 'tomorrowFocus',
    value: string,
    clearFn: (v: string) => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const nextPayload = {
      mistakes: field === 'mistakes' ? [...dayReview.mistakes, trimmed] : dayReview.mistakes,
      improvements:
        field === 'improvements' ? [...dayReview.improvements, trimmed] : dayReview.improvements,
      tomorrowFocus:
        field === 'tomorrowFocus' ? [...dayReview.tomorrowFocus, trimmed] : dayReview.tomorrowFocus,
    };
    clearFn('');
    await saveDailyReview(selectedDate, nextPayload);
    showToast({ type: 'success', title: 'Saved to daily review' });
  };

  const handleRemoveReviewItem = async (
    field: 'mistakes' | 'improvements' | 'tomorrowFocus',
    index: number
  ) => {
    const nextPayload = {
      mistakes:
        field === 'mistakes'
          ? dayReview.mistakes.filter((_, i) => i !== index)
          : dayReview.mistakes,
      improvements:
        field === 'improvements'
          ? dayReview.improvements.filter((_, i) => i !== index)
          : dayReview.improvements,
      tomorrowFocus:
        field === 'tomorrowFocus'
          ? dayReview.tomorrowFocus.filter((_, i) => i !== index)
          : dayReview.tomorrowFocus,
    };
    await saveDailyReview(selectedDate, nextPayload);
  };

  // Weak Topics: aggregated from AI Chat weak topics + unstarted/low-study syllabus chapters
  const weakTopicsList = useMemo(() => {
    const seen = new Set<string>();
    const items: { key: string; subjectId: string; subjectName: string; topic: string; source: string }[] = [];

    for (const chat of aiChats.slice(0, 12)) {
      for (const msg of chat.messages) {
        if (!msg.weakTopics) continue;
        for (const wt of msg.weakTopics) {
          const norm = `${wt.subjectName.toLowerCase()}::${wt.topic.toLowerCase()}`;
          if (seen.has(norm)) continue;
          seen.add(norm);
          const matchedSubj = subjects.find(
            (s) => s.name.toLowerCase() === wt.subjectName.toLowerCase()
          );
          items.push({
            key: `ai_${norm}`,
            subjectId: matchedSubj?.id || '',
            subjectName: matchedSubj?.name || wt.subjectName || 'General',
            topic: wt.topic,
            source: 'AI Study Chat',
          });
        }
      }
    }

    // Add not-started chapters from subjects with lowest study time
    const lowStudyChapters = chapters
      .filter((c) => c.status === 'not_started')
      .slice(0, Math.max(0, 6 - items.length));

    for (const ch of lowStudyChapters) {
      const subj = subjects.find((s) => s.id === ch.subjectId);
      const label = `Ch ${ch.chapterNumber}: ${ch.title}`;
      const norm = `${(subj?.name || '').toLowerCase()}::${label.toLowerCase()}`;
      if (seen.has(norm)) continue;
      seen.add(norm);
      items.push({
        key: `ch_weak_${ch.id}`,
        subjectId: ch.subjectId,
        subjectName: subj?.name || 'Syllabus',
        topic: label,
        source: 'Not started yet',
      });
    }

    return items.slice(0, 6);
  }, [aiChats, chapters, subjects]);

  // Needs Revision: in-progress chapters + completed chapters ready for spaced revision
  const needsRevisionList = useMemo(() => {
    const inProg = chapters.filter((c) => c.status === 'in_progress');
    const comp = chapters.filter((c) => c.status === 'completed');
    return [...inProg, ...comp].slice(0, 6).map((ch) => {
      const subj = subjects.find((s) => s.id === ch.subjectId);
      return {
        key: `rev_${ch.id}`,
        chapterId: ch.id,
        subjectId: ch.subjectId,
        subjectName: subj?.name || 'Syllabus',
        title: `Ch ${ch.chapterNumber}: ${ch.title}`,
        statusLabel: ch.status === 'in_progress' ? 'In Progress' : 'Completed · Revise',
      };
    });
  }, [chapters, subjects]);

  const handleAddToTomorrowTask = async (
    key: string,
    title: string,
    subjectId?: string,
    subjectName?: string,
    chapterTopic?: string
  ) => {
    if (addedTomorrowKeys[key]) return;
    await addDailyTask({
      dateKey: nextDayKey,
      title,
      subjectId: subjectId || '',
      subjectName: subjectName || 'General',
      chapterTopic: chapterTopic || '',
      taskType: 'revision',
      priority: 'high',
      estimatedMinutes: 30,
    });
    setAddedTomorrowKeys((prev) => ({ ...prev, [key]: true }));
  };

  const handleCarryAllPendingToTomorrow = async () => {
    if (pendingTasks.length === 0) return;
    for (const t of pendingTasks) {
      await moveTaskToDate(t.id, nextDayKey);
    }
    showToast({
      type: 'success',
      title: `Moved ${pendingTasks.length} pending ${pendingTasks.length === 1 ? 'task' : 'tasks'}`,
      subtitle: 'Scheduled for tomorrow.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header + Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Daily Study &amp; Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatDateHeading(selectedDate, todayKey)} · {selectedDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              aria-label="Choose study date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="min-h-[42px] pl-9 pr-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs font-mono-num font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {selectedDate !== todayKey && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayKey)}
              className="min-h-[42px] px-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Interactive 7-Day Date Strip */}
      <div className="grid grid-cols-7 gap-2">
        {dateStrip.map((item) => {
          const active = selectedDate === item.dateKey;
          return (
            <button
              key={item.dateKey}
              type="button"
              onClick={() => setSelectedDate(item.dateKey)}
              className={`min-h-[62px] rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] cursor-pointer ${
                active
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span
                className={`text-[10px] font-semibold ${
                  active ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.isTomorrow ? 'Tmrw' : item.dayLetter}
              </span>
              <span className="font-mono-num text-sm font-bold">{item.dayNum}</span>
              <span
                className={`w-4 h-1 rounded-full ${
                  item.hasActivity
                    ? active
                      ? 'bg-white'
                      : 'bg-blue-500'
                    : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Visual KPI Strip (4 Scannable Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Study Time</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            <AnimatedNumber value={dayStudySeconds} formatter={(v) => formatDuration(v)} />
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tasks Done</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {completedTasks.length}/{dayTasks.length}
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${taskCompletionPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Remaining</span>
            <Circle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {pendingTasks.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {inProgressTasks.length} in progress
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Daily Review</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {dayReview.mistakes.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {dayReview.improvements.length} improvements noted
          </p>
        </div>
      </div>

      {/* Segmented View Tabs */}
      <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-full sm:w-fit">
        {(
          [
            { key: 'tasks', label: 'Daily Tasks' },
            { key: 'review', label: 'Mistakes & Review' },
            { key: 'summary', label: 'Daily Summary' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSectionTab(tab.key)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              sectionTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================================================== */}
      {/* TAB 1: DAILY TASKS */}
      {/* =================================================== */}
      {sectionTab === 'tasks' && (
        <motion.div
          key="tasks-tab"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="space-y-5"
        >
          {/* Quick Add Task Form + Smart Composer Trigger */}
          <form
            onSubmit={handleAddTask}
            className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              maxLength={160}
              placeholder="Quick add task (e.g., Physics Ch 3 padhna, Chemistry 20 questions)..."
              className="flex-1 min-h-[46px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <select
                aria-label="Subject for task"
                value={taskSubjectId}
                onChange={(e) => setTaskSubjectId(e.target.value)}
                className="flex-1 sm:w-32 min-h-[46px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">General</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!taskTitle.trim() || addingTask}
                className="min-h-[46px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 transition-all whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setComposerOpen(true);
                }}
                title="Add smart task with priority, due time, repeat & notes"
                className="min-h-[46px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Smart Task</span>
              </button>
            </div>
          </form>

          {/* Task List */}
          <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {dayTasks.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-display text-base font-bold text-slate-800 dark:text-slate-200">
                  No tasks planned for {formatDateHeading(selectedDate, todayKey).toLowerCase()}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Add your top Physics, Chemistry, Biology, or Zoology goals above or open Smart Task for priority &amp; repeat options.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {dayTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </motion.button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm sm:text-base font-semibold leading-snug ${
                              isDone
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {task.subjectName || 'General Study'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{getTaskTypeLabel(task.taskType)}</span>
                            {task.chapterTopic && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{task.chapterTopic}</span>
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
                          {task.notes && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-9 sm:pl-0 shrink-0">
                        <select
                          aria-label={`Status for ${task.title}`}
                          value={task.status}
                          onChange={(e) =>
                            void setDailyTaskStatus(task.id, e.target.value as DailyTaskStatus)
                          }
                          className={`min-h-[38px] rounded-xl px-3 text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                            task.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-500/12 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              : task.status === 'in_progress'
                              ? 'bg-amber-50 dark:bg-amber-500/12 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingTask(task);
                            setComposerOpen(true);
                          }}
                          aria-label={`Edit ${task.title}`}
                          className="min-w-[38px] min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {task.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => openTimerModal(task.subjectId || undefined)}
                            title="Start focus timer"
                            className="min-w-[38px] min-h-[38px] rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        {task.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => void moveTaskToDate(task.id, nextDayKey)}
                            title="Move to tomorrow"
                            className="min-w-[38px] min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => void deleteDailyTask(task.id)}
                          aria-label={`Delete ${task.title}`}
                          className="min-w-[38px] min-h-[38px] rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}

      {/* =================================================== */}
      {/* TAB 2: DAILY MISTAKE & REVIEW JOURNAL */}
      {/* =================================================== */}
      {sectionTab === 'review' && (
        <motion.div
          key="review-tab"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Today's Mistakes (with + Add to Tomorrow's Task) */}
            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/12 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Today&apos;s Mistakes
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Turn any slip into tomorrow&apos;s revision task
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {dayReview.mistakes.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-3">
                      No mistakes logged yet (e.g., Physics numerical errors, skipped revision).
                    </p>
                  ) : (
                    dayReview.mistakes.map((item, idx) => {
                      const mKey = `mistake_${selectedDate}_${idx}`;
                      const isAdded = Boolean(addedTomorrowKeys[mKey]);
                      return (
                        <div
                          key={idx}
                          className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                              {item}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleRemoveReviewItem('mistakes', idx)}
                              aria-label="Remove mistake"
                              className="p-1 text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() =>
                              void handleAddToTomorrowTask(mKey, `Fix mistake: ${item}`)
                            }
                            className={`text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                              isAdded
                                ? 'text-emerald-600 dark:text-emerald-400 cursor-default'
                                : 'text-blue-600 dark:text-blue-400 hover:underline'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Added to Tomorrow&apos;s Tasks</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Add to Tomorrow&apos;s Task</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddReviewItem('mistakes', mistakeInput, setMistakeInput);
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  maxLength={200}
                  value={mistakeInput}
                  onChange={(e) => setMistakeInput(e.target.value)}
                  placeholder="Add a mistake..."
                  className="flex-1 min-h-[42px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!mistakeInput.trim()}
                  className="min-w-[42px] min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </section>

            {/* Card 2: What to Improve */}
            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      What to Improve
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Action steps for next session
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {dayReview.improvements.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-3">
                      Add focus improvements (e.g., Revise formulas, solve 20 MCQs daily).
                    </p>
                  ) : (
                    dayReview.improvements.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveReviewItem('improvements', idx)}
                          aria-label="Remove improvement"
                          className="p-1 text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddReviewItem('improvements', improvementInput, setImprovementInput);
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  maxLength={200}
                  value={improvementInput}
                  onChange={(e) => setImprovementInput(e.target.value)}
                  placeholder="Add an improvement..."
                  className="flex-1 min-h-[42px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!improvementInput.trim()}
                  className="min-w-[42px] min-h-[42px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </section>

            {/* Card 3: Tomorrow's Focus */}
            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Tomorrow&apos;s Focus
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Top priorities for next day
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {dayReview.tomorrowFocus.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-3">
                      Write your top 2–3 priorities for tomorrow so you start fast.
                    </p>
                  ) : (
                    dayReview.tomorrowFocus.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                          {item}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void addDailyTask(nextDayKey, item)}
                            title="Also add as Tomorrow Task"
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 rounded cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveReviewItem('tomorrowFocus', idx)}
                            aria-label="Remove focus item"
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddReviewItem('tomorrowFocus', focusInput, setFocusInput);
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  maxLength={200}
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  placeholder="Add tomorrow's focus..."
                  className="flex-1 min-h-[42px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!focusInput.trim()}
                  className="min-w-[42px] min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </section>
          </div>

          {/* Weak Topics & Needs Revision (with + Add to Tomorrow's Task) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Weak Topics */}
            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Weak Topics
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    From AI Study Chat doubts &amp; untouched chapters
                  </p>
                </div>
              </div>

              {weakTopicsList.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-3">
                  No weak topics flagged yet — great work!
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {weakTopicsList.map((wt) => {
                    const isAdded = Boolean(addedTomorrowKeys[wt.key]);
                    return (
                      <div
                        key={wt.key}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {wt.topic}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {wt.subjectName} · {wt.source}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() =>
                            void handleAddToTomorrowTask(
                              wt.key,
                              `${wt.subjectName} — Revise ${wt.topic}`,
                              wt.subjectId,
                              wt.subjectName,
                              wt.topic
                            )
                          }
                          className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tomorrow&apos;s Task</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Needs Revision */}
            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Needs Revision
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Active &amp; completed syllabus chapters ready for revision
                  </p>
                </div>
              </div>

              {needsRevisionList.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-3">
                  Start studying syllabus chapters to see revision recommendations here.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {needsRevisionList.map((rev) => {
                    const isAdded = Boolean(addedTomorrowKeys[rev.key]);
                    return (
                      <div
                        key={rev.key}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {rev.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {rev.subjectName} · {rev.statusLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() =>
                            void handleAddToTomorrowTask(
                              rev.key,
                              `${rev.subjectName} — ${rev.title} Revision`,
                              rev.subjectId,
                              rev.subjectName,
                              rev.title
                            )
                          }
                          className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tomorrow&apos;s Task</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </motion.div>
      )}

      {/* =================================================== */}
      {/* TAB 3: AUTOMATIC END-OF-DAY SUMMARY REPORT */}
      {/* =================================================== */}
      {sectionTab === 'summary' && (
        <motion.div
          key="summary-tab"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="space-y-5"
        >
          {/* Main Summary Overview Card */}
          <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Daily Summary Report
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {formatDateHeading(selectedDate, todayKey)} · {selectedDate}
                </h2>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Study Time</p>
                  <p className="font-mono-num text-xl font-bold text-slate-900 dark:text-white">
                    {formatDuration(dayStudySeconds)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tasks</p>
                  <p className="font-mono-num text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {completedTasks.length} Done · {pendingTasks.length} Pending
                  </p>
                </div>
              </div>
            </div>

            {/* Subject Time Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
              <div className="lg:col-span-6 space-y-3.5">
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Subjects Studied
                </h3>
                {daySubjectBreakdown.map((item) => {
                  const subj = subjects.find((s) => s.id === item.subjectId);
                  const accent = getAccentClasses(subj?.accentColor || 'blue');
                  return (
                    <div key={item.subjectId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.subjectName}
                        </span>
                        <span className="font-mono-num text-slate-500 dark:text-slate-400">
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

              {/* What Was Studied Today */}
              <div className="lg:col-span-6 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    What I Studied ({daySessions.length} sessions)
                  </h3>
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>

                {studiedChaptersSummary.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    No focus study sessions recorded on this date yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {studiedChaptersSummary.map((entry, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {entry.chapterTitle}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">{entry.subjectName}</p>
                        </div>
                        <span className="font-mono-num font-bold text-blue-600 dark:text-blue-400 shrink-0">
                          {formatDuration(entry.seconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Completed vs Could Not Complete */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Completed Today
                </h3>
                <span className="text-xs font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                  {completedTasks.length + dayCompletedChapters.length} items
                </span>
              </div>

              {completedTasks.length === 0 && dayCompletedChapters.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                  Mark tasks or chapters as completed to build today&apos;s wins.
                </p>
              ) : (
                <ul className="space-y-2">
                  {completedTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>
                        {t.title}
                        {t.subjectName ? (
                          <span className="text-xs text-slate-400"> · {t.subjectName}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                  {dayCompletedChapters.map((ch) => (
                    <li
                      key={ch.id}
                      className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <span>
                        Syllabus Ch {ch.chapterNumber}: {ch.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Could Not Complete
                </h3>
                {pendingTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleCarryAllPendingToTomorrow()}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Move all to Tomorrow
                  </button>
                )}
              </div>

              {pendingTasks.length === 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 py-2">
                  {dayTasks.length > 0
                    ? 'Everything planned for this day is complete.'
                    : 'No unfinished tasks for this day.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {pendingTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex items-start gap-2.5 min-w-0">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {t.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Mistakes & Tomorrow's Focus Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Today&apos;s Mistakes &amp; Improvements
                </h3>
                <button
                  type="button"
                  onClick={() => setSectionTab('review')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>

              {dayReview.mistakes.length === 0 && dayReview.improvements.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No mistake or improvement notes written yet.
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  {dayReview.mistakes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                        Mistakes
                      </p>
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                        {dayReview.mistakes.map((m, i) => (
                          <li key={i}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dayReview.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                        To Improve
                      </p>
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                        {dayReview.improvements.map((imp, i) => (
                          <li key={i}>• {imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Tomorrow&apos;s Focus
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDate(nextDayKey)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Open Tomorrow
                </button>
              </div>

              {dayReview.tomorrowFocus.length === 0 && tomorrowScheduledTasks.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Add focus goals in Review or schedule tasks for tomorrow.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {dayReview.tomorrowFocus.map((f, i) => (
                    <li key={`f_${i}`} className="flex items-start gap-2">
                      <Compass className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {tomorrowScheduledTasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-2">
                      <Circle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span>
                        {t.title}
                        {t.subjectName ? (
                          <span className="text-xs text-slate-400"> · {t.subjectName}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </motion.div>
      )}

      <TaskComposerModal
        open={composerOpen}
        defaultDateKey={selectedDate}
        editingTask={editingTask}
        onClose={() => {
          setComposerOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
