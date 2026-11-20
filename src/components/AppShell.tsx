import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Home,
  Play,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useStudy } from '../context/StudyContext';
import { formatClock } from '../lib/studyStats';
import type { AppTab } from '../types/study';
import { BrandLogoMark } from './SubjectVisuals';

interface AppShellProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { key: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'ai_chat', label: 'AI Chat', icon: Bot },
  { key: 'progress', label: 'Progress', icon: BarChart3 },
  { key: 'profile', label: 'Profile', icon: User },
];

export function AppShell({ activeTab, onChangeTab, children }: AppShellProps) {
  const {
    profile,
    isOnline,
    pendingSyncCount,
    activeTimer,
    elapsedSeconds,
    openTimerModal,
    toast,
    dismissToast,
  } = useStudy();

  const initials = (profile?.displayName || 'S')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar Rail */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 px-4 py-6 z-30">
        <div className="flex items-center gap-3 px-2 mb-8">
          <BrandLogoMark className="w-9 h-9 shrink-0" />
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            {APP_CONFIG.APP_NAME}
          </span>
        </div>

        <nav className="space-y-1.5 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeTab(item.key)}
                className={`w-full min-h-[46px] px-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => openTimerModal()}
            className="w-full min-h-[46px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {activeTimer.isRunning ? formatClock(elapsedSeconds) : 'Start Study Timer'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('profile')}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
          >
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {profile?.displayName || 'Student'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {profile?.studentClass || APP_CONFIG.DEFAULT_CLASS}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Compact Mobile Top App Bar (52px) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <BrandLogoMark className="w-7 h-7" />
            <span className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              {APP_CONFIG.APP_NAME}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(activeTimer.isRunning || elapsedSeconds > 0) && (
              <button
                type="button"
                onClick={() => openTimerModal()}
                className="min-h-[36px] px-3 rounded-xl bg-blue-600 text-white font-mono-num text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {activeTimer.isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
                <span>{formatClock(elapsedSeconds)}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onChangeTab('profile')}
              aria-label="Open profile"
              className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </button>
          </div>
        </header>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-500/15 border-b border-amber-200 dark:border-amber-500/30 px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              You&apos;re offline. Your data will sync when you&apos;re back online.
              {pendingSyncCount > 0 ? ` (${pendingSyncCount} pending)` : ''}
            </span>
          </div>
        )}

        {/* Viewport Container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Primary navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-[#111827]/92 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeTab(item.key)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-50 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-800 dark:border-slate-700 px-4 py-3 shadow-xl flex items-start gap-3"
          >
            <CheckCircle2
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                toast.type === 'error'
                  ? 'text-rose-400'
                  : toast.type === 'info'
                  ? 'text-blue-400'
                  : 'text-emerald-400'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{toast.title}</p>
              {toast.subtitle && (
                <p className="text-[11px] text-slate-300 mt-0.5 truncate">{toast.subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
