import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Medal,
  Play,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import {
  calculateStreaks,
  computeWeeklyReport,
  formatDuration,
  getWeekRangeLabel,
} from '../lib/studyStats';
import type { LeaderboardEntry } from '../types/study';
import { AnimatedNumber } from './AnimatedNumber';

function getInitials(name: string): string {
  const parts = (name || 'S').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function StudentAvatar({
  name,
  photoURL,
  sizeClass = 'w-10 h-10',
  highlight = false,
}: {
  name: string;
  photoURL: string;
  sizeClass?: string;
  highlight?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (photoURL && !imgFailed) {
    return (
      <img
        src={photoURL}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-xl object-cover shrink-0 ${
          highlight ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#111827]' : ''
        }`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl shrink-0 flex items-center justify-center font-display font-bold text-xs ${
        highlight
          ? 'bg-blue-600 text-white ring-2 ring-blue-500/40'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
      }`}
    >
      {getInitials(name)}
    </div>
  );
}

interface RankedEntry extends LeaderboardEntry {
  rank: number;
}

export function GlobalLeaderboard() {
  const {
    user,
    subjects,
    sessions,
    leaderboardEntries,
    leaderboardLoading,
    myLeaderboardVisible,
    setLeaderboardVisibility,
    openTimerModal,
  } = useStudy();

  const [searchQuery, setSearchQuery] = useState('');
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const weekRangeLabel = useMemo(() => getWeekRangeLabel(), []);
  const myWeekly = useMemo(() => computeWeeklyReport(sessions, subjects), [sessions, subjects]);
  const myStreak = useMemo(() => calculateStreaks(sessions), [sessions]);

  const rankedList: RankedEntry[] = useMemo(() => {
    return leaderboardEntries.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }, [leaderboardEntries]);

  const myRankedEntry = useMemo(
    () => (user ? rankedList.find((e) => e.uid === user.uid) || null : null),
    [rankedList, user]
  );

  const entryAhead = useMemo(() => {
    if (!myRankedEntry || myRankedEntry.rank <= 1) return null;
    return rankedList[myRankedEntry.rank - 2] || null;
  }, [myRankedEntry, rankedList]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rankedList;
    return rankedList.filter(
      (entry) =>
        entry.displayName.toLowerCase().includes(q) ||
        entry.studentClass.toLowerCase().includes(q)
    );
  }, [rankedList, searchQuery]);

  const topSeconds = Math.max(1, rankedList[0]?.weeklyStudySeconds || 0);
  const topThree = useMemo(() => rankedList.slice(0, 3), [rankedList]);

  const handleToggleVisibility = async () => {
    if (togglingVisibility) return;
    setTogglingVisibility(true);
    try {
      await setLeaderboardVisibility(!myLeaderboardVisible);
    } finally {
      setTogglingVisibility(false);
    }
  };

  // Motivational message for the student's current standing
  const standingMessage = useMemo(() => {
    if (!myLeaderboardVisible) {
      return 'You are currently hidden from classmates. Enable visibility to join this week’s rankings.';
    }
    if (!myRankedEntry) {
      return 'Complete a study session to sync your weekly study time onto the class leaderboard.';
    }
    if (myRankedEntry.rank === 1) {
      if (rankedList.length === 1) {
        return 'You are #1 on the board! Invite classmates to Nandani Study to compete together.';
      }
      const second = rankedList[1];
      const leadSeconds = Math.max(0, myRankedEntry.weeklyStudySeconds - second.weeklyStudySeconds);
      return leadSeconds > 0
        ? `Leading the class by ${formatDuration(leadSeconds)} ahead of #2.`
        : 'Tied at the top! Start a quick focus session to take a clear lead.';
    }
    if (entryAhead) {
      const gap = Math.max(60, entryAhead.weeklyStudySeconds - myRankedEntry.weeklyStudySeconds);
      return `${formatDuration(gap)} behind #${entryAhead.rank} (${entryAhead.displayName}) — one focused session can move you up.`;
    }
    return 'Keep studying consistently to climb the weekly rankings.';
  }, [myLeaderboardVisible, myRankedEntry, rankedList, entryAhead]);

  return (
    <motion.div
      key="leaderboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Context Strip + Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Global Weekly Leaderboard
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Week of {weekRangeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Resets every Monday</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
              {rankedList.length} {rankedList.length === 1 ? 'student' : 'students'} ranked
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search classmate..."
              aria-label="Search classmate"
              className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleToggleVisibility()}
            disabled={togglingVisibility}
            aria-pressed={myLeaderboardVisible}
            className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
              myLeaderboardVisible
                ? 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {myLeaderboardVisible ? (
              <>
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Visible</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-slate-400" />
                <span>Hidden</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Focal Anchor: Your Weekly Standing Card */}
      <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold leading-none opacity-80">Rank</span>
              <span className="font-mono-num text-xl font-extrabold leading-tight mt-0.5">
                {myLeaderboardVisible && myRankedEntry ? `#${myRankedEntry.rank}` : '—'}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  <AnimatedNumber
                    value={myWeekly.totalSeconds}
                    formatter={(v) => formatDuration(v)}
                  />
                </p>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  this week · {myStreak.currentStreak}{' '}
                  {myStreak.currentStreak === 1 ? 'day' : 'days'} streak
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {standingMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openTimerModal()}
            className="min-h-[46px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Study</span>
          </button>
        </div>
      </section>

      {/* Loading Skeleton */}
      {leaderboardLoading && rankedList.length === 0 ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium Showcase (hidden during active text search) */}
          {!searchQuery.trim() && topThree.length > 0 && (
            <section
              aria-label="Top weekly learners"
              className={`grid gap-4 items-end ${
                topThree.length === 1
                  ? 'grid-cols-1 max-w-sm'
                  : topThree.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-3'
              }`}
            >
              {(topThree.length === 3 ? [topThree[1], topThree[0], topThree[2]] : topThree).map(
                (entry) => {
                  const isFirst = entry.rank === 1;
                  const isSecond = entry.rank === 2;
                  const isMe = entry.uid === user?.uid;

                  return (
                    <div
                      key={entry.uid}
                      className={`rounded-3xl bg-white dark:bg-[#111827] border p-5 flex flex-col items-center text-center transition-colors ${
                        isFirst
                          ? 'border-amber-300 dark:border-amber-500/40 sm:py-7'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-3">
                        {isFirst ? (
                          <Trophy className="w-4 h-4 text-amber-500" />
                        ) : isSecond ? (
                          <Medal className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Award className="w-4 h-4 text-orange-500" />
                        )}
                        <span
                          className={`font-mono-num text-xs font-bold ${
                            isFirst
                              ? 'text-amber-600 dark:text-amber-400'
                              : isSecond
                              ? 'text-slate-600 dark:text-slate-300'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                      </div>

                      <StudentAvatar
                        name={entry.displayName}
                        photoURL={entry.photoURL}
                        sizeClass={isFirst ? 'w-14 h-14' : 'w-12 h-12'}
                        highlight={isMe}
                      />

                      <p className="mt-3 font-display text-base font-bold text-slate-900 dark:text-white truncate max-w-full">
                        {entry.displayName}
                        {isMe ? (
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {' '}
                            · You
                          </span>
                        ) : null}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate max-w-full">
                        {entry.studentClass}
                      </p>

                      <p className="mt-3 font-mono-num text-xl font-extrabold text-slate-900 dark:text-white">
                        {formatDuration(entry.weeklyStudySeconds)}
                      </p>

                      <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          {entry.currentStreak}d
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {entry.sessionsCount} {entry.sessionsCount === 1 ? 'session' : 'sessions'}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </section>
          )}

          {/* Full Weekly Rankings List */}
          <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Weekly Standings
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Ranked by Monday – Sunday study time
              </span>
            </div>

            {filteredList.length === 0 ? (
              <div className="p-10 text-center">
                <Trophy className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-display text-base font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery.trim()
                    ? 'No matching classmates found'
                    : 'No ranked students yet this week'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchQuery.trim()
                    ? 'Try a different name or class filter.'
                    : 'Start a focus session to claim the #1 spot on the weekly leaderboard.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((entry) => {
                  const isMe = entry.uid === user?.uid;
                  const barPct =
                    entry.weeklyStudySeconds > 0
                      ? Math.max(4, Math.round((entry.weeklyStudySeconds / topSeconds) * 100))
                      : 0;

                  return (
                    <div
                      key={entry.uid}
                      className={`px-4 sm:px-6 py-4 flex items-center gap-3.5 sm:gap-4 transition-colors ${
                        isMe ? 'bg-blue-50/60 dark:bg-blue-500/8' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-9 text-center shrink-0">
                        <span
                          className={`font-mono-num text-sm font-extrabold ${
                            entry.rank === 1
                              ? 'text-amber-500'
                              : entry.rank === 2
                              ? 'text-slate-500 dark:text-slate-300'
                              : entry.rank === 3
                              ? 'text-orange-500'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                      </div>

                      {/* Avatar */}
                      <StudentAvatar
                        name={entry.displayName}
                        photoURL={entry.photoURL}
                        sizeClass="w-10 h-10"
                        highlight={isMe}
                      />

                      {/* Student Details + Relative Progress Bar */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {entry.displayName}
                            {isMe ? (
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {' '}
                                · You
                              </span>
                            ) : null}
                          </p>
                          <span className="font-mono-num text-sm font-extrabold text-slate-900 dark:text-white shrink-0">
                            {formatDuration(entry.weeklyStudySeconds)}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          <span className="truncate">{entry.studentClass}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {entry.sessionsCount}{' '}
                            {entry.sessionsCount === 1 ? 'session' : 'sessions'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-amber-500" />
                            {entry.currentStreak}d
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              entry.rank === 1
                                ? 'bg-amber-500'
                                : isMe
                                ? 'bg-blue-600'
                                : 'bg-blue-400 dark:bg-blue-500/70'
                            }`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Helpful privacy note at footer of list */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>
                Only your display name, class, streak, and weekly study time appear here — your email, chapters, tasks, and notes always remain private.
              </span>
            </div>
          </section>
        </>
      )}
    </motion.div>
  );
}
