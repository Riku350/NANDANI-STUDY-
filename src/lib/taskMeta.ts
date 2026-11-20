import type { AiChatCategory, DailyTaskType, TaskPriority, TaskRepeat } from '../types/study';
import { getLocalDateKey } from './studyStats';

export const SMART_TASK_TYPES: { value: DailyTaskType; label: string }[] = [
  { value: 'study_task', label: 'Study Task' },
  { value: 'revision', label: 'Revision' },
  { value: 'question_practice', label: 'Question Practice' },
  { value: 'notes_making', label: 'Notes Making' },
  { value: 'mock_test', label: 'Mock Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'homework', label: 'Homework' },
  { value: 'doubt_solving', label: 'Doubt Solving' },
  { value: 'reading', label: 'Reading' },
  { value: 'formula_revision', label: 'Formula Revision' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const TASK_REPEATS: { value: TaskRepeat; label: string }[] = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const AI_CHAT_CATEGORIES: AiChatCategory[] = [
  'Physics',
  'Chemistry',
  'Biology',
  'Zoology',
  'General Study',
];

export function getTaskTypeLabel(type?: DailyTaskType): string {
  const found = SMART_TASK_TYPES.find((t) => t.value === type);
  return found ? found.label : 'Study Task';
}

export function getPriorityLabel(priority?: TaskPriority): string {
  if (priority === 'high') return 'High';
  if (priority === 'low') return 'Low';
  return 'Medium';
}

export function addDaysToDateKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + delta);
  return getLocalDateKey(dt);
}
