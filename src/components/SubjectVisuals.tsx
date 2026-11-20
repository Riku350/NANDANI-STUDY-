import React from 'react';
import {
  Atom,
  BookOpen,
  Calculator,
  Code2,
  Dna,
  FlaskConical,
  Globe2,
  Microscope,
} from 'lucide-react';
import type { SubjectAccentColor, SubjectIconKey } from '../types/study';

export function SubjectIcon({
  iconKey,
  className = 'w-5 h-5',
}: {
  iconKey: SubjectIconKey;
  className?: string;
}) {
  switch (iconKey) {
    case 'atom':
      return <Atom className={className} />;
    case 'flask':
      return <FlaskConical className={className} />;
    case 'dna':
      return <Dna className={className} />;
    case 'microscope':
      return <Microscope className={className} />;
    case 'calculator':
      return <Calculator className={className} />;
    case 'globe':
      return <Globe2 className={className} />;
    case 'code':
      return <Code2 className={className} />;
    case 'book':
    default:
      return <BookOpen className={className} />;
  }
}

export function getAccentClasses(color: SubjectAccentColor) {
  switch (color) {
    case 'amber':
      return {
        softBg: 'bg-amber-50 dark:bg-amber-500/12',
        text: 'text-amber-600 dark:text-amber-400',
        bar: 'bg-amber-500',
        ring: '#F59E0B',
      };
    case 'emerald':
      return {
        softBg: 'bg-emerald-50 dark:bg-emerald-500/12',
        text: 'text-emerald-600 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        ring: '#10B981',
      };
    case 'rose':
      return {
        softBg: 'bg-rose-50 dark:bg-rose-500/12',
        text: 'text-rose-600 dark:text-rose-400',
        bar: 'bg-rose-500',
        ring: '#F43F5E',
      };
    case 'violet':
      return {
        softBg: 'bg-violet-50 dark:bg-violet-500/12',
        text: 'text-violet-600 dark:text-violet-400',
        bar: 'bg-violet-500',
        ring: '#8B5CF6',
      };
    case 'cyan':
      return {
        softBg: 'bg-cyan-50 dark:bg-cyan-500/12',
        text: 'text-cyan-600 dark:text-cyan-400',
        bar: 'bg-cyan-500',
        ring: '#06B6D4',
      };
    case 'teal':
      return {
        softBg: 'bg-teal-50 dark:bg-teal-500/12',
        text: 'text-teal-600 dark:text-teal-400',
        bar: 'bg-teal-500',
        ring: '#14B8A6',
      };
    case 'indigo':
      return {
        softBg: 'bg-indigo-50 dark:bg-indigo-500/12',
        text: 'text-indigo-600 dark:text-indigo-400',
        bar: 'bg-indigo-500',
        ring: '#6366F1',
      };
    case 'blue':
    default:
      return {
        softBg: 'bg-blue-50 dark:bg-blue-500/12',
        text: 'text-blue-600 dark:text-blue-400',
        bar: 'bg-blue-600 dark:bg-blue-500',
        ring: '#3B82F6',
      };
  }
}

export function BrandLogoMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" className="fill-blue-600 dark:fill-blue-500" />
      <path
        d="M12.5 28V12.5L26.5 27.5V12.5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29.5" cy="11.5" r="2.2" fill="#BFDBFE" />
    </svg>
  );
}
