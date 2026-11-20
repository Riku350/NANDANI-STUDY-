import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { formatClock, formatDuration } from '../lib/studyStats';
import { getAccentClasses, SubjectIcon } from './SubjectVisuals';

export function StudyTimerModal() {
  const {
    timerModalOpen,
    closeTimerModal,
    subjects,
    chapters,
    activeTimer,
    elapsedSeconds,
    selectTimerTarget,
    startTimer,
    pauseTimer,
    resetTimer,
    saveCurrentSession,
  } = useStudy();

  const [isSaving, setIsSaving] = useState(false);
  const [savedSummary, setSavedSummary] = useState<{ subject: string; duration: string } | null>(null);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === activeTimer.subjectId) || subjects[0],
    [subjects, activeTimer.subjectId]
  );

  const subjectChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.subjectId === selectedSubject?.id)
        .sort((a, b) => a.chapterNumber - b.chapterNumber),
    [chapters, selectedSubject]
  );

  const selectedChapter = useMemo(
    () => subjectChapters.find((c) => c.id === activeTimer.chapterId) || subjectChapters[0],
    [subjectChapters, activeTimer.chapterId]
  );

  useEffect(() => {
    if (!timerModalOpen) {
      setSavedSummary(null);
    }
  }, [timerModalOpen]);

  const accent = getAccentClasses(selectedSubject?.accentColor || 'blue');
  // Ring fills every 60 minutes (3600s) for intuitive visual cadence
  const ringProgress = Math.min(1, (elapsedSeconds % 3600) / 3600);
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringProgress);

  const handleFinish = async () => {
    if (elapsedSeconds < 1 || isSaving) return;
    setIsSaving(true);
    const durationText = formatDuration(elapsedSeconds);
    const subjName = selectedSubject?.name || 'Study';
    const ok = await saveCurrentSession();
    setIsSaving(false);
    if (ok) {
      setSavedSummary({ subject: subjName, duration: durationText });
      window.setTimeout(() => {
        setSavedSummary(null);
        closeTimerModal();
      }, 1500);
    }
  };

  return (
    <AnimatePresence>
      {timerModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={closeTimerModal}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#111827] border-t sm:border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-h-[92vh] overflow-y-auto"
          >
            {/* Mobile grab bar */}
            <div className="sm:hidden w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Focus Study Timer
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automatically saved even if you switch tabs
                </p>
              </div>
              <button
                type="button"
                onClick={closeTimerModal}
                aria-label="Close study timer"
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {savedSummary ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Session Saved
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                  {savedSummary.subject} · {savedSummary.duration} logged to your report
                </p>
              </motion.div>
            ) : (
              <>
                {/* Subject & Chapter Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
                  <div>
                    <label
                      htmlFor="timer-subject"
                      className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                    >
                      Subject
                    </label>
                    <select
                      id="timer-subject"
                      value={selectedSubject?.id || ''}
                      disabled={activeTimer.isRunning}
                      onChange={(e) => {
                        const nextSubj = e.target.value;
                        const firstCh = chapters
                          .filter((c) => c.subjectId === nextSubj)
                          .sort((a, b) => a.chapterNumber - b.chapterNumber)[0];
                        selectTimerTarget(nextSubj, firstCh?.id || '');
                      }}
                      className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="timer-chapter"
                      className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                    >
                      Chapter
                    </label>
                    <select
                      id="timer-chapter"
                      value={selectedChapter?.id || ''}
                      disabled={activeTimer.isRunning}
                      onChange={(e) => {
                        if (selectedSubject) {
                          selectTimerTarget(selectedSubject.id, e.target.value);
                        }
                      }}
                      className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      {subjectChapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          Ch {ch.chapterNumber}: {ch.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Circular Focus Timer Dial */}
                <div className="flex flex-col items-center justify-center my-4">
                  <div className="relative w-60 h-60 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
                      <circle
                        cx="120"
                        cy="120"
                        r={radius}
                        fill="none"
                        strokeWidth="10"
                        className="stroke-slate-100 dark:stroke-slate-800"
                      />
                      <circle
                        cx="120"
                        cy="120"
                        r={radius}
                        fill="none"
                        strokeWidth="10"
                        strokeLinecap="round"
                        stroke={accent.ring}
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-[stroke-dashoffset] duration-500 ease-out"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                      {selectedSubject && (
                        <div
                          className={`w-9 h-9 rounded-xl ${accent.softBg} ${accent.text} flex items-center justify-center mb-2`}
                        >
                          <SubjectIcon iconKey={selectedSubject.iconKey} className="w-4 h-4" />
                        </div>
                      )}
                      <div className="font-mono-num text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {formatClock(elapsedSeconds)}
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                        {activeTimer.isRunning
                          ? 'Focus session active'
                          : elapsedSeconds > 0
                          ? 'Session paused'
                          : 'Ready to focus'}
                      </p>
                    </div>
                  </div>

                  {selectedChapter && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs truncate">
                      {selectedSubject?.name} · Ch {selectedChapter.chapterNumber}: {selectedChapter.title}
                    </p>
                  )}
                </div>

                {/* Controls */}
                <div className="mt-7 flex items-center justify-center gap-3">
                  {elapsedSeconds > 0 && !activeTimer.isRunning && (
                    <button
                      type="button"
                      onClick={resetTimer}
                      title="Discard timer"
                      className="min-w-[48px] min-h-[48px] px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center active:scale-[0.97] transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  )}

                  {!activeTimer.isRunning ? (
                    <button
                      type="button"
                      onClick={startTimer}
                      className="flex-1 min-h-[52px] px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{elapsedSeconds > 0 ? 'Resume Study' : 'Start Study'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseTimer}
                      className="flex-1 min-h-[52px] px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </button>
                  )}

                  {elapsedSeconds > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleFinish()}
                      disabled={isSaving}
                      className="flex-1 min-h-[52px] px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
                    >
                      {isSaving ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : activeTimer.isRunning ? (
                        <Square className="w-4 h-4 fill-current" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{isSaving ? 'Saving...' : 'Finish & Save'}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
