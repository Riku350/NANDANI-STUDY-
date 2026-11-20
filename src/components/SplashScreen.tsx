import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { APP_CONFIG } from '../config/appConfig';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const totalMs = 1750;
    let rafId = 0;

    const step = (now: number) => {
      const ratio = Math.min(1, (now - start) / totalMs);
      const eased = 1 - Math.pow(1 - ratio, 2.5);
      setProgress(Math.round(eased * 100));
      if (ratio < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        window.setTimeout(onComplete, 220);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] px-6 select-none overflow-hidden"
      aria-label={`Loading ${APP_CONFIG.APP_NAME}`}
    >
      {/* Subtle radial atmospheric accent */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
        className="pointer-events-none absolute w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-500/12 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center max-w-xs w-full text-center">
        {/* Animated Nandani Study Monogram Emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.72, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 shadow-2xl shadow-blue-600/25 rounded-2xl"
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-18 h-18"
            aria-hidden="true"
          >
            <rect width="64" height="64" rx="18" className="fill-blue-600 dark:fill-blue-500" />
            <motion.path
              d="M20 44V20L42 43.5V20"
              stroke="white"
              strokeWidth="4.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0.3 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.circle
              cx="47.5"
              cy="18.5"
              r="3.4"
              fill="#BFDBFE"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </motion.div>

        {/* Animated Official Name: Nandani Study */}
        <motion.h1
          initial={{ opacity: 0, y: 12, letterSpacing: '0.04em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '-0.025em' }}
          transition={{ delay: 0.24, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white"
        >
          <span>Nandani </span>
          <span className="text-blue-600 dark:text-blue-400">Study</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400"
        >
          {APP_CONFIG.APP_TAGLINE}
        </motion.p>

        {/* Smooth Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="mt-9 w-52"
        >
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 origin-left transition-transform duration-100 ease-out"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
            <span>Loading {APP_CONFIG.APP_NAME}</span>
            <span>{progress}%</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
