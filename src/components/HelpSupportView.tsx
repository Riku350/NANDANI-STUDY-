import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileWarning,
  HelpCircle,
  KeyRound,
  MessageCircle,
  UserCog,
} from 'lucide-react';
import { APP_CONFIG, buildWhatsAppUrl } from '../config/appConfig';

interface HelpSupportViewProps {
  onBack: () => void;
}

const HELP_CATEGORIES = [
  {
    id: 'login',
    title: 'Login Problem',
    description: 'Trouble signing in with Google or switching student accounts.',
    icon: KeyRound,
    message: `Hello, I am facing a Login Problem in the ${APP_CONFIG.APP_NAME} Study App.`,
  },
  {
    id: 'pdf',
    title: 'PDF Problem',
    description: 'Unable to open or download Class 12 notes or syllabus PDFs.',
    icon: FileWarning,
    message: `Hello, I need help with a PDF Problem in the ${APP_CONFIG.APP_NAME} Study App.`,
  },
  {
    id: 'timer',
    title: 'Study Timer Problem',
    description: 'Session timer pause, sync, or daily tracking calculation issue.',
    icon: Clock,
    message: `Hello, I need help with a Study Timer Problem in the ${APP_CONFIG.APP_NAME} Study App.`,
  },
  {
    id: 'account',
    title: 'Account Problem',
    description: 'Profile updates, class details, or synced data recovery.',
    icon: UserCog,
    message: `Hello, I need help with an Account Problem in the ${APP_CONFIG.APP_NAME} Study App.`,
  },
  {
    id: 'syllabus',
    title: 'Syllabus Problem',
    description: 'Missing chapters, custom subjects, or progress status updates.',
    icon: BookOpen,
    message: `Hello, I need help with a Syllabus Problem in the ${APP_CONFIG.APP_NAME} Study App.`,
  },
  {
    id: 'other',
    title: 'Other Problem',
    description: 'Suggestions, bug reports, or any other question about the app.',
    icon: HelpCircle,
    message: APP_CONFIG.WHATSAPP_DEFAULT_MESSAGE,
  },
];

export function HelpSupportView({ onBack }: HelpSupportViewProps) {
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Profile</span>
      </button>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Help &amp; Support
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Select an issue below to message our support team directly on WhatsApp.
        </p>
      </div>

      {/* Main Direct WhatsApp Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Need Help?
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Any problem? Contact us on WhatsApp ({APP_CONFIG.WHATSAPP_DISPLAY}).
          </p>
        </div>

        <a
          href={buildWhatsAppUrl(APP_CONFIG.WHATSAPP_DEFAULT_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[48px] px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat on WhatsApp</span>
        </a>
      </div>

      {/* 6 Problem Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HELP_CATEGORIES.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </div>

              <a
                href={buildWhatsAppUrl(cat.message)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Support</span>
              </a>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
