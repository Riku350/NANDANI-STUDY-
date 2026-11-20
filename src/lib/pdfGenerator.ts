import { jsPDF } from 'jspdf';
import { APP_CONFIG } from '../config/appConfig';
import { SUBJECT_REVISION_CONTENT } from '../data/defaultSyllabus';
import { ChapterProgress, StudyMaterial, UserSubject } from '../types/study';

export interface GeneratedPdfResult {
  blobUrl: string;
  filename: string;
  previewSections: {
    heading: string;
    bullets: string[];
    formulas?: string[];
  }[];
  subtitle: string;
}

export function generateStudyMaterialPdf(
  material: StudyMaterial,
  subjects: UserSubject[],
  chapters: ChapterProgress[],
  studentName: string
): GeneratedPdfResult {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 54) {
      doc.addPage();
      y = 52;
    }
  };

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y - 16, maxWidth, 74, 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`${APP_CONFIG.APP_NAME} — ${material.title}`, margin + 18, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(
    `Class 12 Study Resource  |  Prepared for ${studentName || 'Student'}  |  ${dateStr}`,
    margin + 18,
    y + 34
  );

  y += 82;

  const previewSections: { heading: string; bullets: string[]; formulas?: string[] }[] = [];
  let subtitle = material.description;

  if (material.category === 'syllabus' || material.subjectId === 'syllabus') {
    subtitle = 'Complete Class 12 Curriculum & Live Chapter Progress Tracker';
    for (const subj of subjects) {
      const subjChapters = chapters
        .filter((c) => c.subjectId === subj.id)
        .sort((a, b) => a.chapterNumber - b.chapterNumber);
      const completedCount = subjChapters.filter((c) => c.status === 'completed').length;
      const pct = subjChapters.length > 0 ? Math.round((completedCount / subjChapters.length) * 100) : 0;

      ensureSpace(64);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(37, 99, 235);
      doc.text(`${subj.name}  (${completedCount}/${subjChapters.length} Completed — ${pct}%)`, margin, y);
      y += 18;

      const bullets: string[] = [];
      for (const ch of subjChapters) {
        ensureSpace(26);
        const statusLabel =
          ch.status === 'completed'
            ? '[Completed]'
            : ch.status === 'in_progress'
            ? '[In Progress]'
            : '[Not Started]';
        const line = `Ch. ${ch.chapterNumber}: ${ch.title} — ${statusLabel}`;
        bullets.push(line);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        const wrapped = doc.splitTextToSize(line, maxWidth - 10);
        doc.text(wrapped, margin + 8, y);
        y += wrapped.length * 14 + 3;
      }

      previewSections.push({
        heading: `${subj.name} (${completedCount}/${subjChapters.length} · ${pct}%)`,
        bullets,
      });
      y += 12;
    }
  } else {
    const curated = SUBJECT_REVISION_CONTENT[material.subjectId];
    const subjChapters = chapters
      .filter((c) => c.subjectId === material.subjectId)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    if (curated) {
      subtitle = curated.subtitle;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10.5);
      doc.setTextColor(71, 85, 105);
      doc.text(curated.subtitle, margin, y);
      y += 24;

      for (const sec of curated.sections) {
        ensureSpace(70);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(sec.heading, margin, y);
        y += 18;

        for (const bullet of sec.bullets) {
          ensureSpace(28);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          const wrapped = doc.splitTextToSize(`- ${bullet}`, maxWidth - 12);
          doc.text(wrapped, margin + 8, y);
          y += wrapped.length * 14 + 4;
        }

        if (sec.formulas && sec.formulas.length > 0) {
          ensureSpace(sec.formulas.length * 16 + 24);
          doc.setFillColor(241, 245, 249);
          const boxHeight = sec.formulas.length * 16 + 16;
          doc.roundedRect(margin + 6, y - 4, maxWidth - 12, boxHeight, 5, 5, 'F');
          doc.setFont('courier', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 58, 138);
          let fy = y + 12;
          for (const formula of sec.formulas) {
            doc.text(formula, margin + 16, fy);
            fy += 16;
          }
          y += boxHeight + 10;
        }

        previewSections.push(sec);
        y += 8;
      }
    }

    // Append chapter checklist for this subject
    if (subjChapters.length > 0) {
      ensureSpace(64);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(37, 99, 235);
      doc.text('Chapter Syllabus & Topic Checklist', margin, y);
      y += 18;

      const checklistBullets: string[] = [];
      for (const ch of subjChapters) {
        ensureSpace(34);
        const topicsText = ch.topics.length > 0 ? ` (${ch.topics.join(', ')})` : '';
        const text = `Chapter ${ch.chapterNumber}: ${ch.title}${topicsText}`;
        checklistBullets.push(text);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        const wrapped = doc.splitTextToSize(text, maxWidth - 10);
        doc.text(wrapped, margin + 8, y);
        y += wrapped.length * 13 + 4;
      }

      previewSections.push({
        heading: 'Chapter Syllabus & Topic Checklist',
        bullets: checklistBullets,
      });
    }
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${APP_CONFIG.APP_NAME} · Class 12 Study Companion`,
      margin,
      pageHeight - 24
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 52, pageHeight - 24);
  }

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const safeSlug = material.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${APP_CONFIG.APP_NAME.toLowerCase()}_${safeSlug}.pdf`;

  return {
    blobUrl,
    filename,
    previewSections,
    subtitle,
  };
}
