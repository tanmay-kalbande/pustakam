// src/components/ReadingMode.tsx
// A clean, distraction-free reading experience — no study tools.
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookText,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit,
  Moon,
  Palette,
  Save,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BookModule, BookProject } from '../types/book';
import { readingProgressUtils } from '../utils/readingProgress';

type ReaderSurface = 'module' | 'full_book';

export interface ReadingModeProps {
  book: BookProject;
  theme: 'light' | 'dark';
  isEditing: boolean;
  editedContent: string;
  onEditFullBook: () => void;
  onSaveFullBook: () => void;
  onCancelEdit: () => void;
  onContentChange: (content: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isMobile?: boolean;
}

interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'nunito' | 'mono' | 'crimson' | 'rubik';
  theme: 'dark' | 'sepia' | 'light';
  maxWidth: 'narrow' | 'medium' | 'wide';
  textAlign: 'left' | 'justify';
}

const THEMES = {
  dark: {
    bg: 'rgba(5, 5, 5, 0.4)',
    contentBg: 'var(--bg-surface)',
    text: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    border: 'var(--border-subtle)',
    accent: 'var(--brand)',
  },
  sepia: {
    bg: '#F5F1E8',
    contentBg: '#FAF7F0',
    text: '#3C2A1E',
    secondary: '#8B7355',
    border: '#D4C4A8',
    accent: '#B45309',
  },
  light: {
    bg: '#FFFFFF',
    contentBg: '#F9F9F9',
    text: '#1A1A1A',
    secondary: '#555555',
    border: '#E0E0E0',
    accent: '#3B82F6',
  },
};

const FONT_FAMILIES = {
  mono: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", monospace',
  nunito: "'Nunito', 'Segoe UI', sans-serif",
  crimson: "'Crimson Pro', serif",
  rubik: "'Outfit', sans-serif",
};

const FONT_LABELS = {
  rubik: 'Rubik',
  nunito: 'Smooth',
  crimson: 'Book',
  mono: 'Code',
};

const MAX_WIDTHS = {
  narrow: '65ch',
  medium: '75ch',
  wide: '85ch',
};

const CodeBlock = React.memo(function CodeBlock({
  children,
  className,
  theme,
  readingTheme,
}: {
  children: ReactNode;
  className?: string;
  theme: 'light' | 'dark';
  readingTheme?: string;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const language = className?.replace(/language-/, '') || 'text';

  const handleCopy = () => {
    if (isCopied) return;
    navigator.clipboard.writeText(String(children)).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const themeMap: Record<string, { containerBg: string; headerBg: string; headerText: string }> = {
    dark: { containerBg: '#0D1117', headerBg: 'rgba(22,27,34,0.7)', headerText: '#8B949E' },
    sepia: { containerBg: '#F0EAD6', headerBg: 'rgba(232,225,209,0.7)', headerText: '#8B7355' },
    light: { containerBg: '#f8f8f8', headerBg: 'rgba(239,239,239,0.7)', headerText: '#555555' },
  };

  const selectedTheme = themeMap[readingTheme || theme];

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-black/10 shadow-lg" style={{ backgroundColor: selectedTheme.containerBg }}>
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2" style={{ backgroundColor: selectedTheme.headerBg }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: selectedTheme.headerText }}>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition"
          style={{
            color: selectedTheme.headerText,
            border: `1px solid ${readingTheme === 'light' || readingTheme === 'sepia' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'}`,
            backgroundColor: readingTheme === 'light' || readingTheme === 'sepia' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
          }}
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="overflow-x-auto px-6 py-4 text-sm leading-6"
        style={{
          margin: 0,
          backgroundColor: 'transparent',
          color: readingTheme === 'light' || readingTheme === 'sepia' ? '#1f2937' : '#e5e7eb',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        }}
      >
        <code>{String(children).replace(/\n$/, '')}</code>
      </pre>
    </div>
  );
});

const SurfaceToggle = ({
  value,
  onChange,
}: {
  value: ReaderSurface;
  onChange: (next: ReaderSurface) => void;
}) => (
  <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] p-1">
    {[
      { value: 'module' as const, label: 'Chapter Mode', icon: BookOpen },
      { value: 'full_book' as const, label: 'Full Book', icon: BookText },
    ].map(({ value: nextValue, label, icon: Icon }) => (
      <button
        key={nextValue}
        onClick={() => onChange(nextValue)}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          value === nextValue
            ? 'bg-[var(--brand)] text-black'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </div>
);

export function ReadingMode({
  book,
  theme,
  isEditing,
  editedContent,
  onEditFullBook,
  onSaveFullBook,
  onCancelEdit,
  onContentChange,
  showToast,
  isMobile = false,
}: ReadingModeProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const orderedModules = useMemo(() => {
    if (!book.roadmap?.modules?.length) return [...book.modules];
    const ordered = book.roadmap.modules
      .map(roadmapModule =>
        book.modules.find(module => module.roadmapModuleId === roadmapModule.id)
      )
      .filter((module): module is BookModule => Boolean(module));

    return ordered.length > 0 ? ordered : [...book.modules];
  }, [book.modules, book.roadmap]);

  const resumeState = useMemo(() => readingProgressUtils.getResumeState(book.id), [book.id]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(() => {
    if (!resumeState) return 0;
    return Math.max(0, Math.min(resumeState.moduleIndex, Math.max(orderedModules.length - 1, 0)));
  });
  const [readerSurface, setReaderSurface] = useState<ReaderSurface>(resumeState?.mode || 'module');
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem('pustakam-reading-settings');
    return {
      fontSize: 18,
      lineHeight: 1.8,
      fontFamily: 'nunito',
      theme: theme === 'dark' ? 'dark' : 'light',
      maxWidth: 'medium',
      textAlign: 'left',
      ...(saved ? JSON.parse(saved) : {}),
    };
  });

  const currentModule = orderedModules[selectedModuleIndex];
  const roadmapModule = book.roadmap?.modules.find(item => item.id === currentModule?.roadmapModuleId) || null;
  const currentTheme = THEMES[settings.theme];
  const content = readerSurface === 'full_book' ? book.finalBook || '' : currentModule?.content || '';

  useEffect(() => {
    localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const resume = readingProgressUtils.getResumeState(book.id);
    if (!resume) return;
    setSelectedModuleIndex(Math.max(0, Math.min(resume.moduleIndex, Math.max(orderedModules.length - 1, 0))));
    setReaderSurface(resume.mode);
  }, [book.id, orderedModules.length]);

  // Restore scroll position
  useEffect(() => {
    if (!content) return;
    if (isEditing && readerSurface === 'full_book') return;

    const scrollEl = document.getElementById('main-scroll-area') || document.documentElement;
    const targetProgress =
      readerSurface === 'full_book'
        ? readingProgressUtils.getFullBookProgress(book.id)
        : readingProgressUtils.getModuleProgress(book.id, selectedModuleIndex);

    requestAnimationFrame(() => {
      scrollEl.scrollTo({
        top: targetProgress?.scrollPosition || 0,
        behavior: 'auto',
      });
    });
  }, [book.id, content, readerSurface, selectedModuleIndex, isEditing]);

  // Save scroll position
  useEffect(() => {
    if (!content) return;
    if (isEditing && readerSurface === 'full_book') return;

    const scrollEl = document.getElementById('main-scroll-area') || window;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const getScrollMetrics = () => {
      const element = document.getElementById('main-scroll-area') || document.documentElement;
      const maxScroll = Math.max(1, element.scrollHeight - element.clientHeight);
      const scrollPosition = element.scrollTop;
      const percent = Math.min(100, Math.max(0, (scrollPosition / maxScroll) * 100));
      return { scrollPosition, percent };
    };

    const onScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const { scrollPosition, percent } = getScrollMetrics();
        if (scrollPosition < 40) return;

        readingProgressUtils.saveBookmark(
          book.id,
          selectedModuleIndex,
          scrollPosition,
          percent,
          readerSurface
        );
      }, 240);
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (timeout) clearTimeout(timeout);
      scrollEl.removeEventListener('scroll', onScroll);
    };
  }, [book.id, content, readerSurface, selectedModuleIndex, isEditing]);

  if (!currentModule) {
    return (
      <div className="workspace-panel p-8 text-sm text-[var(--text-secondary)]">
        No module content is available for this book yet.
      </div>
    );
  }

  const handleNavigateChapter = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedModuleIndex > 0) {
      setSelectedModuleIndex(selectedModuleIndex - 1);
      setReaderSurface('module');
    } else if (direction === 'next' && selectedModuleIndex < orderedModules.length - 1) {
      setSelectedModuleIndex(selectedModuleIndex + 1);
      setReaderSurface('module');
    }
  };

  return (
    <div className="workspace-stack">
      {/* Mobile chapter selector */}
      {isMobile ? (
        <div className="overflow-x-auto pb-1">
          <div className="workspace-chip-row min-w-max">
            {orderedModules.map((module, index) => (
              <button
                key={module.id}
                onClick={() => {
                  setSelectedModuleIndex(index);
                  setReaderSurface('module');
                }}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  index === selectedModuleIndex
                    ? 'border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                }`}
              >
                {index + 1}. {module.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Reader container */}
      <div
        className="workspace-reader-shell reading-container"
        style={{ backgroundColor: currentTheme.contentBg, color: currentTheme.text }}
      >
        {/* Toolbar */}
        <div className="workspace-reader-toolbar" style={{ backgroundColor: currentTheme.contentBg }}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Theme switcher */}
            <div className="flex items-center gap-1 rounded-full p-1" style={{ backgroundColor: currentTheme.contentBg }}>
              {(['light', 'sepia', 'dark'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSettings(previous => ({ ...previous, theme: mode }))}
                  className="rounded-full p-2 transition"
                  style={{
                    backgroundColor: settings.theme === mode ? currentTheme.accent : 'transparent',
                    color: settings.theme === mode ? '#FFF' : currentTheme.secondary,
                  }}
                >
                  {mode === 'light' ? <Sun size={14} /> : mode === 'sepia' ? <Palette size={14} /> : <Moon size={14} />}
                </button>
              ))}
            </div>

            {/* Font size */}
            <div className="flex items-center gap-2">
              <button onClick={() => setSettings(previous => ({ ...previous, fontSize: Math.max(12, previous.fontSize - 1) }))} className="rounded-full p-2 hover:bg-black/5" style={{ color: currentTheme.secondary }}>
                <ZoomOut size={16} />
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-mono" style={{ color: currentTheme.secondary }}>
                {settings.fontSize}px
              </span>
              <button onClick={() => setSettings(previous => ({ ...previous, fontSize: Math.min(28, previous.fontSize + 1) }))} className="rounded-full p-2 hover:bg-black/5" style={{ color: currentTheme.secondary }}>
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Font family picker */}
            <div className="relative hidden items-center group md:flex">
              <button className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: currentTheme.contentBg, color: currentTheme.text, borderColor: currentTheme.border }}>
                <span className="opacity-70">Font</span>
                <span>{FONT_LABELS[settings.fontFamily]}</span>
                <ChevronDown size={14} className="opacity-50" />
              </button>
              <div className="absolute left-0 top-full z-30 mt-2 hidden w-44 overflow-hidden rounded-2xl border shadow-xl group-hover:block" style={{ backgroundColor: currentTheme.contentBg, borderColor: currentTheme.border }}>
                {(['rubik', 'nunito', 'crimson', 'mono'] as const).map(font => (
                  <button
                    key={font}
                    onClick={() => setSettings(previous => ({ ...previous, fontFamily: font }))}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm"
                    style={{
                      fontFamily: FONT_FAMILIES[font],
                      color: settings.fontFamily === font ? currentTheme.accent : currentTheme.text,
                      backgroundColor: settings.fontFamily === font ? `${currentTheme.accent}15` : 'transparent',
                    }}
                  >
                    <span>{FONT_LABELS[font]}</span>
                    {settings.fontFamily === font ? <Check size={14} /> : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SurfaceToggle value={readerSurface} onChange={setReaderSurface} />
            {readerSurface === 'full_book' ? (
              isEditing ? (
                <>
                  <button onClick={onCancelEdit} className="btn btn-secondary py-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button onClick={onSaveFullBook} className="btn btn-primary py-2">
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </>
              ) : (
                <button onClick={onEditFullBook} className="btn btn-secondary py-2">
                  <Edit className="h-4 w-4" />
                  Edit full book
                </button>
              )
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="workspace-reader-content">
          {readerSurface === 'module' ? (
            <div className="workspace-card mb-5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--workspace-line)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Chapter {selectedModuleIndex + 1} of {orderedModules.length}
                    </span>
                    {roadmapModule?.estimatedTime ? (
                      <span className="rounded-full border border-[var(--workspace-line)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        {roadmapModule.estimatedTime}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-[1.7rem] font-semibold leading-tight text-[var(--text-primary)]">{currentModule.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                    {roadmapModule?.description || ''}
                  </p>
                </div>
              </div>

              {roadmapModule?.objectives?.length ? (
                <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                  {roadmapModule.objectives.slice(0, 4).map(objective => (
                    <div key={objective} className="workspace-card-muted px-3.5 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                        <span>{objective}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="workspace-card-muted mb-5 p-4 text-sm leading-7 text-[var(--text-secondary)]">
              Full book view keeps the entire draft in one scrollable surface.
            </div>
          )}

          {readerSurface === 'full_book' && isEditing ? (
            <textarea
              className="w-full rounded-[20px] border border-[var(--workspace-line)] bg-white/[0.02] p-5 font-mono text-sm leading-relaxed text-[var(--text-primary)] outline-none"
              value={editedContent}
              onChange={event => onContentChange(event.target.value)}
              style={{ minHeight: '70vh', fontSize: `${settings.fontSize - 2}px` }}
            />
          ) : (
            <div ref={contentRef}>
              <article
                className={`prose prose-lg mx-auto max-w-none transition-all duration-300 ${settings.theme !== 'light' ? 'prose-invert' : ''}`}
                style={{
                  fontFamily: FONT_FAMILIES[settings.fontFamily],
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  maxWidth: MAX_WIDTHS[settings.maxWidth],
                  textAlign: settings.textAlign as 'left' | 'justify',
                  color: currentTheme.text,
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ className, children, ...props }) => {
                      if (!className?.includes('language-')) {
                        return <code className={className} {...props}>{children}</code>;
                      }

                      return (
                        <CodeBlock {...props} theme={theme} readingTheme={settings.theme} className={className}>
                          {children}
                        </CodeBlock>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </article>
            </div>
          )}

          {/* Chapter navigation (module mode only) */}
          {readerSurface === 'module' && (
            <div className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-6">
              <button
                onClick={() => handleNavigateChapter('prev')}
                disabled={selectedModuleIndex === 0}
                className="btn btn-secondary flex-1 py-3 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous Chapter
              </button>
              <button
                onClick={() => handleNavigateChapter('next')}
                disabled={selectedModuleIndex === orderedModules.length - 1}
                className="btn btn-secondary flex-1 py-3 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next Chapter
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
