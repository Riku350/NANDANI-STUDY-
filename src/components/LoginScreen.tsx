import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, BookCheck, Clock, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useStudy } from '../context/StudyContext';
import { BrandLogoMark } from './SubjectVisuals';

const HERO_IMAGE_PATH = '/src/assets/images/study_desk_editorial_1795185349242.jpg';

export function LoginScreen() {
  const { signInWithGoogle, isSigningIn, authError } = useStudy();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col lg:flex-row">
      {/* Left / Top Editorial Visual Panel */}
      <div className="relative lg:w-1/2 xl:w-[54%] min-h-[260px] sm:min-h-[320px] lg:min-h-screen overflow-hidden bg-slate-900 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {!imgFailed ? (
          <img
            src={HERO_IMAGE_PATH}
            alt="Focused Class 12 study desk with physics and biology notebooks"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/35" />

        <div className="relative z-10 flex items-center gap-3">
          <BrandLogoMark className="w-10 h-10 shadow-lg shadow-black/25" />
          <span className="font-display text-xl font-bold tracking-tight text-white">
            {APP_CONFIG.APP_NAME}
          </span>
        </div>

        <div className="relative z-10 mt-10 lg:mt-0 max-w-lg">
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
            Every Class 12 chapter, focus hour, and milestone in one place.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-200/90 leading-relaxed">
            Built for Physics, Chemistry, Biology, and Zoology students to track syllabus completion, daily focus goals, and exam readiness.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
            <div>
              <p className="text-xs text-slate-300">Syllabus</p>
              <p className="mt-0.5 text-sm font-semibold text-white">4 Core Subjects</p>
            </div>
            <div>
              <p className="text-xs text-slate-300">Tracking</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Live Focus Timer</p>
            </div>
            <div>
              <p className="text-xs text-slate-300">Reports</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Daily to All-Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right / Bottom Sign-In Workspace */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
              {APP_CONFIG.APP_NAME} · {APP_CONFIG.APP_TAGLINE}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              Sign in to {APP_CONFIG.APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Your Class 12 syllabus progress, study streaks, and analytics are securely synced to your personal Google account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={isSigningIn}
            className="w-full min-h-[54px] px-5 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-base flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10 dark:shadow-none hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
          >
            {isSigningIn ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>{isSigningIn ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {authError && (
            <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              {authError}
            </div>
          )}

          <div className="mt-8 space-y-3.5 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-start gap-3">
              <BookCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Complete Class 12 Physics, Chemistry, Biology, and Zoology syllabus with chapter status & PDF notes.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Resilient Study Timer that preserves progress even if you switch tabs or temporarily go offline.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatic Daily, Weekly, Monthly, and All-Time analytics calculated directly from your sessions.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Private per-student database isolation — only you can access your study records.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
