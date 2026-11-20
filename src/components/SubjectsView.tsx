import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Play,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { generateStudyMaterialPdf } from '../lib/pdfGenerator';
import { formatDuration } from '../lib/studyStats';
import type {
  ChapterStatus,
  StudyMaterial,
  SubjectAccentColor,
  SubjectIconKey,
} from '../types/study';
import { PdfViewerModal } from './PdfViewerModal';
import { getAccentClasses, SubjectIcon } from './SubjectVisuals';

interface SubjectsViewProps {
  selectedSubjectId: string | null;
  onSelectSubject: (subjectId: string | null) => void;
  initialSection?: 'syllabus' | 'pdfs' | null;
}

const STATUS_OPTIONS: { value: ChapterStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const ICON_CHOICES: { key: SubjectIconKey; label: string }[] = [
  { key: 'calculator', label: 'Math' },
  { key: 'book', label: 'Literature' },
  { key: 'code', label: 'Computer' },
  { key: 'globe', label: 'General' },
  { key: 'atom', label: 'Physics' },
  { key: 'flask', label: 'Chem' },
];

const COLOR_CHOICES: SubjectAccentColor[] = [
  'violet',
  'cyan',
  'teal',
  'indigo',
  'blue',
  'amber',
  'emerald',
  'rose',
];

export function SubjectsView({
  selectedSubjectId,
  onSelectSubject,
  initialSection,
}: SubjectsViewProps) {
  const {
    profile,
    subjects,
    chapters,
    materials,
    setChapterStatus,
    addSubject,
    addChapter,
    openTimerModal,
    showToast,
  } = useStudy();

  const [sectionTab, setSectionTab] = useState<'syllabus' | 'pdfs'>(
    initialSection || 'syllabus'
  );

  useEffect(() => {
    if (initialSection) {
      setSectionTab(initialSection);
    }
  }, [initialSection]);

  const [statusFilter, setStatusFilter] = useState<'all' | ChapterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [activePdfMaterial, setActivePdfMaterial] = useState<StudyMaterial | null>(null);

  // Add Subject modal state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectIcon, setNewSubjectIcon] = useState<SubjectIconKey>('calculator');
  const [newSubjectColor, setNewSubjectColor] = useState<SubjectAccentColor>('violet');
  const [addingSubject, setAddingSubject] = useState(false);

  // Add Chapter modal state
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterTopics, setNewChapterTopics] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const subjectChapters = useMemo(() => {
    if (!selectedSubject) return [];
    return chapters
      .filter((c) => c.subjectId === selectedSubject.id)
      .filter((c) => (statusFilter === 'all' ? true : c.status === statusFilter))
      .filter((c) =>
        searchTerm.trim()
          ? c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.topics.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
          : true
      )
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [chapters, selectedSubject, statusFilter, searchTerm]);

  const handleDownloadPdf = (mat: StudyMaterial) => {
    try {
      if (mat.fileUrl) {
        const a = document.createElement('a');
        a.href = mat.fileUrl;
        a.download = `${mat.title.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        a.rel = 'noopener noreferrer';
        a.click();
        return;
      }
      const generated = generateStudyMaterialPdf(
        mat,
        subjects,
        chapters,
        profile?.displayName || 'Student'
      );
      const a = document.createElement('a');
      a.href = generated.blobUrl;
      a.download = generated.filename;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(generated.blobUrl), 4000);
      showToast({ type: 'success', title: `Downloaded ${mat.title}` });
    } catch {
      showToast({ type: 'error', title: "PDF couldn't be loaded. Try again." });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || addingSubject) return;
    setAddingSubject(true);
    await addSubject(newSubjectName.trim(), newSubjectIcon, newSubjectColor);
    setAddingSubject(false);
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !newChapterTitle.trim() || addingChapter) return;
    setAddingChapter(true);
    const parsedTopics = newChapterTopics
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await addChapter(selectedSubject.id, newChapterTitle.trim(), parsedTopics);
    setAddingChapter(false);
    setNewChapterTitle('');
    setNewChapterTopics('');
    setShowAddChapter(false);
  };

  // =========================================================
  // SUBJECT DETAIL VIEW (Syllabus & Chapters)
  // =========================================================
  if (selectedSubject) {
    const allSubjChapters = chapters.filter((c) => c.subjectId === selectedSubject.id);
    const completedCount = allSubjChapters.filter((c) => c.status === 'completed').length;
    const inProgressCount = allSubjChapters.filter((c) => c.status === 'in_progress').length;
    const pct =
      allSubjChapters.length > 0
        ? Math.round((completedCount / allSubjChapters.length) * 100)
        : 0;
    const accent = getAccentClasses(selectedSubject.accentColor);
    const relatedMaterial = materials.find((m) => m.subjectId === selectedSubject.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onSelectSubject(null);
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Subjects</span>
          </button>

          <div className="flex items-center gap-2">
            {relatedMaterial && (
              <button
                type="button"
                onClick={() => setActivePdfMaterial(relatedMaterial)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notes PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddChapter(true)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Chapter</span>
            </button>
          </div>
        </div>

        {/* Subject Banner Summary */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl ${accent.softBg} ${accent.text} flex items-center justify-center shrink-0`}
              >
                <SubjectIcon iconKey={selectedSubject.iconKey} className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                  {selectedSubject.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {completedCount} completed · {inProgressCount} in progress · {allSubjChapters.length} total chapters
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono-num text-2xl font-bold text-slate-900 dark:text-white">
                  {pct}%
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Syllabus</p>
              </div>
              <button
                type="button"
                onClick={() => openTimerModal(selectedSubject.id)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Study</span>
              </button>
            </div>
          </div>

          <div className="mt-5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${accent.bar}`}
            />
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chapter or topic..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto">
            {(['all', 'not_started', 'in_progress', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'all'
                  ? 'All'
                  : tab === 'not_started'
                  ? 'Not Started'
                  : tab === 'in_progress'
                  ? 'In Progress'
                  : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Chapters List */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {subjectChapters.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No chapters match this filter.
              </p>
            </div>
          ) : (
            subjectChapters.map((ch) => {
              const isExpanded = expandedChapterId === ch.id;
              return (
                <div key={ch.id} className="p-4 sm:p-5 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedChapterId(isExpanded ? null : ch.id)}
                      className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <span className="mt-0.5 shrink-0">
                        {ch.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : ch.status === 'in_progress' ? (
                          <Clock className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono-num text-slate-400 dark:text-slate-500">
                            {String(ch.chapterNumber).padStart(2, '0')}
                          </span>
                          <h3
                            className={`font-display text-sm sm:text-base font-bold truncate ${
                              ch.status === 'completed'
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {ch.title}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{ch.topics.length} topics</span>
                          {ch.totalStudySeconds > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {formatDuration(ch.totalStudySeconds)} studied
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Status Selector & Focus Action */}
                    <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
                      <select
                        aria-label={`Status for ${ch.title}`}
                        value={ch.status}
                        onChange={(e) => void setChapterStatus(ch.id, e.target.value as ChapterStatus)}
                        className={`min-h-[38px] rounded-xl px-3 text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                          ch.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-500/12 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : ch.status === 'in_progress'
                            ? 'bg-amber-50 dark:bg-amber-500/12 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => openTimerModal(selectedSubject.id, ch.id)}
                        title={`Study ${ch.title}`}
                        className="min-w-[38px] min-h-[38px] px-3 rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden md:inline">Study</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Syllabus Topics */}
                  <AnimatePresence initial={false}>
                    {isExpanded && ch.topics.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 pl-8 text-xs text-slate-600 dark:text-slate-400">
                          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Key Syllabus Topics
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                            {ch.topics.map((topic, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5">
                                {idx > 0 && (
                                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                    ·
                                  </span>
                                )}
                                <span>{topic}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Add Chapter Modal */}
        <AnimatePresence>
          {showAddChapter && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
              onClick={() => setShowAddChapter(false)}
            >
              <motion.form
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleCreateChapter}
                className="w-full max-w-md rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Add Chapter to {selectedSubject.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddChapter(false)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Chapter Title
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    placeholder="e.g., Communication Systems"
                    className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Key Topics (comma-separated, optional)
                  </label>
                  <input
                    type="text"
                    value={newChapterTopics}
                    onChange={(e) => setNewChapterTopics(e.target.value)}
                    placeholder="Modulation, Bandwidth, Propagation"
                    className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddChapter(false)}
                    className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingChapter}
                    className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {addingChapter ? 'Adding...' : 'Save Chapter'}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        <PdfViewerModal
          material={activePdfMaterial}
          subjects={subjects}
          chapters={chapters}
          studentName={profile?.displayName || 'Student'}
          onClose={() => setActivePdfMaterial(null)}
        />
      </div>
    );
  }

  // =========================================================
  // MAIN SUBJECTS & PDF LIBRARY OVERVIEW
  // =========================================================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Subjects &amp; Materials
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track Class 12 syllabus chapters and access study PDFs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setSectionTab('syllabus')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                sectionTab === 'syllabus'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Syllabus
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('pdfs')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                sectionTab === 'pdfs'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Study PDFs
            </button>
          </div>

          {sectionTab === 'syllabus' && (
            <button
              type="button"
              onClick={() => setShowAddSubject(true)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          )}
        </div>
      </div>

      {sectionTab === 'syllabus' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((subj, idx) => {
            const subjChapters = chapters.filter((c) => c.subjectId === subj.id);
            const completed = subjChapters.filter((c) => c.status === 'completed').length;
            const inProgress = subjChapters.filter((c) => c.status === 'in_progress').length;
            const pct =
              subjChapters.length > 0 ? Math.round((completed / subjChapters.length) * 100) : 0;
            const accent = getAccentClasses(subj.accentColor);

            return (
              <motion.div
                key={subj.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                onClick={() => onSelectSubject(subj.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectSubject(subj.id);
                }}
                className="group rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl ${accent.softBg} ${accent.text} flex items-center justify-center shrink-0`}
                    >
                      <SubjectIcon iconKey={subj.iconKey} className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {subj.name}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {completed}/{subjChapters.length} completed · {inProgress} in progress
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-num text-xl font-bold text-slate-900 dark:text-white">
                    {pct}%
                  </span>
                </div>

                <div className="mt-5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${accent.bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Tap to open chapter syllabus
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Open Chapters
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((mat, idx) => (
            <motion.div
              key={mat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between gap-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {mat.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {mat.description}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    PDF Document · {mat.pageCount} pages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePdfMaterial(mat)}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(mat)}
                  className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddSubject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddSubject(false)}
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateSubject}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Add New Subject
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g., Mathematics, English, Computer Science"
                  className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Icon</p>
                <div className="grid grid-cols-6 gap-2">
                  {ICON_CHOICES.map((ic) => (
                    <button
                      key={ic.key}
                      type="button"
                      onClick={() => setNewSubjectIcon(ic.key)}
                      className={`min-h-[44px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                        newSubjectIcon === ic.key
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <SubjectIcon iconKey={ic.key} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_CHOICES.map((c) => {
                    const classes = getAccentClasses(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewSubjectColor(c)}
                        aria-label={c}
                        className={`w-8 h-8 rounded-full ${classes.bar} transition-transform cursor-pointer ${
                          newSubjectColor === c
                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSubject}
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {addingSubject ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <PdfViewerModal
        material={activePdfMaterial}
        subjects={subjects}
        chapters={chapters}
        studentName={profile?.displayName || 'Student'}
        onClose={() => setActivePdfMaterial(null)}
      />
    </div>
  );
}
