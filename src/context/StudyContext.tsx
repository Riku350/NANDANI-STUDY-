import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { APP_CONFIG } from '../config/appConfig';
import { DEFAULT_CHAPTERS, DEFAULT_MATERIALS, DEFAULT_SUBJECTS } from '../data/defaultSyllabus';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildGoalReachedCopy,
  buildInactivityCopy,
  canNotifyInactivity,
  getBrowserNotificationPermission,
  getOrInitFirstSeenMs,
  hasNotifiedGoalToday,
  HOURS_24_MS,
  markGoalNotifiedToday,
  markInactivityNotified,
  requestBrowserNotificationPermission,
  triggerBrowserNotification,
  type BrowserNotificationPermission,
} from '../lib/notifications';
import {
  calculateStreaks,
  computeWeeklyReport,
  formatDuration,
  getLocalDateKey,
  getLocalMonthKey,
  getWeekStartDateKey,
} from '../lib/studyStats';
import type {
  ActiveTimerState,
  AiChatCategory,
  AiChatMessage,
  AiChatSession,
  ChapterProgress,
  ChapterStatus,
  DailyReview,
  DailyTask,
  DailyTaskInput,
  DailyTaskStatus,
  DailyTaskType,
  LeaderboardEntry,
  PendingOfflineSession,
  StudyMaterial,
  StudySession,
  SubjectAccentColor,
  SubjectIconKey,
  TaskPriority,
  TaskRepeat,
  ThemePreference,
  UserProfile,
  UserSubject,
} from '../types/study';
import { addDaysToDateKey } from '../lib/taskMeta';

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  subtitle?: string;
}

interface StudyContextValue {
  user: User | null;
  authReady: boolean;
  dataLoading: boolean;
  isBootstrapping: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  profile: UserProfile | null;
  subjects: UserSubject[];
  chapters: ChapterProgress[];
  sessions: StudySession[];
  materials: StudyMaterial[];
  dailyTasks: DailyTask[];
  dailyReviews: DailyReview[];
  aiChats: AiChatSession[];
  resolvedTheme: 'light' | 'dark';
  themePreference: ThemePreference;
  toast: ToastNotice | null;
  dismissToast: () => void;
  showToast: (notice: Omit<ToastNotice, 'id'>) => void;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  isSigningIn: boolean;

  // Profile & preferences
  setTheme: (theme: ThemePreference) => Promise<void>;
  updateDailyGoal: (minutes: number) => Promise<void>;
  updateProfileInfo: (displayName: string, studentClass: string) => Promise<void>;
  updateNotifications: (enabled: boolean, reminderTime: string) => Promise<void>;
  notificationPermission: BrowserNotificationPermission;
  requestNotificationPermission: () => Promise<BrowserNotificationPermission>;
  sendTestNotification: () => Promise<void>;

  // Syllabus & Subjects
  addSubject: (name: string, iconKey: SubjectIconKey, accentColor: SubjectAccentColor) => Promise<void>;
  addChapter: (subjectId: string, title: string, topics: string[]) => Promise<void>;
  setChapterStatus: (chapterId: string, status: ChapterStatus) => Promise<void>;

  // Daily Tasks & Review
  addDailyTask: (
    dateKeyOrInput: string | DailyTaskInput,
    title?: string,
    subjectId?: string
  ) => Promise<void>;
  updateDailyTask: (taskId: string, patch: Partial<DailyTaskInput>) => Promise<void>;
  setDailyTaskStatus: (taskId: string, status: DailyTaskStatus) => Promise<void>;
  moveTaskToDate: (taskId: string, nextDateKey: string) => Promise<void>;
  deleteDailyTask: (taskId: string) => Promise<void>;
  saveDailyReview: (
    dateKey: string,
    payload: { mistakes: string[]; improvements: string[]; tomorrowFocus: string[] }
  ) => Promise<void>;

  // AI Study Chat History
  saveAiChatSession: (chat: AiChatSession) => Promise<void>;
  deleteAiChatSession: (chatId: string) => Promise<void>;
  clearAllAiChatHistory: (category?: AiChatCategory | 'All') => Promise<void>;

  // Global Weekly Leaderboard
  leaderboardEntries: LeaderboardEntry[];
  leaderboardLoading: boolean;
  myLeaderboardVisible: boolean;
  setLeaderboardVisibility: (visible: boolean) => Promise<void>;

  // Sessions & Focus Timer
  activeTimer: ActiveTimerState;
  elapsedSeconds: number;
  timerModalOpen: boolean;
  openTimerModal: (subjectId?: string, chapterId?: string) => void;
  closeTimerModal: () => void;
  selectTimerTarget: (subjectId: string, chapterId: string) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  saveCurrentSession: () => Promise<boolean>;
  deleteStudySession: (sessionId: string) => Promise<void>;
}

const StudyContext = createContext<StudyContextValue | null>(null);

const THEME_STORAGE_KEY = 'nandani_study_theme';

function sanitizeId(input: string): string {
  const clean = input.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return (clean || 'item').slice(0, 48);
}

function getTimerKey(uid: string) {
  return `nandani_study_active_timer_${uid}`;
}

function getPendingKey(uid: string) {
  return `nandani_study_pending_sessions_${uid}`;
}

function getCacheKey(uid: string) {
  return `nandani_study_cache_${uid}`;
}

function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function readInitialThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // ignore storage errors
  }
  return 'light';
}

function applyThemeToDom(pref: ThemePreference): 'light' | 'dark' {
  const effective = pref === 'system' ? resolveSystemTheme() : pref;
  if (typeof document !== 'undefined') {
    if (effective === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore
  }
  return effective;
}

const EMPTY_TIMER: ActiveTimerState = {
  subjectId: 'physics',
  chapterId: 'phy_01',
  isRunning: false,
  startedAtMs: null,
  accumulatedSeconds: 0,
  initialStartedAtIso: null,
};

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [remoteSessions, setRemoteSessions] = useState<StudySession[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingOfflineSession[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
  const [aiChats, setAiChats] = useState<AiChatSession[]>([]);
  const [rawLeaderboard, setRawLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myLeaderboardEntry, setMyLeaderboardEntry] = useState<LeaderboardEntry | null>(null);
  const [myLeaderboardLoaded, setMyLeaderboardLoaded] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [themePreference, setThemePreference] = useState<ThemePreference>(readInitialThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    applyThemeToDom(readInitialThemePreference())
  );

  const [activeTimer, setActiveTimer] = useState<ActiveTimerState>(EMPTY_TIMER);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<BrowserNotificationPermission>(() => getBrowserNotificationPermission());

  const toastTimerRef = useRef<number | null>(null);
  const lastLeaderboardSyncSigRef = useRef<string>('');

  const showToast = useCallback((notice: Omit<ToastNotice, 'id'>) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToast({ ...notice, id });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3800);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Keep theme synced with DOM & system preference
  useEffect(() => {
    setResolvedTheme(applyThemeToDom(themePreference));
    if (themePreference !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(applyThemeToDom('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themePreference]);

  // Network online / offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast({ type: 'info', title: 'Back online', subtitle: 'Syncing your study progress.' });
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
        setSubjects([]);
        setChapters([]);
        setRemoteSessions([]);
        setMaterials([]);
        setDailyTasks([]);
        setDailyReviews([]);
        setAiChats([]);
        setRawLeaderboard([]);
        setMyLeaderboardEntry(null);
        setMyLeaderboardLoaded(false);
        setLeaderboardLoading(false);
        lastLeaderboardSyncSigRef.current = '';
        setPendingQueue([]);
        setActiveTimer(EMPTY_TIMER);
        setElapsedSeconds(0);
        setDataLoading(false);
      }
    });
    return unsub;
  }, []);

  // Restore user's timer & offline cache immediately upon auth
  useEffect(() => {
    if (!user) return;
    try {
      const savedTimerRaw = localStorage.getItem(getTimerKey(user.uid));
      if (savedTimerRaw) {
        const parsed = JSON.parse(savedTimerRaw) as ActiveTimerState;
        if (parsed && typeof parsed.accumulatedSeconds === 'number') {
          setActiveTimer(parsed);
        }
      }
      const savedPendingRaw = localStorage.getItem(getPendingKey(user.uid));
      if (savedPendingRaw) {
        const parsedQueue = JSON.parse(savedPendingRaw) as PendingOfflineSession[];
        if (Array.isArray(parsedQueue)) setPendingQueue(parsedQueue);
      }
      const cachedRaw = localStorage.getItem(getCacheKey(user.uid));
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as {
          profile?: UserProfile;
          subjects?: UserSubject[];
          chapters?: ChapterProgress[];
          sessions?: StudySession[];
          materials?: StudyMaterial[];
          dailyTasks?: DailyTask[];
          dailyReviews?: DailyReview[];
          aiChats?: AiChatSession[];
        };
        if (cached.profile) setProfile(cached.profile);
        if (cached.subjects) setSubjects(cached.subjects);
        if (cached.chapters) setChapters(cached.chapters);
        if (cached.sessions) setRemoteSessions(cached.sessions);
        if (cached.materials) setMaterials(cached.materials);
        if (cached.dailyTasks) setDailyTasks(cached.dailyTasks);
        if (cached.dailyReviews) setDailyReviews(cached.dailyReviews);
        if (cached.aiChats) setAiChats(cached.aiChats);
      }
    } catch {
      // ignore malformed storage
    }
  }, [user]);

  // Persist active timer to localStorage on every state transition and tab hide
  useEffect(() => {
    if (!user) return;
    const persist = () => {
      try {
        localStorage.setItem(getTimerKey(user.uid), JSON.stringify(activeTimer));
      } catch {
        // ignore storage quota errors
      }
    };
    persist();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', persist);
    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', persist);
    };
  }, [user, activeTimer]);

  // Compute live elapsed seconds smoothly from wall-clock timestamps
  useEffect(() => {
    const computeElapsed = () => {
      if (activeTimer.isRunning && activeTimer.startedAtMs) {
        const delta = Math.max(0, Math.floor((Date.now() - activeTimer.startedAtMs) / 1000));
        return activeTimer.accumulatedSeconds + delta;
      }
      return activeTimer.accumulatedSeconds;
    };

    setElapsedSeconds(computeElapsed());

    if (!activeTimer.isRunning) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(computeElapsed());
    }, 500);

    return () => window.clearInterval(interval);
  }, [activeTimer]);

  // Bootstrap first-time user account & attach real-time Firestore listeners
  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;
    const unsubscribers: (() => void)[] = [];

    async function bootstrapAndSubscribe(currentUser: User) {
      const uid = currentUser.uid;
      setDataLoading(true);
      const userDocRef = doc(db, 'users', uid);

      try {
        const snap = await getDoc(userDocRef);
        if (cancelled) return;

        if (!snap.exists()) {
          setIsBootstrapping(true);
          const safeName = (currentUser.displayName || 'Student').trim().slice(0, 100) || 'Student';
          const safeEmail = (currentUser.email || 'student@gmail.com').trim().slice(0, 150);
          const safePhoto = (currentUser.photoURL || '').slice(0, 500);
          const initialTheme = readInitialThemePreference();

          // 1. Create UserProfile first so Master Gate userExists(uid) succeeds
          await setDoc(userDocRef, {
            uid,
            displayName: safeName,
            email: safeEmail,
            photoURL: safePhoto,
            studentClass: APP_CONFIG.DEFAULT_CLASS,
            dailyGoalMinutes: APP_CONFIG.DEFAULT_DAILY_GOAL_MINUTES,
            theme: initialTheme,
            notificationsEnabled: true,
            dailyReminderTime: '08:00',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // 2. Seed Default Subjects batch first so subjectExists(uid, subjectId) passes
          const subjectsBatch = writeBatch(db);
          for (const subj of DEFAULT_SUBJECTS) {
            const subjRef = doc(db, 'users', uid, 'subjects', subj.id);
            subjectsBatch.set(subjRef, {
              id: subj.id,
              userId: uid,
              name: subj.name,
              iconKey: subj.iconKey,
              accentColor: subj.accentColor,
              order: subj.order,
              isDefault: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await subjectsBatch.commit();

          // 3. Seed Default Chapters & Study Materials batch
          const contentBatch = writeBatch(db);
          for (const ch of DEFAULT_CHAPTERS) {
            const chRef = doc(db, 'users', uid, 'chapters', ch.id);
            contentBatch.set(chRef, {
              id: ch.id,
              userId: uid,
              subjectId: ch.subjectId,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              topics: ch.topics,
              status: 'not_started',
              totalStudySeconds: 0,
              completedAtIso: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          for (const mat of DEFAULT_MATERIALS) {
            const matRef = doc(db, 'users', uid, 'materials', mat.id);
            contentBatch.set(matRef, {
              id: mat.id,
              userId: uid,
              subjectId: mat.subjectId,
              title: mat.title,
              category: mat.category,
              description: mat.description,
              fileUrl: '',
              pageCount: mat.pageCount,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await contentBatch.commit();
          if (!cancelled) setIsBootstrapping(false);
        }
      } catch (error) {
        if (!cancelled) setIsBootstrapping(false);
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
        }
      }

      if (cancelled) return;

      // Real-time Profile listener
      unsubscribers.push(
        onSnapshot(
          userDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const d = snapshot.data();
              const nextProfile: UserProfile = {
                uid: d.uid,
                displayName: d.displayName,
                email: d.email,
                photoURL: d.photoURL || '',
                studentClass: d.studentClass || APP_CONFIG.DEFAULT_CLASS,
                dailyGoalMinutes: Number(d.dailyGoalMinutes) || APP_CONFIG.DEFAULT_DAILY_GOAL_MINUTES,
                theme: d.theme || 'light',
                notificationsEnabled: Boolean(d.notificationsEnabled),
                dailyReminderTime: d.dailyReminderTime || '08:00',
              };
              setProfile(nextProfile);
              setThemePreference(nextProfile.theme);
            }
            setDataLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${uid}`);
          }
        )
      );

      // Real-time Subjects listener (strictly scoped with where('userId', '==', uid))
      const subjectsQ = query(collection(db, 'users', uid, 'subjects'), where('userId', '==', uid));
      unsubscribers.push(
        onSnapshot(
          subjectsQ,
          (snapshot) => {
            const list: UserSubject[] = snapshot.docs
              .map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  userId: d.userId,
                  name: d.name,
                  iconKey: d.iconKey,
                  accentColor: d.accentColor,
                  order: Number(d.order) || 0,
                  isDefault: Boolean(d.isDefault),
                };
              })
              .sort((a, b) => a.order - b.order);
            setSubjects(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/subjects`);
          }
        )
      );

      // Real-time Chapters listener
      const chaptersQ = query(collection(db, 'users', uid, 'chapters'), where('userId', '==', uid));
      unsubscribers.push(
        onSnapshot(
          chaptersQ,
          (snapshot) => {
            const list: ChapterProgress[] = snapshot.docs
              .map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  userId: d.userId,
                  subjectId: d.subjectId,
                  chapterNumber: Number(d.chapterNumber) || 1,
                  title: d.title,
                  topics: Array.isArray(d.topics) ? d.topics : [],
                  status: d.status || 'not_started',
                  totalStudySeconds: Number(d.totalStudySeconds) || 0,
                  completedAtIso: d.completedAtIso || '',
                };
              })
              .sort((a, b) => a.chapterNumber - b.chapterNumber);
            setChapters(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/chapters`);
          }
        )
      );

      // Real-time Sessions listener
      const sessionsQ = query(collection(db, 'users', uid, 'sessions'), where('userId', '==', uid));
      unsubscribers.push(
        onSnapshot(
          sessionsQ,
          (snapshot) => {
            const list: StudySession[] = snapshot.docs
              .map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  userId: d.userId,
                  subjectId: d.subjectId,
                  subjectName: d.subjectName,
                  chapterId: d.chapterId,
                  chapterTitle: d.chapterTitle,
                  durationSeconds: Number(d.durationSeconds) || 0,
                  dateKey: d.dateKey,
                  monthKey: d.monthKey,
                  startedAtIso: d.startedAtIso,
                  endedAtIso: d.endedAtIso,
                };
              })
              .sort((a, b) => b.endedAtIso.localeCompare(a.endedAtIso));
            setRemoteSessions(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/sessions`);
          }
        )
      );

      // Real-time Materials listener
      const materialsQ = query(collection(db, 'users', uid, 'materials'), where('userId', '==', uid));
      unsubscribers.push(
        onSnapshot(
          materialsQ,
          (snapshot) => {
            const list: StudyMaterial[] = snapshot.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                id: d.id || docSnap.id,
                userId: d.userId,
                subjectId: d.subjectId,
                title: d.title,
                category: d.category,
                description: d.description || '',
                fileUrl: d.fileUrl || '',
                pageCount: Number(d.pageCount) || 4,
              };
            });
            setMaterials(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/materials`);
          }
        )
      );

      // Real-time Daily Tasks listener
      const dailyTasksQ = query(collection(db, 'users', uid, 'dailyTasks'), where('userId', '==', uid));
      unsubscribers.push(
        onSnapshot(
          dailyTasksQ,
          (snapshot) => {
            const list: DailyTask[] = snapshot.docs
              .map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  userId: d.userId,
                  dateKey: d.dateKey,
                  monthKey: d.monthKey || String(d.dateKey || '').slice(0, 7),
                  title: d.title,
                  subjectId: d.subjectId || '',
                  subjectName: d.subjectName || '',
                  status: (d.status || 'pending') as DailyTaskStatus,
                  completedAtIso: d.completedAtIso || '',
                  taskType: (d.taskType || 'study_task') as DailyTaskType,
                  chapterTopic: d.chapterTopic || '',
                  startTime: d.startTime || '',
                  dueTime: d.dueTime || '',
                  priority: (d.priority || 'medium') as TaskPriority,
                  estimatedMinutes: Number(d.estimatedMinutes) || 0,
                  reminderEnabled: Boolean(d.reminderEnabled),
                  notes: d.notes || '',
                  repeat: (d.repeat || 'none') as TaskRepeat,
                };
              })
              .sort((a, b) => b.id.localeCompare(a.id));
            setDailyTasks(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/dailyTasks`);
          }
        )
      );

      // Real-time Daily Reviews listener
      const dailyReviewsQ = query(collection(db, 'users', uid, 'dailyReviews'), where('userId', '==', uid));
      unsubscribers.push(
        onSnapshot(
          dailyReviewsQ,
          (snapshot) => {
            const list: DailyReview[] = snapshot.docs
              .map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  userId: d.userId,
                  dateKey: d.dateKey || docSnap.id,
                  monthKey: d.monthKey || String(d.dateKey || docSnap.id).slice(0, 7),
                  mistakes: Array.isArray(d.mistakes) ? d.mistakes : [],
                  improvements: Array.isArray(d.improvements) ? d.improvements : [],
                  tomorrowFocus: Array.isArray(d.tomorrowFocus) ? d.tomorrowFocus : [],
                };
              })
              .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
            setDailyReviews(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/dailyReviews`);
          }
        )
      );

      // Real-time AI Chat History listener
      const aiChatsQ = query(collection(db, 'users', uid, 'aiChats'), where('userId', '==', uid));
      unsubscribers.push(
        onSnapshot(
          aiChatsQ,
          (snapshot) => {
            const list: AiChatSession[] = snapshot.docs
              .map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  userId: d.userId,
                  category: (d.category || 'General Study') as AiChatCategory,
                  title: d.title || 'Study Chat',
                  messages: Array.isArray(d.messages) ? (d.messages as AiChatMessage[]) : [],
                  lastMessageAtIso: d.lastMessageAtIso || '',
                };
              })
              .sort((a, b) => b.lastMessageAtIso.localeCompare(a.lastMessageAtIso));
            setAiChats(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/aiChats`);
          }
        )
      );

      // Real-time own Leaderboard entry listener
      setLeaderboardLoading(true);
      const myLeaderboardRef = doc(db, 'leaderboard', uid);
      unsubscribers.push(
        onSnapshot(
          myLeaderboardRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const d = snapshot.data();
              setMyLeaderboardEntry({
                uid: d.uid || uid,
                displayName: d.displayName || 'Student',
                photoURL: d.photoURL || '',
                studentClass: d.studentClass || APP_CONFIG.DEFAULT_CLASS,
                weekKey: d.weekKey || getWeekStartDateKey(),
                weeklyStudySeconds: Number(d.weeklyStudySeconds) || 0,
                currentStreak: Number(d.currentStreak) || 0,
                sessionsCount: Number(d.sessionsCount) || 0,
                visible: Boolean(d.visible),
              });
            } else {
              setMyLeaderboardEntry(null);
            }
            setMyLeaderboardLoaded(true);
          },
          (error) => {
            setMyLeaderboardLoaded(true);
            handleFirestoreError(error, OperationType.GET, `leaderboard/${uid}`);
          }
        )
      );

      // Real-time Global Weekly Leaderboard listener (strictly visible == true per security rules)
      const leaderboardQ = query(
        collection(db, 'leaderboard'),
        where('visible', '==', true),
        limit(100)
      );
      unsubscribers.push(
        onSnapshot(
          leaderboardQ,
          (snapshot) => {
            const list: LeaderboardEntry[] = snapshot.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                uid: d.uid || docSnap.id,
                displayName: d.displayName || 'Student',
                photoURL: d.photoURL || '',
                studentClass: d.studentClass || APP_CONFIG.DEFAULT_CLASS,
                weekKey: d.weekKey || '',
                weeklyStudySeconds: Number(d.weeklyStudySeconds) || 0,
                currentStreak: Number(d.currentStreak) || 0,
                sessionsCount: Number(d.sessionsCount) || 0,
                visible: Boolean(d.visible),
              };
            });
            setRawLeaderboard(list);
            setLeaderboardLoading(false);
          },
          (error) => {
            setLeaderboardLoading(false);
            handleFirestoreError(error, OperationType.LIST, 'leaderboard');
          }
        )
      );
    }

    void bootstrapAndSubscribe(user);

    return () => {
      cancelled = true;
      for (const unsub of unsubscribers) unsub();
    };
  }, [authReady, user]);

  // Cache state locally for seamless offline viewing
  useEffect(() => {
    if (!user || !profile) return;
    try {
      localStorage.setItem(
        getCacheKey(user.uid),
        JSON.stringify({
          profile,
          subjects,
          chapters,
          sessions: remoteSessions,
          materials,
          dailyTasks,
          dailyReviews,
          aiChats,
        })
      );
    } catch {
      // ignore quota
    }
  }, [user, profile, subjects, chapters, remoteSessions, materials, dailyTasks, dailyReviews, aiChats]);

  // Sync queued offline study sessions when back online
  useEffect(() => {
    if (!user || !isOnline || pendingQueue.length === 0) return;

    let syncing = false;
    async function flushPending() {
      if (syncing || !user) return;
      syncing = true;
      const uid = user.uid;
      const remaining: PendingOfflineSession[] = [];

      for (const item of pendingQueue) {
        try {
          const sessionRef = doc(db, 'users', uid, 'sessions', item.session.id);
          await setDoc(sessionRef, {
            ...item.session,
            createdAt: serverTimestamp(),
          });

          const targetChapter = chapters.find((c) => c.id === item.session.chapterId);
          if (targetChapter) {
            const chRef = doc(db, 'users', uid, 'chapters', targetChapter.id);
            const nextStatus =
              targetChapter.status === 'not_started' ? 'in_progress' : targetChapter.status;
            await updateDoc(chRef, {
              totalStudySeconds: targetChapter.totalStudySeconds + item.chapterDeltaSeconds,
              status: nextStatus,
              updatedAt: serverTimestamp(),
            });
          }
        } catch {
          remaining.push(item);
        }
      }

      setPendingQueue(remaining);
      try {
        localStorage.setItem(getPendingKey(uid), JSON.stringify(remaining));
      } catch {
        // ignore
      }
      if (remaining.length < pendingQueue.length) {
        showToast({
          type: 'success',
          title: 'Offline sessions synced',
          subtitle: 'All saved study sessions are now backed up.',
        });
      }
    }

    void flushPending();
  }, [user, isOnline, pendingQueue, chapters, showToast]);

  // Merge remote sessions + un-synced offline sessions without duplicates
  const sessions = useMemo(() => {
    const existingIds = new Set(remoteSessions.map((s) => s.id));
    const extras = pendingQueue
      .map((p) => p.session)
      .filter((s) => !existingIds.has(s.id));
    return [...extras, ...remoteSessions].sort((a, b) => b.endedAtIso.localeCompare(a.endedAtIso));
  }, [remoteSessions, pendingQueue]);

  // Keep active timer subject/chapter valid once data loads
  useEffect(() => {
    if (subjects.length === 0 || chapters.length === 0) return;
    setActiveTimer((prev) => {
      if (prev.isRunning) return prev;
      const validSubj = subjects.some((s) => s.id === prev.subjectId)
        ? prev.subjectId
        : subjects[0].id;
      const subjChapters = chapters.filter((c) => c.subjectId === validSubj);
      const validChap = subjChapters.some((c) => c.id === prev.chapterId)
        ? prev.chapterId
        : subjChapters[0]?.id || prev.chapterId;
      if (validSubj === prev.subjectId && validChap === prev.chapterId) return prev;
      return { ...prev, subjectId: validSubj, chapterId: validChap };
    });
  }, [subjects, chapters]);

  // Auth methods
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed. Please try again.');
      } else if (code === 'auth/network-request-failed') {
        setAuthError('Network error. Please check your internet connection and try again.');
      } else {
        setAuthError('Could not complete Google Sign-In. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      showToast({ type: 'info', title: 'Signed out', subtitle: 'See you in your next study session.' });
    } catch {
      showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
    }
  }, [showToast]);

  // Profile updates
  const setTheme = useCallback(
    async (nextTheme: ThemePreference) => {
      setThemePreference(nextTheme);
      if (!user) return;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          theme: nextTheme,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    },
    [user]
  );

  const updateDailyGoal = useCallback(
    async (minutes: number) => {
      const clamped = Math.max(15, Math.min(960, Math.round(minutes)));
      if (!user) return;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          dailyGoalMinutes: clamped,
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'success', title: 'Daily goal updated' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, showToast]
  );

  const updateProfileInfo = useCallback(
    async (displayName: string, studentClass: string) => {
      if (!user || !profile) return;
      const cleanName = displayName.trim().slice(0, 100);
      const cleanClass = studentClass.trim().slice(0, 40);
      if (!cleanName || !cleanClass) return;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: cleanName,
          photoURL: profile.photoURL || '',
          studentClass: cleanClass,
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'success', title: 'Profile saved' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, profile, showToast]
  );

  const requestNotificationPermission = useCallback(async () => {
    const result = await requestBrowserNotificationPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      showToast({
        type: 'success',
        title: 'Browser notifications enabled',
        subtitle: 'You will be alerted for daily goals and 24h inactivity.',
      });
    } else if (result === 'denied') {
      showToast({
        type: 'info',
        title: 'Browser alerts blocked',
        subtitle: 'In-app study alerts will still notify you here.',
      });
    }
    return result;
  }, [showToast]);

  const sendTestNotification = useCallback(async () => {
    let perm = getBrowserNotificationPermission();
    if (perm === 'default') {
      perm = await requestBrowserNotificationPermission();
      setNotificationPermission(perm);
    }
    const title = `${APP_CONFIG.APP_NAME} Alerts Ready`;
    const body = 'You will receive alerts when you hit your daily study goal or after 24 hours without a session.';
    const sentNative = triggerBrowserNotification(title, body, 'nandani-study-test');
    showToast({
      type: 'success',
      title: sentNative ? 'Browser notification sent' : 'In-app alert active',
      subtitle: body,
    });
  }, [showToast]);

  const updateNotifications = useCallback(
    async (enabled: boolean, reminderTime: string) => {
      if (!user) return;
      const validTime = /^[0-9]{2}:[0-9]{2}$/.test(reminderTime) ? reminderTime : '08:00';
      if (enabled && getBrowserNotificationPermission() === 'default') {
        const perm = await requestBrowserNotificationPermission();
        setNotificationPermission(perm);
      }
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: enabled,
          dailyReminderTime: validTime,
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'success', title: 'Reminder preferences saved' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, showToast]
  );

  // Subjects & Syllabus actions
  const addSubject = useCallback(
    async (name: string, iconKey: SubjectIconKey, accentColor: SubjectAccentColor) => {
      if (!user) return;
      const cleanName = name.trim().slice(0, 60);
      if (!cleanName) return;
      const subjectId = `${sanitizeId(cleanName)}_${Date.now().toString(36).slice(-4)}`;
      const nextOrder = Math.min(100, subjects.length + 1);
      const uid = user.uid;

      try {
        await setDoc(doc(db, 'users', uid, 'subjects', subjectId), {
          id: subjectId,
          userId: uid,
          name: cleanName,
          iconKey,
          accentColor,
          order: nextOrder,
          isDefault: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Create an initial Chapter 1 so the student can start studying immediately
        const firstChapterId = `${subjectId}_ch1`;
        await setDoc(doc(db, 'users', uid, 'chapters', firstChapterId), {
          id: firstChapterId,
          userId: uid,
          subjectId,
          chapterNumber: 1,
          title: `Introduction to ${cleanName}`.slice(0, 140),
          topics: ['Core Concepts', 'Key Definitions', 'Practice Questions'],
          status: 'not_started',
          totalStudySeconds: 0,
          completedAtIso: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        showToast({ type: 'success', title: `${cleanName} added`, subtitle: 'Ready to track chapters & sessions.' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.CREATE, `users/${uid}/subjects/${subjectId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, subjects.length, showToast]
  );

  const addChapter = useCallback(
    async (subjectId: string, title: string, topics: string[]) => {
      if (!user) return;
      const cleanTitle = title.trim().slice(0, 140);
      if (!cleanTitle) return;
      const uid = user.uid;
      const subjChapters = chapters.filter((c) => c.subjectId === subjectId);
      const nextNumber = Math.min(100, subjChapters.length + 1);
      const chapterId = `${sanitizeId(subjectId)}_ch_${Date.now().toString(36)}`;
      const cleanTopics = topics
        .map((t) => t.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 20);

      try {
        await setDoc(doc(db, 'users', uid, 'chapters', chapterId), {
          id: chapterId,
          userId: uid,
          subjectId,
          chapterNumber: nextNumber,
          title: cleanTitle,
          topics: cleanTopics,
          status: 'not_started',
          totalStudySeconds: 0,
          completedAtIso: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'success', title: 'Chapter added to syllabus' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.CREATE, `users/${uid}/chapters/${chapterId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, chapters, showToast]
  );

  const setChapterStatus = useCallback(
    async (chapterId: string, status: ChapterStatus) => {
      if (!user) return;
      const uid = user.uid;
      const completedAtIso = status === 'completed' ? new Date().toISOString() : '';
      try {
        await updateDoc(doc(db, 'users', uid, 'chapters', chapterId), {
          status,
          completedAtIso,
          updatedAt: serverTimestamp(),
        });
        if (status === 'completed') {
          showToast({ type: 'success', title: 'Chapter completed', subtitle: 'Your syllabus progress has been updated.' });
        }
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/chapters/${chapterId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, showToast]
  );

  // Study Timer Controls
  const openTimerModal = useCallback(
    (subjectId?: string, chapterId?: string) => {
      if (subjectId) {
        setActiveTimer((prev) => {
          if (prev.isRunning) return prev;
          const subjChapters = chapters.filter((c) => c.subjectId === subjectId);
          const resolvedChapter =
            chapterId && subjChapters.some((c) => c.id === chapterId)
              ? chapterId
              : subjChapters.find((c) => c.status !== 'completed')?.id ||
                subjChapters[0]?.id ||
                prev.chapterId;
          return {
            ...prev,
            subjectId,
            chapterId: resolvedChapter,
          };
        });
      }
      setTimerModalOpen(true);
    },
    [chapters]
  );

  const closeTimerModal = useCallback(() => {
    setTimerModalOpen(false);
  }, []);

  const selectTimerTarget = useCallback(
    (subjectId: string, chapterId: string) => {
      setActiveTimer((prev) => {
        if (prev.isRunning) return prev;
        const subjChapters = chapters.filter((c) => c.subjectId === subjectId);
        const validChapter = subjChapters.some((c) => c.id === chapterId)
          ? chapterId
          : subjChapters[0]?.id || chapterId;
        return {
          ...prev,
          subjectId,
          chapterId: validChapter,
        };
      });
    },
    [chapters]
  );

  const startTimer = useCallback(() => {
    const nowMs = Date.now();
    setActiveTimer((prev) => {
      if (prev.isRunning) return prev;
      return {
        ...prev,
        isRunning: true,
        startedAtMs: nowMs,
        initialStartedAtIso: prev.initialStartedAtIso || new Date(nowMs).toISOString(),
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setActiveTimer((prev) => {
      if (!prev.isRunning || !prev.startedAtMs) return prev;
      const delta = Math.max(0, Math.floor((Date.now() - prev.startedAtMs) / 1000));
      return {
        ...prev,
        isRunning: false,
        startedAtMs: null,
        accumulatedSeconds: prev.accumulatedSeconds + delta,
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setActiveTimer((prev) => ({
      ...prev,
      isRunning: false,
      startedAtMs: null,
      accumulatedSeconds: 0,
      initialStartedAtIso: null,
    }));
    setElapsedSeconds(0);
  }, []);

  const saveCurrentSession = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const now = new Date();
    const totalSeconds =
      activeTimer.isRunning && activeTimer.startedAtMs
        ? activeTimer.accumulatedSeconds +
          Math.max(0, Math.floor((Date.now() - activeTimer.startedAtMs) / 1000))
        : activeTimer.accumulatedSeconds;

    if (totalSeconds < 1) {
      showToast({ type: 'info', title: 'Start the timer first', subtitle: 'Study for at least a few seconds before saving.' });
      return false;
    }

    const cappedSeconds = Math.min(86400, totalSeconds);
    const subj = subjects.find((s) => s.id === activeTimer.subjectId) || subjects[0];
    const chap =
      chapters.find((c) => c.id === activeTimer.chapterId) ||
      chapters.find((c) => c.subjectId === subj?.id);

    if (!subj || !chap) {
      showToast({ type: 'error', title: 'Select a subject and chapter first.' });
      return false;
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionRecord: StudySession = {
      id: sessionId,
      userId: user.uid,
      subjectId: subj.id,
      subjectName: subj.name.slice(0, 60),
      chapterId: chap.id,
      chapterTitle: chap.title.slice(0, 140),
      durationSeconds: cappedSeconds,
      dateKey: getLocalDateKey(now),
      monthKey: getLocalMonthKey(now),
      startedAtIso:
        activeTimer.initialStartedAtIso ||
        new Date(now.getTime() - cappedSeconds * 1000).toISOString(),
      endedAtIso: now.toISOString(),
    };

    // Reset timer state immediately for snappy UX
    setActiveTimer((prev) => ({
      ...prev,
      isRunning: false,
      startedAtMs: null,
      accumulatedSeconds: 0,
      initialStartedAtIso: null,
    }));
    setElapsedSeconds(0);

    if (!navigator.onLine) {
      const nextQueue = [...pendingQueue, { session: sessionRecord, chapterDeltaSeconds: cappedSeconds }];
      setPendingQueue(nextQueue);
      try {
        localStorage.setItem(getPendingKey(user.uid), JSON.stringify(nextQueue));
      } catch {
        // ignore
      }
      showToast({
        type: 'info',
        title: 'Session saved offline',
        subtitle: "You're offline. Your data will sync when you're back online.",
      });
      return true;
    }

    try {
      await setDoc(doc(db, 'users', user.uid, 'sessions', sessionId), {
        ...sessionRecord,
        createdAt: serverTimestamp(),
      });

      const nextStatus = chap.status === 'not_started' ? 'in_progress' : chap.status;
      await updateDoc(doc(db, 'users', user.uid, 'chapters', chap.id), {
        totalStudySeconds: chap.totalStudySeconds + cappedSeconds,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      showToast({
        type: 'success',
        title: 'Study session recorded',
        subtitle: `${subj.name} — ${chap.title}`,
      });
      return true;
    } catch (error) {
      // Queue locally if transient network failure occurred
      const nextQueue = [...pendingQueue, { session: sessionRecord, chapterDeltaSeconds: cappedSeconds }];
      setPendingQueue(nextQueue);
      try {
        localStorage.setItem(getPendingKey(user.uid), JSON.stringify(nextQueue));
      } catch {
        // ignore
      }
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/sessions/${sessionId}`);
    }
  }, [user, activeTimer, subjects, chapters, pendingQueue, showToast]);

  const deleteStudySession = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionId));
        showToast({ type: 'info', title: 'Session removed' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/sessions/${sessionId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, showToast]
  );

  // Local Browser Notification Monitor: 1) Daily Study Goal Reached
  useEffect(() => {
    if (!user || !profile || dataLoading || isBootstrapping) return;
    if (!profile.notificationsEnabled) return;

    const todayKey = getLocalDateKey();
    if (hasNotifiedGoalToday(user.uid, todayKey)) return;

    const goalSeconds = Math.max(60, (profile.dailyGoalMinutes || APP_CONFIG.DEFAULT_DAILY_GOAL_MINUTES) * 60);
    const todaySavedSeconds = sessions
      .filter((s) => s.dateKey === todayKey)
      .reduce((acc, s) => acc + s.durationSeconds, 0);
    const liveSeconds = activeTimer.isRunning ? elapsedSeconds : 0;

    if (todaySavedSeconds + liveSeconds >= goalSeconds) {
      markGoalNotifiedToday(user.uid, todayKey);
      const copy = buildGoalReachedCopy(formatDuration(goalSeconds));
      triggerBrowserNotification(copy.title, copy.body, `nandani-goal-${todayKey}`);
      showToast({
        type: 'success',
        title: 'Daily study goal reached!',
        subtitle: copy.body,
      });
    }
  }, [
    user,
    profile,
    dataLoading,
    isBootstrapping,
    sessions,
    activeTimer.isRunning,
    elapsedSeconds,
    showToast,
  ]);

  // Local Browser Notification Monitor: 2) 24+ Hours Without Starting a Session
  useEffect(() => {
    if (!user || !profile || dataLoading || isBootstrapping) return;
    if (!profile.notificationsEnabled) return;

    const uid = user.uid;
    const firstSeenMs = getOrInitFirstSeenMs(uid);

    const checkInactivity = () => {
      if (activeTimer.isRunning) return;
      const nowMs = Date.now();
      if (!canNotifyInactivity(uid, nowMs)) return;

      let lastActivityMs = firstSeenMs;
      if (sessions.length > 0 && sessions[0].endedAtIso) {
        const parsed = Date.parse(sessions[0].endedAtIso);
        if (Number.isFinite(parsed)) {
          lastActivityMs = parsed;
        }
      }

      const elapsedMs = nowMs - lastActivityMs;
      if (elapsedMs >= HOURS_24_MS) {
        markInactivityNotified(uid, nowMs);
        const copy = buildInactivityCopy(elapsedMs / (60 * 60 * 1000));
        triggerBrowserNotification(copy.title, copy.body, `nandani-inactivity-${getLocalDateKey()}`);
        showToast({
          type: 'info',
          title: 'Time to study!',
          subtitle: copy.body,
        });
      }
    };

    checkInactivity();
    const intervalId = window.setInterval(checkInactivity, 15 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [user, profile, dataLoading, isBootstrapping, sessions, activeTimer.isRunning, showToast]);

  // Daily Tasks & Daily Review mutations
  const addDailyTask = useCallback(
    async (
      dateKeyOrInput: string | DailyTaskInput,
      legacyTitle?: string,
      legacySubjectId?: string
    ) => {
      if (!user) return;
      const input: DailyTaskInput =
        typeof dateKeyOrInput === 'string'
          ? {
              dateKey: dateKeyOrInput,
              title: legacyTitle || '',
              subjectId: legacySubjectId,
            }
          : dateKeyOrInput;

      const dateKey = input.dateKey;
      const cleanTitle = input.title.trim().slice(0, 160);
      if (!cleanTitle || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateKey)) return;

      const uid = user.uid;
      const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const matchedSubj = input.subjectId
        ? subjects.find((s) => s.id === input.subjectId)
        : input.subjectName
        ? subjects.find((s) => s.name.toLowerCase() === input.subjectName?.toLowerCase())
        : undefined;

      const cleanSubjectId = matchedSubj ? matchedSubj.id : '';
      const cleanSubjectName = matchedSubj
        ? matchedSubj.name.slice(0, 60)
        : (input.subjectName || '').trim().slice(0, 60);
      const monthKey = dateKey.slice(0, 7);

      const taskType: DailyTaskType = input.taskType || 'study_task';
      const priority: TaskPriority = input.priority || 'medium';
      const repeat: TaskRepeat = input.repeat || 'none';
      const estimatedMinutes = Math.max(0, Math.min(720, Math.round(Number(input.estimatedMinutes) || 0)));

      try {
        await setDoc(doc(db, 'users', uid, 'dailyTasks', taskId), {
          id: taskId,
          userId: uid,
          dateKey,
          monthKey,
          title: cleanTitle,
          subjectId: cleanSubjectId,
          subjectName: cleanSubjectName,
          status: 'pending',
          completedAtIso: '',
          taskType,
          chapterTopic: (input.chapterTopic || '').trim().slice(0, 120),
          startTime: (input.startTime || '').trim().slice(0, 10),
          dueTime: (input.dueTime || '').trim().slice(0, 10),
          priority,
          estimatedMinutes,
          reminderEnabled: Boolean(input.reminderEnabled),
          notes: (input.notes || '').trim().slice(0, 400),
          repeat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'success', title: 'Task added', subtitle: cleanTitle });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.CREATE, `users/${uid}/dailyTasks/${taskId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, subjects, showToast]
  );

  const updateDailyTask = useCallback(
    async (taskId: string, patch: Partial<DailyTaskInput>) => {
      if (!user) return;
      const existing = dailyTasks.find((t) => t.id === taskId);
      if (!existing) return;
      const uid = user.uid;

      const nextDateKey =
        patch.dateKey && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(patch.dateKey)
          ? patch.dateKey
          : existing.dateKey;
      const matchedSubj =
        patch.subjectId !== undefined
          ? subjects.find((s) => s.id === patch.subjectId)
          : subjects.find((s) => s.id === existing.subjectId);

      const cleanTitle =
        patch.title !== undefined ? patch.title.trim().slice(0, 160) : existing.title;
      if (!cleanTitle) return;

      try {
        await updateDoc(doc(db, 'users', uid, 'dailyTasks', taskId), {
          title: cleanTitle,
          dateKey: nextDateKey,
          monthKey: nextDateKey.slice(0, 7),
          subjectId: matchedSubj ? matchedSubj.id : '',
          subjectName: matchedSubj
            ? matchedSubj.name.slice(0, 60)
            : (patch.subjectName ?? existing.subjectName).trim().slice(0, 60),
          taskType: patch.taskType ?? existing.taskType ?? 'study_task',
          chapterTopic: (patch.chapterTopic ?? existing.chapterTopic ?? '').trim().slice(0, 120),
          startTime: (patch.startTime ?? existing.startTime ?? '').trim().slice(0, 10),
          dueTime: (patch.dueTime ?? existing.dueTime ?? '').trim().slice(0, 10),
          priority: patch.priority ?? existing.priority ?? 'medium',
          estimatedMinutes: Math.max(
            0,
            Math.min(720, Math.round(Number(patch.estimatedMinutes ?? existing.estimatedMinutes) || 0))
          ),
          reminderEnabled: patch.reminderEnabled ?? existing.reminderEnabled ?? false,
          notes: (patch.notes ?? existing.notes ?? '').trim().slice(0, 400),
          repeat: patch.repeat ?? existing.repeat ?? 'none',
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'success', title: 'Task updated' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/dailyTasks/${taskId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, dailyTasks, subjects, showToast]
  );

  const setDailyTaskStatus = useCallback(
    async (taskId: string, status: DailyTaskStatus) => {
      if (!user) return;
      const uid = user.uid;
      const task = dailyTasks.find((t) => t.id === taskId);
      const completedAtIso = status === 'completed' ? new Date().toISOString() : '';
      try {
        await updateDoc(doc(db, 'users', uid, 'dailyTasks', taskId), {
          status,
          completedAtIso,
          updatedAt: serverTimestamp(),
        });

        // If a repeating task is completed, schedule the next occurrence if not already present
        if (status === 'completed' && task && (task.repeat === 'daily' || task.repeat === 'weekly')) {
          const delta = task.repeat === 'daily' ? 1 : 7;
          const nextDate = addDaysToDateKey(task.dateKey, delta);
          const alreadyScheduled = dailyTasks.some(
            (t) =>
              t.dateKey === nextDate &&
              t.title.toLowerCase() === task.title.toLowerCase() &&
              t.subjectId === task.subjectId
          );
          if (!alreadyScheduled) {
            const nextTaskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            await setDoc(doc(db, 'users', uid, 'dailyTasks', nextTaskId), {
              id: nextTaskId,
              userId: uid,
              dateKey: nextDate,
              monthKey: nextDate.slice(0, 7),
              title: task.title,
              subjectId: task.subjectId,
              subjectName: task.subjectName,
              status: 'pending',
              completedAtIso: '',
              taskType: task.taskType || 'study_task',
              chapterTopic: task.chapterTopic || '',
              startTime: task.startTime || '',
              dueTime: task.dueTime || '',
              priority: task.priority || 'medium',
              estimatedMinutes: task.estimatedMinutes || 0,
              reminderEnabled: Boolean(task.reminderEnabled),
              notes: task.notes || '',
              repeat: task.repeat,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }

        if (status === 'completed') {
          showToast({
            type: 'success',
            title: 'Task completed!',
            subtitle:
              task?.repeat === 'daily'
                ? 'Next daily task scheduled for tomorrow.'
                : task?.repeat === 'weekly'
                ? 'Next weekly task scheduled.'
                : undefined,
          });
        }
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/dailyTasks/${taskId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, dailyTasks, showToast]
  );

  const moveTaskToDate = useCallback(
    async (taskId: string, nextDateKey: string) => {
      if (!user || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(nextDateKey)) return;
      const uid = user.uid;
      try {
        await updateDoc(doc(db, 'users', uid, 'dailyTasks', taskId), {
          dateKey: nextDateKey,
          monthKey: nextDateKey.slice(0, 7),
          status: 'pending',
          completedAtIso: '',
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'info', title: 'Moved to tomorrow' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/dailyTasks/${taskId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, showToast]
  );

  const deleteDailyTask = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const uid = user.uid;
      try {
        await deleteDoc(doc(db, 'users', uid, 'dailyTasks', taskId));
        showToast({ type: 'info', title: 'Task removed' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.DELETE, `users/${uid}/dailyTasks/${taskId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, showToast]
  );

  const saveDailyReview = useCallback(
    async (
      dateKey: string,
      payload: { mistakes: string[]; improvements: string[]; tomorrowFocus: string[] }
    ) => {
      if (!user || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateKey)) return;
      const uid = user.uid;
      const cleanList = (arr: string[]) =>
        arr
          .map((item) => item.trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 20);

      const mistakes = cleanList(payload.mistakes);
      const improvements = cleanList(payload.improvements);
      const tomorrowFocus = cleanList(payload.tomorrowFocus);
      const reviewRef = doc(db, 'users', uid, 'dailyReviews', dateKey);
      const alreadyExists = dailyReviews.some((r) => r.dateKey === dateKey);

      try {
        if (alreadyExists) {
          await updateDoc(reviewRef, {
            mistakes,
            improvements,
            tomorrowFocus,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(reviewRef, {
            id: dateKey,
            userId: uid,
            dateKey,
            monthKey: dateKey.slice(0, 7),
            mistakes,
            improvements,
            tomorrowFocus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.WRITE, `users/${uid}/dailyReviews/${dateKey}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, dailyReviews, showToast]
  );

  // Normalize & rank Global Leaderboard entries for the active Monday-Sunday week
  const leaderboardEntries = useMemo(() => {
    const currentWeekKey = getWeekStartDateKey();
    return rawLeaderboard
      .map((entry) => {
        const isCurrentWeek = entry.weekKey === currentWeekKey;
        return {
          ...entry,
          weekKey: currentWeekKey,
          weeklyStudySeconds: isCurrentWeek ? entry.weeklyStudySeconds : 0,
          sessionsCount: isCurrentWeek ? entry.sessionsCount : 0,
        };
      })
      .sort((a, b) => {
        if (b.weeklyStudySeconds !== a.weeklyStudySeconds) {
          return b.weeklyStudySeconds - a.weeklyStudySeconds;
        }
        if (b.currentStreak !== a.currentStreak) {
          return b.currentStreak - a.currentStreak;
        }
        return a.displayName.localeCompare(b.displayName);
      });
  }, [rawLeaderboard]);

  const myLeaderboardVisible = myLeaderboardEntry ? myLeaderboardEntry.visible : true;

  // Automatically sync current student's weekly study time & streak to /leaderboard/{uid}
  useEffect(() => {
    if (!authReady || !user || !profile || isBootstrapping || !myLeaderboardLoaded || !isOnline) {
      return;
    }

    const uid = user.uid;
    const currentWeekKey = getWeekStartDateKey();
    const weeklyReport = computeWeeklyReport(sessions, subjects);
    const weekDateSet = new Set(weeklyReport.days.map((d) => d.dateKey));
    const sessionsCount = Math.min(
      500,
      sessions.filter((s) => weekDateSet.has(s.dateKey)).length
    );
    const weeklyStudySeconds = Math.min(604800, Math.max(0, Math.round(weeklyReport.totalSeconds)));
    const currentStreak = Math.min(3650, Math.max(0, calculateStreaks(sessions).currentStreak));

    const displayName = (profile.displayName || 'Student').trim().slice(0, 100) || 'Student';
    const photoURL = (profile.photoURL || '').slice(0, 500);
    const studentClass = (profile.studentClass || APP_CONFIG.DEFAULT_CLASS).trim().slice(0, 40) || APP_CONFIG.DEFAULT_CLASS;
    const visible = myLeaderboardEntry ? myLeaderboardEntry.visible : true;

    const sig = JSON.stringify({
      uid,
      displayName,
      photoURL,
      studentClass,
      weekKey: currentWeekKey,
      weeklyStudySeconds,
      currentStreak,
      sessionsCount,
      visible,
    });

    // Skip write if already up to date in Firestore or already synced in this session
    if (
      myLeaderboardEntry &&
      myLeaderboardEntry.displayName === displayName &&
      myLeaderboardEntry.photoURL === photoURL &&
      myLeaderboardEntry.studentClass === studentClass &&
      myLeaderboardEntry.weekKey === currentWeekKey &&
      myLeaderboardEntry.weeklyStudySeconds === weeklyStudySeconds &&
      myLeaderboardEntry.currentStreak === currentStreak &&
      myLeaderboardEntry.sessionsCount === sessionsCount &&
      myLeaderboardEntry.visible === visible
    ) {
      lastLeaderboardSyncSigRef.current = sig;
      return;
    }

    if (lastLeaderboardSyncSigRef.current === sig) return;
    lastLeaderboardSyncSigRef.current = sig;

    const lbRef = doc(db, 'leaderboard', uid);
    const syncEntry = async () => {
      try {
        if (myLeaderboardEntry) {
          await updateDoc(lbRef, {
            displayName,
            photoURL,
            studentClass,
            weekKey: currentWeekKey,
            weeklyStudySeconds,
            currentStreak,
            sessionsCount,
            visible,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(lbRef, {
            uid,
            displayName,
            photoURL,
            studentClass,
            weekKey: currentWeekKey,
            weeklyStudySeconds,
            currentStreak,
            sessionsCount,
            visible,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        lastLeaderboardSyncSigRef.current = '';
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.WRITE, `leaderboard/${uid}`);
        }
      }
    };

    void syncEntry();
  }, [
    authReady,
    user,
    profile,
    isBootstrapping,
    myLeaderboardLoaded,
    myLeaderboardEntry,
    isOnline,
    sessions,
    subjects,
  ]);

  const setLeaderboardVisibility = useCallback(
    async (visible: boolean) => {
      if (!user || !profile) return;
      const uid = user.uid;
      const lbRef = doc(db, 'leaderboard', uid);
      try {
        if (myLeaderboardEntry) {
          await updateDoc(lbRef, {
            visible,
            updatedAt: serverTimestamp(),
          });
        } else {
          const currentWeekKey = getWeekStartDateKey();
          const weeklyReport = computeWeeklyReport(sessions, subjects);
          const weekDateSet = new Set(weeklyReport.days.map((d) => d.dateKey));
          const sessionsCount = Math.min(
            500,
            sessions.filter((s) => weekDateSet.has(s.dateKey)).length
          );
          const weeklyStudySeconds = Math.min(
            604800,
            Math.max(0, Math.round(weeklyReport.totalSeconds))
          );
          const currentStreak = Math.min(
            3650,
            Math.max(0, calculateStreaks(sessions).currentStreak)
          );
          await setDoc(lbRef, {
            uid,
            displayName: (profile.displayName || 'Student').trim().slice(0, 100) || 'Student',
            photoURL: (profile.photoURL || '').slice(0, 500),
            studentClass:
              (profile.studentClass || APP_CONFIG.DEFAULT_CLASS).trim().slice(0, 40) ||
              APP_CONFIG.DEFAULT_CLASS,
            weekKey: currentWeekKey,
            weeklyStudySeconds,
            currentStreak,
            sessionsCount,
            visible,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast({
          type: 'info',
          title: visible ? 'Visible on Global Leaderboard' : 'Hidden from Global Leaderboard',
          subtitle: visible
            ? 'Your weekly study time is now ranked with classmates.'
            : 'Only you can see your weekly study progress.',
        });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.UPDATE, `leaderboard/${uid}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, profile, myLeaderboardEntry, sessions, subjects, showToast]
  );

  const saveAiChatSession = useCallback(
    async (chat: AiChatSession) => {
      if (!user) return;
      const uid = user.uid;
      const cleanId = sanitizeId(chat.id) || `chat_${Date.now()}`;
      const cleanTitle = (chat.title || 'Study Chat').trim().slice(0, 120) || 'Study Chat';
      const cleanMessages = chat.messages.slice(-60).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content.slice(0, 12000),
        createdAtIso: m.createdAtIso || new Date().toISOString(),
        ...(m.suggestedTasks && m.suggestedTasks.length > 0
          ? { suggestedTasks: m.suggestedTasks.slice(0, 3) }
          : {}),
        ...(m.weakTopics && m.weakTopics.length > 0
          ? { weakTopics: m.weakTopics.slice(0, 3) }
          : {}),
      }));
      const lastMessageAtIso =
        chat.lastMessageAtIso ||
        cleanMessages[cleanMessages.length - 1]?.createdAtIso ||
        new Date().toISOString();

      const chatRef = doc(db, 'users', uid, 'aiChats', cleanId);
      const exists = aiChats.some((c) => c.id === cleanId);

      try {
        if (exists) {
          await updateDoc(chatRef, {
            title: cleanTitle,
            category: chat.category,
            messages: cleanMessages,
            lastMessageAtIso,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(chatRef, {
            id: cleanId,
            userId: uid,
            category: chat.category,
            title: cleanTitle,
            messages: cleanMessages,
            lastMessageAtIso,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.WRITE, `users/${uid}/aiChats/${cleanId}`);
        }
      }
    },
    [user, aiChats]
  );

  const deleteAiChatSession = useCallback(
    async (chatId: string) => {
      if (!user) return;
      const uid = user.uid;
      try {
        await deleteDoc(doc(db, 'users', uid, 'aiChats', chatId));
        showToast({ type: 'info', title: 'Chat deleted' });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.DELETE, `users/${uid}/aiChats/${chatId}`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, showToast]
  );

  const clearAllAiChatHistory = useCallback(
    async (category?: AiChatCategory | 'All') => {
      if (!user) return;
      const uid = user.uid;
      const targets =
        !category || category === 'All'
          ? aiChats
          : aiChats.filter((c) => c.category === category);
      if (targets.length === 0) return;

      try {
        const batch = writeBatch(db);
        for (const c of targets.slice(0, 450)) {
          batch.delete(doc(db, 'users', uid, 'aiChats', c.id));
        }
        await batch.commit();
        showToast({
          type: 'info',
          title:
            !category || category === 'All'
              ? 'All AI chat history deleted'
              : `Cleared ${category} chat history`,
        });
      } catch (error) {
        if (navigator.onLine) {
          handleFirestoreError(error, OperationType.DELETE, `users/${uid}/aiChats`);
        } else {
          showToast({ type: 'error', title: 'Something went wrong. Please try again.' });
        }
      }
    },
    [user, aiChats, showToast]
  );

  const value: StudyContextValue = {
    user,
    authReady,
    dataLoading,
    isBootstrapping,
    isOnline,
    pendingSyncCount: pendingQueue.length,
    profile,
    subjects,
    chapters,
    sessions,
    materials,
    dailyTasks,
    dailyReviews,
    aiChats,
    resolvedTheme,
    themePreference,
    toast,
    dismissToast,
    showToast,
    signInWithGoogle,
    signOut,
    authError,
    isSigningIn,
    setTheme,
    updateDailyGoal,
    updateProfileInfo,
    updateNotifications,
    notificationPermission,
    requestNotificationPermission,
    sendTestNotification,
    addSubject,
    addChapter,
    setChapterStatus,
    addDailyTask,
    updateDailyTask,
    setDailyTaskStatus,
    moveTaskToDate,
    deleteDailyTask,
    saveDailyReview,
    saveAiChatSession,
    deleteAiChatSession,
    clearAllAiChatHistory,
    leaderboardEntries,
    leaderboardLoading,
    myLeaderboardVisible,
    setLeaderboardVisibility,
    activeTimer,
    elapsedSeconds,
    timerModalOpen,
    openTimerModal,
    closeTimerModal,
    selectTimerTarget,
    startTimer,
    pauseTimer,
    resetTimer,
    saveCurrentSession,
    deleteStudySession,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}
