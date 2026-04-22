// src/components/BookAnalytics.tsx
import React, { useMemo } from 'react';
import { 
  BarChart3, Clock, BookOpen, Target, Download, 
  FileText, Brain, Hash
} from 'lucide-react';
import { BookProject } from '../types';
import { bookEnhancementService } from '../services/bookEnhancements';

interface BookAnalyticsProps {
  book: BookProject;
}

export function BookAnalytics({ book }: BookAnalyticsProps) {
  const analytics = useMemo(() => bookEnhancementService.analyzeBook(book), [book]);
  const studyMaterials = useMemo(() => bookEnhancementService.generateStudyMaterials(book), [book]);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const downloadProgressTracker = () => {
    const content = bookEnhancementService.generateProgressTracker(book);
    downloadFile(content, `${book.title.replace(/ /g, '_')}_progress_tracker.md`, 'text/markdown;charset=utf-8');
  };

  const downloadStudySummary = () => {
    downloadFile(studyMaterials.summary, `${book.title.replace(/ /g, '_')}_summary.md`, 'text/markdown;charset=utf-8');
  };

  const complexityLabel = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="workspace-hero">
        <div className="workspace-hero__content">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="workspace-eyebrow">Analytics</p>
              <h3 className="mt-4 text-[clamp(1.6rem,2.8vw,2.25rem)] font-bold tracking-[-0.05em] text-[var(--text-primary)]">
                Book overview
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Inspect the shape of this draft before you export or study it.
              </p>
            </div>
            <div className="workspace-chip workspace-chip--accent hidden md:inline-flex">
              <BarChart3 className="h-4 w-4" />
              Learning intelligence
            </div>
          </div>

          <div className="workspace-metric-grid">
          {[
            { label: 'Total words', value: analytics.totalWords.toLocaleString(), icon: Hash },
            { label: 'Reading time', value: analytics.readingTime, icon: Clock },
            { label: 'Complexity', value: complexityLabel[analytics.complexity], icon: Brain },
            { label: 'Chapters', value: book.modules.length, icon: BookOpen },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="workspace-metric-card">
              <div className="flex items-center justify-between gap-3">
                <span className="workspace-metric-card__label">{label}</span>
                <Icon className="h-4 w-4 text-[var(--brand)]" />
              </div>
              <span className="workspace-metric-card__value">{value}</span>
            </div>
          ))}
          </div>
        </div>
      </div>

      <div className="workspace-panel p-6">
        <div className="mb-4 flex items-center gap-3">
          <Target className="h-5 w-5 text-[var(--brand)]" />
          <h4 className="text-lg font-semibold text-[var(--text-primary)]">Key topics</h4>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {analytics.topics.map((topic, index) => (
            <span key={index} className="workspace-chip">
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div className="workspace-panel p-6">
        <div className="mb-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-[var(--brand)]" />
          <h4 className="text-lg font-semibold text-[var(--text-primary)]">Study materials</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={downloadProgressTracker}
            className="workspace-card flex items-center gap-3 p-4 text-left transition-colors hover:bg-[var(--workspace-soft)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--workspace-line)] bg-white/[0.02]">
              <Download className="h-4 w-4 text-[var(--brand)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Progress tracker</div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">Checklist for chapters and completion</div>
            </div>
          </button>
          <button
            onClick={downloadStudySummary}
            className="workspace-card flex items-center gap-3 p-4 text-left transition-colors hover:bg-[var(--workspace-soft)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--workspace-line)] bg-white/[0.02]">
              <Download className="h-4 w-4 text-[var(--brand)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Study summary</div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">Key points and objectives</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
