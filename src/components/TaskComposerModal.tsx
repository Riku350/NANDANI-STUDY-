import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Calendar, Clock, Repeat, X } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { getLocalDateKey } from '../lib/studyStats';
import { SMART_TASK_TYPES, TASK_PRIORITIES, TASK_REPEATS } from '../lib/taskMeta';
import type {
  DailyTask,
  DailyTaskInput,
  DailyTaskType,
  TaskPriority,
  TaskRepeat,
} from '../types/study';

interface TaskComposerModalProps {
  open: boolean;
  defaultDateKey?: string;
  editingTask?: DailyTask | null;
  onClose: () => void;
}

const TIME_PRESETS = [15, 30, 45, 60, 90, 120];

export function TaskComposerModal({
  open,
  defaultDateKey,
  editingTask,
  onClose,
}: TaskComposerModalProps) {
  const { subjects, chapters, addDailyTask, updateDailyTask } = useStudy();

  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<DailyTaskType>('study_task');
  const [subjectId, setSubjectId] = useState('');
  const [chapterTopic, setChapterTopic] = useState('');
  const [dateKey, setDateKey] = useState(defaultDateKey || getLocalDateKey());
  const [startTime, setStartTime] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [repeat, setRepeat] = useState<TaskRepeat>('none');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setTaskType(editingTask.taskType || 'study_task');
      setSubjectId(editingTask.subjectId || '');
      setChapterTopic(editingTask.chapterTopic || '');
      setDateKey(editingTask.dateKey || defaultDateKey || getLocalDateKey());
      setStartTime(editingTask.startTime || '');
      setDueTime(editingTask.dueTime || '');
      setPriority(editingTask.priority || 'medium');
      setEstimatedMinutes(editingTask.estimatedMinutes || 30);
      setRepeat(editingTask.repeat || 'none');
      setReminderEnabled(Boolean(editingTask.reminderEnabled));
      setNotes(editingTask.notes || '');
    } else {
      setTitle('');
      setTaskType('study_task');
      setSubjectId(subjects[0]?.id || '');
      setChapterTopic('');
      setDateKey(defaultDateKey || getLocalDateKey());
      setStartTime('');
      setDueTime('');
      setPriority('medium');
      setEstimatedMinutes(30);
      setRepeat('none');
      setReminderEnabled(false);
      setNotes('');
    }
  }, [open, editingTask, defaultDateKey, subjects]);

  const subjectChapters = useMemo(() => {
    if (!subjectId) return [];
    return chapters
      .filter((c) => c.subjectId === subjectId)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [chapters, subjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    const subj = subjects.find((s) => s.id === subjectId);
    const payload: DailyTaskInput = {
      dateKey: dateKey || getLocalDateKey(),
      title: trimmed,
      subjectId: subj?.id || '',
      subjectName: subj?.name || 'General',
      taskType,
      chapterTopic: chapterTopic.trim(),
      startTime,
      dueTime,
      priority,
      estimatedMinutes: Math.max(0, Math.min(600, Math.round(Number(estimatedMinutes) || 0))),
      reminderEnabled,
      notes: notes.trim(),
      repeat,
    };

    if (editingTask) {
      await updateDailyTask(editingTask.id, payload);
    } else {
      await addDailyTask(payload);
    }
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm sm:p-4"
          onClick={onClose}
        >
          <motion.form
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {editingTask ? 'Edit Study Task' : 'Add Daily Task'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Plan smart tasks linked to your Class 12 syllabus
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close task modal"
                className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
              {/* Task Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Physics — Chapter 3 complete karo, Chemistry 20 numericals"
                  className="w-full min-h-[46px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Smart Daily Task Type (10 options) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Task Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SMART_TASK_TYPES.map((opt) => {
                    const active = taskType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTaskType(opt.value)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold text-left truncate transition-colors cursor-pointer ${
                          active
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject & Chapter / Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">General Study</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Chapter / Topic
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    list="nandani-chapter-suggestions"
                    value={chapterTopic}
                    onChange={(e) => setChapterTopic(e.target.value)}
                    placeholder="e.g., Ch 3 Current Electricity"
                    className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="nandani-chapter-suggestions">
                    {subjectChapters.map((ch) => (
                      <option key={ch.id} value={`Ch ${ch.chapterNumber}: ${ch.title}`} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Date, Start Time, Due Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateKey}
                    onChange={(e) => setDateKey(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Start Time</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due Time</span>
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Priority & Repeat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                    {TASK_PRIORITIES.map((p) => {
                      const active = priority === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPriority(p.value)}
                          className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? p.value === 'high'
                                ? 'bg-rose-600 text-white'
                                : p.value === 'medium'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Repeat className="w-3.5 h-3.5 text-slate-400" />
                    <span>Repeat</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                    {TASK_REPEATS.map((r) => {
                      const active = repeat === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRepeat(r.value)}
                          className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {r.value === 'none' ? 'Once' : r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Estimated Study Time */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Estimated Study Time (minutes)
                  </label>
                  <span className="font-mono-num text-xs font-bold text-blue-600 dark:text-blue-400">
                    {estimatedMinutes} min
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {TIME_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setEstimatedMinutes(mins)}
                      className={`min-h-[36px] px-3 rounded-xl border text-xs font-mono-num font-semibold transition-colors cursor-pointer ${
                        estimatedMinutes === mins
                          ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={600}
                    aria-label="Custom estimated minutes"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 min-h-[36px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Reminder Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Task Reminder
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Highlight this task when study reminder checks run
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminderEnabled}
                  onClick={() => setReminderEnabled((prev) => !prev)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                    reminderEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      reminderEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={400}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Page numbers, formulas to revise, or NCERT exercise numbers..."
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || saving}
                className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
