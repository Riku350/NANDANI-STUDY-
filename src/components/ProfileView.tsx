import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  HelpCircle,
  LogOut,
  MessageCircle,
  Moon,
  Save,
  Sun,
  Target,
  User,
} from 'lucide-react';
import { APP_CONFIG, buildWhatsAppUrl } from '../config/appConfig';
import { useStudy } from '../context/StudyContext';
import { calculateStreaks, formatDuration } from '../lib/studyStats';
import { HelpSupportView } from './HelpSupportView';

export function ProfileView() {
  const {
    profile,
    subjects,
    chapters,
    sessions,
    resolvedTheme,
    setTheme,
    updateDailyGoal,
    updateProfileInfo,
    updateNotifications,
    notificationPermission,
    requestNotificationPermission,
    sendTestNotification,
    signOut,
  } = useStudy();

  const [showHelp, setShowHelp] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.displayName || '');
  const [classInput, setClassInput] = useState(profile?.studentClass || APP_CONFIG.DEFAULT_CLASS);
  const [goalHours, setGoalHours] = useState<number>(
    Math.round(((profile?.dailyGoalMinutes || 300) / 60) * 2) / 2
  );
  const [notifEnabled, setNotifEnabled] = useState<boolean>(
    profile?.notificationsEnabled ?? true
  );
  const [reminderTime, setReminderTime] = useState<string>(
    profile?.dailyReminderTime || '08:00'
  );
  const [savingAccount, setSavingAccount] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNameInput(profile.displayName);
    setClassInput(profile.studentClass);
    setGoalHours(Math.round((profile.dailyGoalMinutes / 60) * 2) / 2);
    setNotifEnabled(profile.notificationsEnabled);
    setReminderTime(profile.dailyReminderTime);
  }, [profile]);

  const totalStudySeconds = useMemo(
    () => sessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [sessions]
  );
  const completedChapters = useMemo(
    () => chapters.filter((c) => c.status === 'completed').length,
    [chapters]
  );
  const streak = useMemo(() => calculateStreaks(sessions), [sessions]);

  if (showHelp) {
    return <HelpSupportView onBack={() => setShowHelp(false)} />;
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !classInput.trim() || savingAccount) return;
    setSavingAccount(true);
    await updateProfileInfo(nameInput, classInput);
    setSavingAccount(false);
  };

  const initials = (profile?.displayName || 'S')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Profile &amp; Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your student account, study goal, appearance, and support
        </p>
      </div>

      {/* Student Identity & Stats Card */}
      <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {profile?.photoURL && !photoError ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              onError={() => setPhotoError(true)}
              className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-display text-xl font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white truncate">
              {profile?.displayName || 'Student'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {profile?.email}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {profile?.studentClass || APP_CONFIG.DEFAULT_CLASS}
              </span>
              <span aria-hidden="true">·</span>
              <span>{subjects.map((s) => s.name).join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Total Study</span>
            </div>
            <p className="mt-1 font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatDuration(totalStudySeconds)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Completed</span>
            </div>
            <p className="mt-1 font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {completedChapters} Ch
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Streak</span>
            </div>
            <p className="mt-1 font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {streak.currentStreak} Days
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Appearance & Daily Goal */}
        <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-6">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Appearance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose Light or Dark interface mode
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => void setTheme('light')}
                className={`min-h-[46px] px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  resolvedTheme === 'light'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                onClick={() => void setTheme('dark')}
                className={`min-h-[46px] px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  resolvedTheme === 'dark'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Daily Study Goal
                </h3>
              </div>
              <span className="font-mono-num text-sm font-bold text-blue-600 dark:text-blue-400">
                {goalHours}h / day
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              step={0.5}
              value={goalHours}
              onChange={(e) => setGoalHours(Number(e.target.value))}
              onMouseUp={() => void updateDailyGoal(goalHours * 60)}
              onTouchEnd={() => void updateDailyGoal(goalHours * 60)}
              className="mt-4 w-full accent-blue-600 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400 tabular-nums">
              <span>1h</span>
              <span>5h</span>
              <span>12h</span>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Notification Settings
                </h3>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifEnabled}
                onClick={() => {
                  const next = !notifEnabled;
                  setNotifEnabled(next);
                  void updateNotifications(next, reminderTime);
                }}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                  notifEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    notifEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {notifEnabled && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily goal reached alert · 24h inactivity reminder
                </p>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Daily study reminder time
                  </span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => {
                      setReminderTime(e.target.value);
                      void updateNotifications(notifEnabled, e.target.value);
                    }}
                    className="min-h-[38px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 text-xs font-mono-num text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {notificationPermission === 'granted'
                      ? 'Browser alerts active'
                      : notificationPermission === 'denied'
                      ? 'Blocked in browser · In-app alerts active'
                      : notificationPermission === 'unsupported'
                      ? 'In-app alerts active'
                      : 'Allow browser alerts for background reminders'}
                  </span>

                  {notificationPermission === 'default' && (
                    <button
                      type="button"
                      onClick={() => void requestNotificationPermission()}
                      className="min-h-[36px] px-3 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Allow Browser Alerts
                    </button>
                  )}

                  {notificationPermission === 'granted' && (
                    <button
                      type="button"
                      onClick={() => void sendTestNotification()}
                      className="min-h-[36px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Send Test Alert
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Account Settings */}
        <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between gap-6">
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Account Settings
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Student Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Class / Stream
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingAccount}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingAccount ? 'Saving...' : 'Save Account Details'}</span>
            </button>
          </form>

          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Help &amp; Support Center</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full min-h-[48px] px-4 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </section>
      </div>

      {/* Direct WhatsApp Support Card */}
      <section className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Need Help?
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Any problem? Contact us on WhatsApp ({APP_CONFIG.WHATSAPP_DISPLAY}).
            </p>
          </div>
        </div>

        <a
          href={buildWhatsAppUrl(APP_CONFIG.WHATSAPP_DEFAULT_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat on WhatsApp</span>
        </a>
      </section>

      <footer className="pt-2 pb-4 text-center text-xs text-slate-400 dark:text-slate-500">
        {APP_CONFIG.APP_NAME} · {APP_CONFIG.APP_TAGLINE}
      </footer>
    </div>
  );
}
