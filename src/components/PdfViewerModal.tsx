import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Download, FileText, Eye, X } from 'lucide-react';
import { generateStudyMaterialPdf, type GeneratedPdfResult } from '../lib/pdfGenerator';
import type { ChapterProgress, StudyMaterial, UserSubject } from '../types/study';

interface PdfViewerModalProps {
  material: StudyMaterial | null;
  subjects: UserSubject[];
  chapters: ChapterProgress[];
  studentName: string;
  onClose: () => void;
}

export function PdfViewerModal({
  material,
  subjects,
  chapters,
  studentName,
  onClose,
}: PdfViewerModalProps) {
  const [pdfData, setPdfData] = useState<GeneratedPdfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'reader' | 'pdf'>('reader');

  useEffect(() => {
    if (!material) {
      setPdfData(null);
      setError(null);
      return;
    }

    let generatedUrl: string | null = null;
    try {
      setError(null);
      const result = generateStudyMaterialPdf(material, subjects, chapters, studentName);
      generatedUrl = result.blobUrl;
      setPdfData(result);
    } catch {
      setError("PDF couldn't be loaded. Try again.");
    }

    return () => {
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
    };
  }, [material, subjects, chapters, studentName]);

  const handleDownload = () => {
    if (!material) return;
    if (material.fileUrl) {
      const a = document.createElement('a');
      a.href = material.fileUrl;
      a.download = `${material.title.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      a.rel = 'noopener noreferrer';
      a.click();
      return;
    }
    if (!pdfData) return;
    const a = document.createElement('a');
    a.href = pdfData.blobUrl;
    a.download = pdfData.filename;
    a.click();
  };

  return (
    <AnimatePresence>
      {material && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl h-[88vh] rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {material.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {pdfData?.subtitle || material.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('reader')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      viewMode === 'reader'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Smart Reader
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('pdf')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      viewMode === 'pdf'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    PDF Document
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close PDF viewer"
                  className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090D16] p-4 sm:p-6">
              {error ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                  <p className="font-semibold text-slate-900 dark:text-white">{error}</p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              ) : viewMode === 'pdf' && (material.fileUrl || pdfData?.blobUrl) ? (
                <div className="h-full min-h-[480px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white">
                  <iframe
                    src={material.fileUrl || pdfData?.blobUrl}
                    title={material.title}
                    className="w-full h-full min-h-[520px]"
                  />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Class 12 Study Material · {material.pageCount} Pages
                      </p>
                      <h4 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {material.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode('pdf')}
                      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      Raw PDF View
                    </button>
                  </div>

                  {pdfData?.previewSections.map((sec, idx) => (
                    <div key={idx} className="space-y-3">
                      <h5 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {sec.heading}
                      </h5>
                      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {sec.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2.5">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      {sec.formulas && sec.formulas.length > 0 && (
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Key Equations
                          </p>
                          {sec.formulas.map((f, fIdx) => (
                            <p
                              key={fIdx}
                              className="font-mono-num text-xs sm:text-sm text-blue-700 dark:text-blue-300"
                            >
                              {f}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
