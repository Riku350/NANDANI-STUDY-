import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  FileText,
  HelpCircle,
  History,
  ListChecks,
  Loader2,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { getLocalDateKey } from '../lib/studyStats';
import {
  AI_CHAT_CATEGORIES,
  addDaysToDateKey,
  getPriorityLabel,
  getTaskTypeLabel,
} from '../lib/taskMeta';
import type {
  AiChatCategory,
  AiChatMessage,
  AiChatSession,
  AiSuggestedTask,
  AiWeakTopic,
} from '../types/study';

interface QuickActionDef {
  id: string;
  label: string;
  prompt: string;
  sendImmediately?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_ACTIONS: QuickActionDef[] = [
  {
    id: 'explain',
    label: 'Explain Topic',
    prompt: 'Explain this topic in simple language with example: ',
    icon: BookOpen,
  },
  {
    id: 'notes',
    label: 'Make Notes',
    prompt: 'Make crisp Class 12 exam revision short notes for: ',
    icon: FileText,
  },
  {
    id: 'solve',
    label: 'Solve Question',
    prompt: 'Solve this question step-by-step with formula and final answer: ',
    icon: HelpCircle,
  },
  {
    id: 'quiz',
    label: 'Quiz Me',
    prompt: 'Quiz me with 4 Class 12 MCQs (A/B/C/D) from my current syllabus.',
    sendImmediately: true,
    icon: CheckCircle2,
  },
  {
    id: 'revision',
    label: 'Revision',
    prompt: 'Give me a quick high-yield revision summary of my pending chapters.',
    sendImmediately: true,
    icon: RotateCcw,
  },
  {
    id: 'study_plan',
    label: 'Make Study Plan',
    prompt: 'Make a realistic 5-hour Class 12 study plan for today based on my pending chapters.',
    sendImmediately: true,
    icon: Calendar,
  },
  {
    id: 'today_tasks',
    label: "Give Me Today's Tasks",
    prompt: "Suggest 3 smart daily study tasks for today based on my syllabus progress and recent mistakes.",
    sendImmediately: true,
    icon: ListChecks,
  },
];

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="font-mono-num px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 text-[0.9em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function StructuredAiMessage({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const out: Array<
      | { kind: 'heading'; title: string }
      | { kind: 'diagram'; title: string; points: string[] }
      | { kind: 'code'; content: string }
      | { kind: 'list'; ordered: boolean; items: string[] }
      | { kind: 'paragraph'; text: string }
    > = [];

    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Code / Formula fenced block
      if (trimmed.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        out.push({ kind: 'code', content: codeLines.join('\n').trim() });
        continue;
      }

      // Diagram Concept visual card (Biology / Zoology)
      const diagramMatch = trimmed.match(/^\[Diagram Concept:\s*(.+?)\]$/i);
      if (diagramMatch) {
        const title = diagramMatch[1].trim();
        const points: string[] = [];
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          if (!next) {
            i++;
            break;
          }
          if (next.startsWith('#') || next.startsWith('[Diagram Concept:')) {
            break;
          }
          points.push(next.replace(/^[-*•\d.)]+\s*/, ''));
          i++;
        }
        out.push({ kind: 'diagram', title, points });
        continue;
      }

      // Headings
      const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
      if (headingMatch) {
        out.push({ kind: 'heading', title: headingMatch[1].trim() });
        i++;
        continue;
      }

      // Unordered list
      if (/^[-*•]\s+/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        out.push({ kind: 'list', ordered: false, items });
        continue;
      }

      // Ordered list
      if (/^\d+[.)]\s+/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
          i++;
        }
        out.push({ kind: 'list', ordered: true, items });
        continue;
      }

      // Regular paragraph
      const paraLines: string[] = [trimmed];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('#') &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('[Diagram Concept:') &&
        !/^[-*•]\s+/.test(lines[i].trim()) &&
        !/^\d+[.)]\s+/.test(lines[i].trim())
      ) {
        paraLines.push(lines[i].trim());
        i++;
      }
      out.push({ kind: 'paragraph', text: paraLines.join(' ') });
    }

    return out;
  }, [markdown]);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
      {blocks.map((block, idx) => {
        if (block.kind === 'heading') {
          const isFinal = block.title.toLowerCase().includes('final answer');
          return (
            <h4
              key={idx}
              className={`font-display text-xs uppercase tracking-wider font-bold pt-1 ${
                isFinal
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {block.title}
            </h4>
          );
        }

        if (block.kind === 'diagram') {
          return (
            <div
              key={idx}
              className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 p-3.5 space-y-2"
            >
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Diagram Concept · {block.title}
              </p>
              {block.points.length > 0 && (
                <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200 list-decimal list-inside">
                  {block.points.map((pt, pIdx) => (
                    <li key={pIdx} className="leading-snug">
                      {renderInlineFormatting(pt)}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        }

        if (block.kind === 'code') {
          return (
            <pre
              key={idx}
              className="rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-100 p-3.5 text-xs font-mono-num overflow-x-auto leading-relaxed"
            >
              {block.content}
            </pre>
          );
        }

        if (block.kind === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={idx}
              className={`space-y-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
            >
              {block.items.map((item, iIdx) => (
                <li key={iIdx} className="leading-relaxed">
                  {renderInlineFormatting(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineFormatting(block.text)}
          </p>
        );
      })}
    </div>
  );
}

export function AiStudyChatView() {
  const {
    user,
    profile,
    subjects,
    chapters,
    sessions,
    dailyTasks,
    dailyReviews,
    aiChats,
    addDailyTask,
    saveAiChatSession,
    deleteAiChatSession,
    clearAllAiChatHistory,
    showToast,
  } = useStudy();

  const todayKey = getLocalDateKey();
  const tomorrowKey = useMemo(() => addDaysToDateKey(todayKey, 1), [todayKey]);

  const [category, setCategory] = useState<AiChatCategory>('Physics');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // History panel & inline confirmations
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<AiChatCategory | 'All'>('All');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [dismissedProactiveId, setDismissedProactiveId] = useState<string | null>(null);
  const [addedWeakKeys, setAddedWeakKeys] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Proactive Syllabus Suggestion (permission-based, never auto-adds)
  const proactiveChapter = useMemo(() => {
    const matchingSubject = subjects.find(
      (s) => s.name.toLowerCase() === category.toLowerCase()
    );
    const pool = matchingSubject
      ? chapters.filter((c) => c.subjectId === matchingSubject.id)
      : chapters;
    const candidate =
      pool.find((c) => c.status === 'in_progress') ||
      pool.find((c) => c.status === 'not_started') ||
      null;
    if (!candidate) return null;
    if (dismissedProactiveId === candidate.id) return null;
    const subjName =
      subjects.find((s) => s.id === candidate.subjectId)?.name || category;
    const alreadyTaskedToday = dailyTasks.some(
      (t) =>
        t.dateKey === todayKey &&
        t.title.toLowerCase().includes(candidate.title.toLowerCase().slice(0, 14))
    );
    if (alreadyTaskedToday) return null;
    return { chapter: candidate, subjectName: subjName };
  }, [subjects, chapters, category, dismissedProactiveId, dailyTasks, todayKey]);

  // Build real student context for every AI request
  const buildStudentContext = () => {
    const subjectsSummary = subjects.map((s) => {
      const chs = chapters.filter((c) => c.subjectId === s.id);
      const done = chs.filter((c) => c.status === 'completed').length;
      const pct = chs.length > 0 ? Math.round((done / chs.length) * 100) : 0;
      return `${s.name} (${done}/${chs.length} chapters done, ${pct}%)`;
    });

    const inProgressChapters = chapters
      .filter((c) => c.status === 'in_progress')
      .slice(0, 8)
      .map((c) => {
        const sName = subjects.find((s) => s.id === c.subjectId)?.name || 'Subject';
        return `${sName} Ch ${c.chapterNumber}: ${c.title}`;
      });

    const pendingChapters = chapters
      .filter((c) => c.status === 'not_started')
      .slice(0, 10)
      .map((c) => {
        const sName = subjects.find((s) => s.id === c.subjectId)?.name || 'Subject';
        return `${sName} Ch ${c.chapterNumber}: ${c.title}`;
      });

    const todayTasksSummary = dailyTasks
      .filter((t) => t.dateKey === todayKey)
      .slice(0, 10)
      .map((t) => `[${t.status}] ${t.subjectName || 'General'}: ${t.title}`);

    const recentMistakes = dailyReviews
      .slice(0, 3)
      .flatMap((r) => r.mistakes)
      .slice(0, 8);

    const todayStudyMinutes = Math.round(
      sessions
        .filter((s) => s.dateKey === todayKey)
        .reduce((acc, s) => acc + s.durationSeconds, 0) / 60
    );

    return {
      studentName: profile?.displayName || 'Student',
      studentClass: profile?.studentClass || 'Class 12th',
      subjectsSummary,
      inProgressChapters,
      pendingChapters,
      todayTasksSummary,
      recentMistakes,
      todayStudyMinutes,
    };
  };

  const resolveSubjectId = (subjectName: string): { id: string; name: string } => {
    const clean = subjectName.trim().toLowerCase();
    const matched = subjects.find(
      (s) => s.name.toLowerCase() === clean || clean.includes(s.name.toLowerCase())
    );
    if (matched) return { id: matched.id, name: matched.name };
    return { id: '', name: subjectName || 'General' };
  };

  const persistChatState = async (
    chatId: string,
    chatCategory: AiChatCategory,
    nextMessages: AiChatMessage[],
    titleHint: string
  ) => {
    if (!user) return;
    const existing = aiChats.find((c) => c.id === chatId);
    const session: AiChatSession = {
      id: chatId,
      userId: user.uid,
      category: chatCategory,
      title: existing?.title || titleHint.slice(0, 80) || `${chatCategory} Study Chat`,
      messages: nextMessages.slice(-40),
      lastMessageAtIso: new Date().toISOString(),
    };
    await saveAiChatSession(session);
  };

  const handleSend = async (overrideMessage?: string, quickActionId?: string) => {
    const text = (overrideMessage ?? input).trim();
    if (!text || isSending) return;

    setErrorBanner(null);
    const nowIso = new Date().toISOString();
    const chatId = activeChatId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!activeChatId) {
      setActiveChatId(chatId);
    }

    const userMsg: AiChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      createdAtIso: nowIso,
    };

    const nextWithUser = [...messages, userMsg];
    setMessages(nextWithUser);
    if (!overrideMessage) {
      setInput('');
    }
    setIsSending(true);

    try {
      const resp = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          category,
          quickAction: quickActionId,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          studentContext: buildStudentContext(),
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'Unable to get an AI response right now. Please try again.'
        );
      }

      const assistantMsg: AiChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content:
          typeof data.replyMarkdown === 'string' && data.replyMarkdown.trim()
            ? data.replyMarkdown.trim()
            : 'I could not formulate an answer. Could you clarify your question?',
        createdAtIso: new Date().toISOString(),
        suggestedTasks: Array.isArray(data.suggestedTasks) ? data.suggestedTasks : [],
        weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : [],
      };

      const finalMessages = [...nextWithUser, assistantMsg];
      setMessages(finalMessages);
      await persistChatState(chatId, category, finalMessages, text);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not connect to AI Study Chat. Please try again.';
      setErrorBanner(msg);
      showToast({ type: 'error', title: 'AI Study Chat unavailable', subtitle: msg });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAction = (action: QuickActionDef) => {
    if (action.sendImmediately) {
      void handleSend(action.prompt, action.id);
    } else {
      setInput(action.prompt);
      inputRef.current?.focus();
    }
  };

  const handleAddSuggestedTask = async (
    messageId: string,
    taskIdx: number,
    suggested: AiSuggestedTask
  ) => {
    if (suggested.added) return;
    const { id: subjId, name: subjName } = resolveSubjectId(suggested.subjectName);
    await addDailyTask({
      dateKey: todayKey,
      title: suggested.title,
      subjectId: subjId,
      subjectName: subjName,
      chapterTopic: suggested.chapterTopic,
      taskType: suggested.taskType,
      priority: suggested.priority,
      estimatedMinutes: suggested.estimatedMinutes,
      notes: 'Added from AI Study Chat',
    });

    const updatedMessages = messages.map((m) => {
      if (m.id !== messageId || !m.suggestedTasks) return m;
      return {
        ...m,
        suggestedTasks: m.suggestedTasks.map((t, idx) =>
          idx === taskIdx ? { ...t, added: true } : t
        ),
      };
    });
    setMessages(updatedMessages);
    if (activeChatId) {
      await persistChatState(
        activeChatId,
        category,
        updatedMessages,
        updatedMessages[0]?.content || category
      );
    }
  };

  const handleAddWeakTopicTomorrow = async (weak: AiWeakTopic) => {
    const key = `${weak.subjectName}::${weak.topic}`;
    if (addedWeakKeys[key]) return;
    const { id: subjId, name: subjName } = resolveSubjectId(weak.subjectName);
    await addDailyTask({
      dateKey: tomorrowKey,
      title: `Revise ${weak.topic}`,
      subjectId: subjId,
      subjectName: subjName,
      chapterTopic: weak.topic,
      taskType: 'revision',
      priority: 'high',
      estimatedMinutes: 30,
      notes: 'Weak topic identified in AI Study Chat',
    });
    setAddedWeakKeys((prev) => ({ ...prev, [key]: true }));
  };

  const handleAcceptProactiveSuggestion = async () => {
    if (!proactiveChapter) return;
    await addDailyTask({
      dateKey: todayKey,
      title: `${proactiveChapter.subjectName} — Ch ${proactiveChapter.chapter.chapterNumber}: ${proactiveChapter.chapter.title} Revision`,
      subjectId: proactiveChapter.chapter.subjectId,
      subjectName: proactiveChapter.subjectName,
      chapterTopic: `Ch ${proactiveChapter.chapter.chapterNumber}: ${proactiveChapter.chapter.title}`,
      taskType: 'revision',
      priority: 'high',
      estimatedMinutes: 45,
    });
    setDismissedProactiveId(proactiveChapter.chapter.id);
  };

  const handleSelectHistoryChat = (chat: AiChatSession) => {
    setActiveChatId(chat.id);
    setCategory(chat.category);
    setMessages(chat.messages);
    setErrorBanner(null);
    setHistoryOpen(false);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setErrorBanner(null);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const handleClearCurrentChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setErrorBanner(null);
    showToast({ type: 'info', title: 'Started a fresh chat' });
  };

  const handleDeleteSingleChat = async (chatId: string) => {
    await deleteAiChatSession(chatId);
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  const handleDeleteAllHistory = async () => {
    await clearAllAiChatHistory(historyFilter);
    if (
      activeChatId &&
      (historyFilter === 'All' || category === historyFilter)
    ) {
      setActiveChatId(null);
      setMessages([]);
    }
    setConfirmClearAll(false);
  };

  const filteredHistory = useMemo(
    () =>
      historyFilter === 'All'
        ? aiChats
        : aiChats.filter((c) => c.category === historyFilter),
    [aiChats, historyFilter]
  );

  const examplePrompts = useMemo(() => {
    switch (category) {
      case 'Physics':
        return [
          "Newton's second law simple language mein samjhao.",
          'Electrostatics Gauss Law formula aur 1 numerical solve karo.',
          'Current Electricity ka exam revision short note banao.',
        ];
      case 'Chemistry':
        return [
          'Organic chemistry SN1 vs SN2 reaction step-by-step samjhao.',
          'Nernst equation ka numerical kaise solve kare?',
          'Electrochemistry ke important formulas aur points batao.',
        ];
      case 'Biology':
        return [
          'DNA replication ko diagram concept ke saath detail mein samjhao.',
          'Mendelian genetics ke 4 important NEET MCQs poocho.',
          'Biotechnology chapter ka short revision note banao.',
        ];
      case 'Zoology':
        return [
          'Human Reproduction spermatogenesis diagram concept ke saath samjhao.',
          'Innate vs Acquired immunity ka clear difference batao.',
          'Human Health and Disease ke important board questions do.',
        ];
      default:
        return [
          'Kal exam hai, mujhe 5 hour ka study plan bana do.',
          'Aaj ke liye meri pending syllabus ke hisaab se tasks suggest karo.',
          'Board exam mein numerical mistakes kaise kam karein?',
        ];
    }
  }, [category]);

  const HistorySidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Chat History
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleNewChat}
            className="min-h-[34px] px-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close history drawer"
            className="lg:hidden min-w-[34px] min-h-[34px] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto">
        {(['All', ...AI_CHAT_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setHistoryFilter(cat);
              setConfirmClearAll(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              historyFilter === cat
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat === 'General Study' ? 'General' : cat}
          </button>
        ))}
      </div>

      {/* Saved Chats List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {filteredHistory.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No saved chats yet
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Your Physics, Chemistry, Biology, Zoology, and General chats auto-save here.
            </p>
          </div>
        ) : (
          filteredHistory.map((chat) => {
            const active = activeChatId === chat.id;
            return (
              <div
                key={chat.id}
                className={`group rounded-xl border p-2.5 transition-colors flex items-start justify-between gap-2 ${
                  active
                    ? 'bg-blue-50/70 dark:bg-blue-500/12 border-blue-200 dark:border-blue-500/30'
                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectHistoryChat(chat)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {chat.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {chat.category} · {chat.messages.length} msgs
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSingleChat(chat.id)}
                  aria-label={`Delete chat ${chat.title}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Delete History Footer */}
      {filteredHistory.length > 0 && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          {confirmClearAll ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                Delete {historyFilter === 'All' ? 'all' : historyFilter} chats?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAllHistory()}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="w-full min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete History</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            AI Study Chat
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Context-aware Class 12 mentor synced with your syllabus, tasks &amp; progress
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="lg:hidden min-h-[42px] px-3.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>History ({aiChats.length})</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearCurrentChat}
              className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Subject Category Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {AI_CHAT_CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                if (activeChatId) {
                  const current = aiChats.find((c) => c.id === activeChatId);
                  if (current && current.category !== cat) {
                    setActiveChatId(null);
                    setMessages([]);
                  }
                }
              }}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Proactive Context Banner (Never Auto-Modifies Data) */}
      {proactiveChapter && (
        <div className="rounded-2xl bg-blue-50/75 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
              <strong className="font-semibold text-slate-900 dark:text-white">
                {proactiveChapter.subjectName} — Ch {proactiveChapter.chapter.chapterNumber}:{' '}
                {proactiveChapter.chapter.title}
              </strong>{' '}
              is currently{' '}
              {proactiveChapter.chapter.status === 'in_progress' ? 'in progress' : 'pending'}.
              Add revision to Today&apos;s Tasks?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setDismissedProactiveId(proactiveChapter.chapter.id)}
              className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => void handleAcceptProactiveSuggestion()}
              className="min-h-[36px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Split Layout: Chat Canvas + Desktop History Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Chat Canvas */}
        <section className="lg:col-span-8 xl:col-span-9 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col min-h-[560px] max-h-[74vh] overflow-hidden">
          {/* Quick Actions Bar */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={isSending}
                  onClick={() => handleQuickAction(action)}
                  className="min-h-[36px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6" />
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Ask anything about {category}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Get step-by-step solutions, NCERT-aligned explanations, exam short notes, MCQs,
                  and smart study plans tailored to your Class 12 syllabus.
                </p>

                <div className="mt-6 w-full space-y-2 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Try asking
                  </p>
                  {examplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      className="w-full text-left rounded-2xl bg-slate-50 dark:bg-slate-900/70 hover:bg-blue-50/60 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3.5 ${
                          isUser
                            ? 'bg-blue-600 text-white text-sm leading-relaxed'
                            : 'bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <StructuredAiMessage markdown={msg.content} />
                        )}
                      </div>

                      {/* Permission-based Suggested Daily Tasks */}
                      {!isUser && msg.suggestedTasks && msg.suggestedTasks.length > 0 && (
                        <div className="mt-2.5 w-full max-w-[92%] sm:max-w-[85%] rounded-2xl bg-white dark:bg-[#0D1320] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-display font-bold text-slate-900 dark:text-white">
                              Suggested Daily Tasks
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              Tap to add with your approval
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {msg.suggestedTasks.map((st, sIdx) => (
                              <div
                                key={sIdx}
                                className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {st.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                    {st.subjectName} · {getTaskTypeLabel(st.taskType)} ·{' '}
                                    {getPriorityLabel(st.priority)} · {st.estimatedMinutes}m
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={st.added}
                                  onClick={() => void handleAddSuggestedTask(msg.id, sIdx, st)}
                                  className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                                    st.added
                                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                >
                                  {st.added ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Added</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Task</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Weak Topics to Revise Tomorrow */}
                      {!isUser && msg.weakTopics && msg.weakTopics.length > 0 && (
                        <div className="mt-2 w-full max-w-[92%] sm:max-w-[85%] rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 p-3 space-y-2">
                          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            Revision Worthy Topics Detected
                          </p>
                          <div className="space-y-1.5">
                            {msg.weakTopics.map((wt, wIdx) => {
                              const wKey = `${wt.subjectName}::${wt.topic}`;
                              const isAdded = Boolean(addedWeakKeys[wKey]);
                              return (
                                <div
                                  key={wIdx}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="text-slate-700 dark:text-slate-200 truncate">
                                    {wt.subjectName} · {wt.topic}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isAdded}
                                    onClick={() => void handleAddWeakTopicTomorrow(wt)}
                                    className={`min-h-[30px] px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer ${
                                      isAdded
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                                    }`}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Scheduled</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3 h-3" />
                                        <span>Tomorrow&apos;s Task</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex items-start">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                      <span>Preparing clear explanation for {category}...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Inline Error Banner */}
          {errorBanner && (
            <div className="mx-4 mb-2 rounded-xl bg-rose-50 dark:bg-rose-500/12 border border-rose-200 dark:border-rose-500/30 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-300">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-rose-500 hover:text-rose-700 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-end gap-2.5 shrink-0 bg-white dark:bg-[#111827]"
          >
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={2000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={`Ask your ${category} doubt, numerical, notes, or study plan...`}
              className="flex-1 min-h-[46px] max-h-32 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send message"
              className="min-w-[46px] min-h-[46px] px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </section>

        {/* Desktop Chat History Sidebar */}
        <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex-col max-h-[74vh] overflow-hidden">
          {HistorySidebarContent}
        </aside>
      </div>

      {/* Mobile History Drawer */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end"
            onClick={() => setHistoryOpen(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-[86%] max-w-xs h-full bg-white dark:bg-[#111827] border-l border-slate-200 dark:border-slate-800"
            >
              {HistorySidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
