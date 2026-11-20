import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface IncomingHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface IncomingStudentContext {
  studentName?: string;
  studentClass?: string;
  subjectsSummary?: string[];
  pendingChapters?: string[];
  inProgressChapters?: string[];
  todayTasksSummary?: string[];
  recentMistakes?: string[];
  todayStudyMinutes?: number;
}

interface AiChatRequestBody {
  message?: string;
  category?: string;
  quickAction?: string;
  history?: IncomingHistoryItem[];
  studentContext?: IncomingStudentContext;
}

function buildSystemInstruction(category: string, ctx: IncomingStudentContext): string {
  const studentName = (ctx.studentName || 'Student').slice(0, 80);
  const studentClass = (ctx.studentClass || 'Class 12th').slice(0, 40);
  const subjectsLine =
    Array.isArray(ctx.subjectsSummary) && ctx.subjectsSummary.length > 0
      ? ctx.subjectsSummary.slice(0, 8).join('; ')
      : 'Physics, Chemistry, Biology, Zoology';
  const pendingLine =
    Array.isArray(ctx.pendingChapters) && ctx.pendingChapters.length > 0
      ? ctx.pendingChapters.slice(0, 12).join(', ')
      : 'None listed';
  const inProgressLine =
    Array.isArray(ctx.inProgressChapters) && ctx.inProgressChapters.length > 0
      ? ctx.inProgressChapters.slice(0, 8).join(', ')
      : 'None listed';
  const todayTasksLine =
    Array.isArray(ctx.todayTasksSummary) && ctx.todayTasksSummary.length > 0
      ? ctx.todayTasksSummary.slice(0, 10).join('; ')
      : 'No tasks added yet today';
  const mistakesLine =
    Array.isArray(ctx.recentMistakes) && ctx.recentMistakes.length > 0
      ? ctx.recentMistakes.slice(0, 8).join('; ')
      : 'None logged recently';
  const todayMinutes = typeof ctx.todayStudyMinutes === 'number' ? ctx.todayStudyMinutes : 0;

  return `You are the dedicated AI Study Mentor inside "Nandani Study", a focused study companion for Indian Class 12 students.

STUDENT CONTEXT (ALWAYS USE THIS TO PERSONALIZE ANSWERS):
- Student Name: ${studentName}
- Class: ${studentClass}
- Active Chat Subject Category: ${category}
- Subjects & Progress: ${subjectsLine}
- Chapters In Progress: ${inProgressLine}
- Pending Chapters: ${pendingLine}
- Today's Study Time Logged: ${todayMinutes} minutes
- Today's Tasks: ${todayTasksLine}
- Recent Mistakes / Weak Spots: ${mistakesLine}

STRICT PEDAGOGICAL & ACCURACY RULES:
1. Stay grounded in verified Class 12 NCERT / CBSE / NEET / JEE-level concepts. NEVER invent facts, fake constants, or unverified formulas. If information is uncertain or a question lacks required values/context, explicitly say what is missing and ask the student for clarification before solving.
2. Match the student's language naturally: if they write in Hinglish (Hindi in Roman script mixed with English), respond in clear, friendly Hinglish with exact English scientific terminology; if they write in English, respond in crisp, clear English.
3. For conceptual explanations, numerical problems, or exam questions, format "replyMarkdown" clearly using these headings (omit a section only when genuinely not applicable, such as a short clarifying question or interactive quiz prompt):
### Question
### Simple Explanation
### Detailed Explanation
### Example
### Important Points
### Final Answer
4. For Physics, Chemistry, and Maths numericals: write formulas clearly on their own lines, show Given, Formula, Step-by-Step Substitution, Units, and Final Answer cleanly.
5. For Biology and Zoology topics: include a neat visual concept outline using a line starting with "[Diagram Concept: <title>]" followed by 3-4 concise labeled flow points so the student can visualize/draw the diagram in exams.
6. When creating quizzes or MCQs, give crisp numbered questions with 4 options (A, B, C, D), and if the student submits an answer, clearly explain why it is right or wrong.
7. TASK SUGGESTIONS (PERMISSION-BASED): When genuinely helpful (e.g., student asks for a study plan, today's tasks, revision help, or mentions a chapter/mistake), populate "suggestedTasks" with 1-3 concrete, concise daily tasks tied to their syllabus. Do NOT claim you already added them—tell the student they can tap "Add Task" below if they want to add them.
8. WEAK TOPICS: If the student's question reveals a tricky concept or mistake area worth revising tomorrow, include 1-2 items in "weakTopics". Otherwise return an empty array.`;
}

const aiResponseSchema = {
  type: Type.OBJECT,
  properties: {
    replyMarkdown: {
      type: Type.STRING,
      description:
        'Well-structured student-friendly answer in Markdown following the Question -> Simple Explanation -> Detailed Explanation -> Example -> Important Points -> Final Answer flow where appropriate.',
    },
    suggestedTasks: {
      type: Type.ARRAY,
      description: 'Optional 0-3 suggested daily tasks for the student to approve with one tap.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Short actionable task title (max 100 chars).' },
          subjectName: {
            type: Type.STRING,
            description: 'Subject name such as Physics, Chemistry, Biology, Zoology, or General.',
          },
          chapterTopic: { type: Type.STRING, description: 'Chapter or topic name.' },
          taskType: {
            type: Type.STRING,
            description:
              'One of: study_task, revision, question_practice, notes_making, mock_test, assignment, homework, doubt_solving, reading, formula_revision',
          },
          priority: { type: Type.STRING, description: 'One of: low, medium, high' },
          estimatedMinutes: { type: Type.INTEGER, description: 'Estimated study minutes (15 to 180).' },
        },
        required: ['title', 'subjectName', 'chapterTopic', 'taskType', 'priority', 'estimatedMinutes'],
      },
    },
    weakTopics: {
      type: Type.ARRAY,
      description: 'Optional 0-2 weak or revision-worthy topics identified from this question.',
      items: {
        type: Type.OBJECT,
        properties: {
          subjectName: { type: Type.STRING },
          topic: { type: Type.STRING },
        },
        required: ['subjectName', 'topic'],
      },
    },
  },
  required: ['replyMarkdown', 'suggestedTasks', 'weakTopics'],
};

const VALID_TASK_TYPES = new Set([
  'study_task',
  'revision',
  'question_practice',
  'notes_making',
  'mock_test',
  'assignment',
  'homework',
  'doubt_solving',
  'reading',
  'formula_revision',
]);

const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, app: 'Nandani Study' });
  });

  app.post('/api/ai-chat', async (req: Request, res: Response) => {
    const body = (req.body || {}) as AiChatRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const category =
      typeof body.category === 'string' && body.category.trim()
        ? body.category.trim().slice(0, 40)
        : 'General Study';

    if (!message) {
      res.status(400).json({ error: 'Please enter a study question first.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'AI Study Chat is not configured yet. Please check your GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const studentContext = body.studentContext || {};
    const systemInstruction = buildSystemInstruction(category, studentContext);

    const safeHistory = Array.isArray(body.history)
      ? body.history
          .slice(-12)
          .filter(
            (m): m is IncomingHistoryItem =>
              Boolean(m) &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string' &&
              m.content.trim().length > 0
          )
      : [];

    const contents = [
      ...safeHistory.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.slice(0, 4000) }],
      })),
      {
        role: 'user',
        parts: [{ text: message.slice(0, 4000) }],
      },
    ];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: aiResponseSchema,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'The AI returned an empty response. Please try asking again.' });
        return;
      }

      let parsed: {
        replyMarkdown?: string;
        suggestedTasks?: Array<{
          title?: string;
          subjectName?: string;
          chapterTopic?: string;
          taskType?: string;
          priority?: string;
          estimatedMinutes?: number;
        }>;
        weakTopics?: Array<{ subjectName?: string; topic?: string }>;
      };

      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { replyMarkdown: rawText, suggestedTasks: [], weakTopics: [] };
      }

      const replyMarkdown =
        typeof parsed.replyMarkdown === 'string' && parsed.replyMarkdown.trim()
          ? parsed.replyMarkdown.trim()
          : rawText;

      const suggestedTasks = Array.isArray(parsed.suggestedTasks)
        ? parsed.suggestedTasks
            .slice(0, 3)
            .filter((t) => typeof t?.title === 'string' && t.title.trim().length > 0)
            .map((t) => ({
              title: String(t.title).trim().slice(0, 140),
              subjectName: String(t.subjectName || category).trim().slice(0, 60),
              chapterTopic: String(t.chapterTopic || '').trim().slice(0, 120),
              taskType: VALID_TASK_TYPES.has(String(t.taskType))
                ? String(t.taskType)
                : 'study_task',
              priority: VALID_PRIORITIES.has(String(t.priority)) ? String(t.priority) : 'medium',
              estimatedMinutes: Math.max(
                10,
                Math.min(240, Math.round(Number(t.estimatedMinutes) || 30))
              ),
            }))
        : [];

      const weakTopics = Array.isArray(parsed.weakTopics)
        ? parsed.weakTopics
            .slice(0, 3)
            .filter((w) => typeof w?.topic === 'string' && w.topic.trim().length > 0)
            .map((w) => ({
              subjectName: String(w.subjectName || category).trim().slice(0, 60),
              topic: String(w.topic).trim().slice(0, 120),
            }))
        : [];

      res.json({
        replyMarkdown,
        suggestedTasks,
        weakTopics,
      });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status || 500;
      const errMsg = err instanceof Error ? err.message : 'Unable to reach AI Study Assistant.';
      console.error('Gemini API error:', errMsg);

      if (status === 403 || status === 400 || errMsg.includes('API_KEY_INVALID')) {
        res.status(status === 403 ? 403 : 400).json({
          error:
            'Unable to authenticate with Gemini API. Please verify your API key in Settings > Secrets.',
        });
        return;
      }
      if (status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            'AI request limit reached right now. Please wait a moment and try again, or check your quota in Settings > Secrets.',
        });
        return;
      }

      res.status(502).json({
        error: 'Could not get an AI response right now. Please try again in a few seconds.',
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
      }
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('App build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nandani Study server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
