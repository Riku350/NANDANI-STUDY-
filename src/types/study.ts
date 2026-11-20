export type ThemePreference = 'light' | 'dark' | 'system';

export type SubjectIconKey =
  | 'atom'
  | 'flask'
  | 'dna'
  | 'microscope'
  | 'calculator'
  | 'book'
  | 'globe'
  | 'code';

export type SubjectAccentColor =
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'teal'
  | 'indigo';

export type ChapterStatus = 'not_started' | 'in_progress' | 'completed';

export type MaterialCategory = 'notes' | 'syllabus' | 'formula_sheet' | 'practice';

export type AppTab = 'home' | 'subjects' | 'ai_chat' | 'progress' | 'profile' | 'daily';

export type AnalyticsRange = 'today' | 'weekly' | 'monthly' | 'all_time' | 'leaderboard';

export type DailyTaskStatus = 'pending' | 'in_progress' | 'completed';

export type DailyTaskType =
  | 'study_task'
  | 'revision'
  | 'question_practice'
  | 'notes_making'
  | 'mock_test'
  | 'assignment'
  | 'homework'
  | 'doubt_solving'
  | 'reading'
  | 'formula_revision';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskRepeat = 'none' | 'daily' | 'weekly';

export type AiChatCategory =
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Zoology'
  | 'General Study';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  studentClass: string;
  dailyGoalMinutes: number;
  theme: ThemePreference;
  notificationsEnabled: boolean;
  dailyReminderTime: string;
}

export interface UserSubject {
  id: string;
  userId: string;
  name: string;
  iconKey: SubjectIconKey;
  accentColor: SubjectAccentColor;
  order: number;
  isDefault: boolean;
}

export interface ChapterProgress {
  id: string;
  userId: string;
  subjectId: string;
  chapterNumber: number;
  title: string;
  topics: string[];
  status: ChapterStatus;
  totalStudySeconds: number;
  completedAtIso: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  durationSeconds: number;
  dateKey: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  startedAtIso: string;
  endedAtIso: string;
}

export interface StudyMaterial {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  category: MaterialCategory;
  description: string;
  fileUrl: string;
  pageCount: number;
}

export interface DailyTask {
  id: string;
  userId: string;
  dateKey: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  title: string;
  subjectId: string;
  subjectName: string;
  status: DailyTaskStatus;
  completedAtIso: string;
  taskType: DailyTaskType;
  chapterTopic: string;
  startTime: string;
  dueTime: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  reminderEnabled: boolean;
  notes: string;
  repeat: TaskRepeat;
}

export interface DailyTaskInput {
  dateKey: string;
  title: string;
  subjectId?: string;
  subjectName?: string;
  taskType?: DailyTaskType;
  chapterTopic?: string;
  startTime?: string;
  dueTime?: string;
  priority?: TaskPriority;
  estimatedMinutes?: number;
  reminderEnabled?: boolean;
  notes?: string;
  repeat?: TaskRepeat;
}

export interface DailyReview {
  id: string; // YYYY-MM-DD
  userId: string;
  dateKey: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  mistakes: string[];
  improvements: string[];
  tomorrowFocus: string[];
}

export interface AiSuggestedTask {
  title: string;
  subjectName: string;
  chapterTopic: string;
  taskType: DailyTaskType;
  priority: TaskPriority;
  estimatedMinutes: number;
  added?: boolean;
}

export interface AiWeakTopic {
  subjectName: string;
  topic: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAtIso: string;
  suggestedTasks?: AiSuggestedTask[];
  weakTopics?: AiWeakTopic[];
}

export interface AiChatSession {
  id: string;
  userId: string;
  category: AiChatCategory;
  title: string;
  messages: AiChatMessage[];
  lastMessageAtIso: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  studentClass: string;
  weekKey: string; // Monday YYYY-MM-DD
  weeklyStudySeconds: number;
  currentStreak: number;
  sessionsCount: number;
  visible: boolean;
}

export interface ActiveTimerState {
  subjectId: string;
  chapterId: string;
  isRunning: boolean;
  startedAtMs: number | null; // Wall-clock timestamp when last resumed
  accumulatedSeconds: number; // Seconds accumulated prior to current run
  initialStartedAtIso: string | null;
}

export interface PendingOfflineSession {
  session: StudySession;
  chapterDeltaSeconds: number;
}
