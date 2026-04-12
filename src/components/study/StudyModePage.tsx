import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookText,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit,
  Loader2,
  MessageCircle,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BookModule, BookProject } from '../../types/book';
import { ExplanationMode, FlashcardDeck, StudyInteraction, StudyThread } from '../../types/study';
import { learningService } from '../../services/learningService';
import { EXPLANATION_MODE_LABELS } from '../../utils/studyPrompts';
import { readingProgressUtils } from '../../utils/readingProgress';

type ReaderSurface = 'module' | 'full_book';
type StudyTool = 'doubt' | 'explain' | 'flashcards';

interface StudyModePageProps {
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

const EXPLANATION_OPTIONS: ExplanationMode[] = [
  'simpler',
  'deeper',
  'step_by_step',
  'analogy',
  'exam_focused',
  'practical',
];

const normalizeSelection = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 900);

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
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:text-white"
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={readingTheme === 'light' || readingTheme === 'sepia' ? prism : vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ backgroundColor: 'transparent', padding: '1rem 1.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
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
  <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
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
            : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    ))}
  </div>
);

const StudyTabButton = ({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? 'border-[var(--brand)]/20 bg-[var(--brand)]/10 text-[var(--text-primary)]'
        : 'border-white/8 bg-white/[0.03] text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);

const HistoryCard = ({
  interaction,
  onFollowUpClick,
}: {
  interaction: StudyInteraction;
  onFollowUpClick?: (prompt: string) => void;
}) => (
  <div className="space-y-3 rounded-[22px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
    {interaction.question?.question ? (
      <div className="ml-8 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">
            {interaction.type === 'doubt' ? 'You asked' : EXPLANATION_MODE_LABELS[interaction.mode || 'simpler']}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {interaction.answer.confidence || 'medium'}
          </span>
        </div>
        <p className="text-sm leading-7 text-[var(--text-primary)]">{interaction.question.question}</p>
      </div>
    ) : null}

    <div className="mr-4 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-base)]/90 px-4 py-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
          {interaction.type === 'doubt' ? <MessageCircle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">
          {interaction.type === 'doubt' ? 'Companion' : 'Reframed explanation'}
        </span>
      </div>

      {interaction.sourceText ? (
        <div className="mb-3 rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] px-3 py-2 text-xs leading-6 text-[var(--text-secondary)]">
          "{interaction.sourceText}"
        </div>
      ) : null}

      <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{interaction.answer.answer}</p>

      {interaction.answer.followUpSuggestions?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {interaction.answer.followUpSuggestions.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => onFollowUpClick?.(item)}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  </div>
);

const FlashcardDeckView = ({
  deck,
  activeIndex,
  revealAnswer,
  onReveal,
  onNavigate,
  onRate,
}: {
  deck: FlashcardDeck;
  activeIndex: number;
  revealAnswer: boolean;
  onReveal: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onRate: (difficulty: 'easy' | 'medium' | 'hard') => void;
}) => {
  const card = deck.cards[activeIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{deck.deckTitle}</span>
        <span>
          {activeIndex + 1} / {deck.cards.length}
        </span>
      </div>

      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.24)]"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Prompt</p>
        <p className="mt-3 text-lg font-semibold leading-8 text-[var(--text-primary)]">{card.front}</p>

        {card.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {card.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {revealAnswer ? (
            <motion.div
              key="answer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 border-t border-[var(--border-subtle)] pt-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Answer</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{card.back}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: 'Hard', value: 'hard' as const },
                  { label: 'Okay', value: 'medium' as const },
                  { label: 'Easy', value: 'easy' as const },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => onRate(option.value)}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!revealAnswer ? (
          <button onClick={onReveal} className="btn btn-primary mt-5 w-full py-2.5">
            Reveal answer
          </button>
        ) : null}
      </motion.div>

      <div className="flex items-center justify-between gap-3">
        <button onClick={() => onNavigate('prev')} className="btn btn-secondary flex-1 py-2.5">
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
        <button onClick={() => onNavigate('next')} className="btn btn-secondary flex-1 py-2.5">
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export function StudyModePage({
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
  onBack,
}: StudyModePageProps & { onBack: () => void }) {
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
  const [activeTool, setActiveTool] = useState<StudyTool>('doubt');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(!isMobile);
  const [studyPanelOpen, setStudyPanelOpen] = useState(!isMobile);
  const [selectedText, setSelectedText] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [thread, setThread] = useState<StudyThread | null>(null);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [isThreadLoading, setIsThreadLoading] = useState(true);
  const [isDeckLoading, setIsDeckLoading] = useState(true);
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [explainLoadingMode, setExplainLoadingMode] = useState<ExplanationMode | null>(null);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [flashcardsError, setFlashcardsError] = useState<string | null>(null);
  const [lastDoubtPayload, setLastDoubtPayload] = useState<{ question: string; selectedText?: string } | null>(null);
  const [lastExplainPayload, setLastExplainPayload] = useState<{ mode: ExplanationMode; selectedText?: string } | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);
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

  const currentModule = orderedModules[selectedModuleIndex] || orderedModules[0] || null;
  const roadmapModule = book.roadmap?.modules.find(item => item.id === currentModule?.roadmapModuleId) || null;
  const currentTheme = THEMES[settings.theme];
  const interactions = thread?.interactions || [];
  const doubtHistory = interactions.filter(item => item.type === 'doubt').slice().reverse();
  const explainHistory = interactions.filter(item => item.type === 're_explain').slice().reverse();
  const content = readerSurface === 'full_book' ? book.finalBook || '' : currentModule?.content || '';

  useEffect(() => {
    setLeftSidebarOpen(!isMobile);
    setStudyPanelOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const resume = readingProgressUtils.getResumeState(book.id);
    if (!resume) return;
    setSelectedModuleIndex(Math.max(0, Math.min(resume.moduleIndex, Math.max(orderedModules.length - 1, 0))));
    setReaderSurface(resume.mode);
  }, [book.id, orderedModules.length]);

  useEffect(() => {
    if (!currentModule) return;

    let cancelled = false;
    setQuestionInput('');
    setSelectedText('');
    setDoubtError(null);
    setExplainError(null);
    setFlashcardsError(null);
    setIsThreadLoading(true);
    setIsDeckLoading(true);

    void Promise.all([
      learningService.getModuleThread(book.id, currentModule.id),
      learningService.getFlashcardDeck(book.id, currentModule.id),
    ])
      .then(([nextThread, nextDeck]) => {
        if (cancelled) return;
        setThread(nextThread);
        setDeck(nextDeck);
        setReviewIndex(0);
        setRevealAnswer(false);
      })
      .catch(error => {
        if (cancelled) return;
        console.warn('[StudyReader] Failed to load study artifacts:', error);
      })
      .finally(() => {
        if (cancelled) return;
        setIsThreadLoading(false);
        setIsDeckLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [book.id, currentModule?.id]);

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

  useEffect(() => {
    const handleSelection = () => {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed || !contentRef.current) return;

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      if (!anchorNode || !focusNode) return;
      if (!contentRef.current.contains(anchorNode) || !contentRef.current.contains(focusNode)) return;

      const nextSelection = normalizeSelection(selection.toString());
      if (nextSelection.length >= 12) {
        setSelectedText(nextSelection);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  if (!currentModule) {
    return (
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-secondary)]">
        No module content is available for this book yet.
      </div>
    );
  }

  const appendInteraction = (interaction: StudyInteraction) => {
    setThread(previous => ({
      id: previous?.id || `${book.id}:${currentModule.id}`,
      bookId: book.id,
      moduleId: currentModule.id,
      moduleTitle: currentModule.title,
      interactions: [...(previous?.interactions || []), interaction],
      updatedAt: new Date(),
    }));
  };

  const moduleOverviewSnippet = [
    roadmapModule?.description || '',
    ...(roadmapModule?.objectives || []),
  ]
    .filter(Boolean)
    .join(' ');
  const quickQuestionPrompts = [
    `What is the core idea in ${currentModule.title}?`,
    'What should I not confuse this with?',
    'Give me one practical example from this chapter.',
  ];
  const selectedContextText = selectedText || moduleOverviewSnippet;
  const selectedTextPreview = selectedText ? `${selectedText.slice(0, 220)}${selectedText.length > 220 ? '...' : ''}` : '';
  const completedModules = orderedModules.filter(module => module.status === 'completed').length;
  const moduleProgress = readingProgressUtils.getModuleProgress(book.id, selectedModuleIndex)?.percentComplete || 0;
  const fullBookProgress = readingProgressUtils.getFullBookProgress(book.id)?.percentComplete || 0;
  const bookWordCount = (book.finalBook || orderedModules.map(module => module.content).join(' ')).split(/\s+/).filter(Boolean).length;
  const estimatedReadMinutes = Math.max(6, Math.round(bookWordCount / 220));
  const desktopGridClass = isMobile
    ? 'grid-cols-1'
    : leftSidebarOpen && studyPanelOpen
      ? 'xl:grid-cols-[240px_minmax(0,1fr)_360px]'
      : leftSidebarOpen
        ? 'xl:grid-cols-[240px_minmax(0,1fr)]'
        : studyPanelOpen
          ? 'xl:grid-cols-[minmax(0,1fr)_360px]'
          : 'grid-cols-1';

  const handleAskDoubt = async (payload?: { question: string; selectedText?: string }) => {
    const effectiveQuestion = payload?.question || questionInput;
    const effectiveSelectedText = (payload?.selectedText ?? selectedText) || undefined;
    if (!effectiveQuestion.trim()) {
      showToast('Add a question first so I know what to ask the chapter.', 'warning');
      return;
    }

    setDoubtLoading(true);
    setDoubtError(null);
    setLastDoubtPayload({ question: effectiveQuestion, selectedText: effectiveSelectedText });

    try {
      const interaction = await learningService.askModuleDoubt({
        book,
        module: currentModule,
        moduleIndex: selectedModuleIndex,
        question: effectiveQuestion,
        selectedText: effectiveSelectedText,
      });
      appendInteraction(interaction);
      setQuestionInput('');
      setSelectedText('');
      setStudyPanelOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to ask the chapter.';
      setDoubtError(message);
      showToast(message, 'error');
    } finally {
      setDoubtLoading(false);
    }
  };

  const handleFollowUpPrompt = (prompt: string, sourceText?: string) => {
    setActiveTool('doubt');
    setQuestionInput(prompt);
    void handleAskDoubt({
      question: prompt,
      selectedText: sourceText || selectedContextText || undefined,
    });
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!doubtLoading) {
        void handleAskDoubt();
      }
    }
  };

  const handleExplain = async (mode: ExplanationMode, retrySource?: string) => {
    const source = retrySource || selectedText || moduleOverviewSnippet || currentModule.title;
    const existing = explainHistory.find(item => item.mode === mode && item.sourceText === source);
    if (existing) {
      setActiveTool('explain');
      setStudyPanelOpen(true);
      showToast('Using the explanation already generated for this view.', 'info');
      return;
    }

    setExplainLoadingMode(mode);
    setExplainError(null);
    setLastExplainPayload({ mode, selectedText: source });

    try {
      const interaction = await learningService.reExplainModuleSection({
        book,
        module: currentModule,
        moduleIndex: selectedModuleIndex,
        mode,
        selectedText: source,
      });
      appendInteraction(interaction);
      setStudyPanelOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to re-explain this section.';
      setExplainError(message);
      showToast(message, 'error');
    } finally {
      setExplainLoadingMode(null);
    }
  };

  const handleGenerateFlashcards = async () => {
    setFlashcardsLoading(true);
    setFlashcardsError(null);

    try {
      const nextDeck = await learningService.generateFlashcards({
        book,
        module: currentModule,
        moduleIndex: selectedModuleIndex,
      });
      setDeck(nextDeck);
      setReviewIndex(0);
      setRevealAnswer(false);
      setStudyPanelOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate flashcards.';
      setFlashcardsError(message);
      showToast(message, 'error');
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const handleRateCard = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!deck) return;
    const card = deck.cards[reviewIndex];
    const nextDeck = await learningService.recordFlashcardFeedback(book.id, deck.moduleId, card.id, difficulty);
    if (nextDeck) setDeck(nextDeck);
    setRevealAnswer(false);
    setReviewIndex(previous => (previous + 1) % deck.cards.length);
  };

  const renderStudyPanel = () => (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,19,0.98),rgba(9,11,12,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
      <div className="border-b border-white/8 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--text-muted)]">Assistant</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">{currentModule.title}</h3>
            <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
              Ask questions, reframe difficult sections, and build recall without leaving the chapter.
            </p>
          </div>
          <button onClick={() => setStudyPanelOpen(false)} className="rounded-full border border-white/10 p-2 text-[var(--text-secondary)] transition hover:bg-white/[0.04] hover:text-[var(--text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
          Responses are generated with AI and may contain mistakes. Use this panel for guided recall and focused help.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StudyTabButton label="Ask" icon={MessageCircle} active={activeTool === 'doubt'} onClick={() => setActiveTool('doubt')} />
          <StudyTabButton label="Reframe" icon={Sparkles} active={activeTool === 'explain'} onClick={() => setActiveTool('explain')} />
          <StudyTabButton label="Flashcards" icon={Brain} active={activeTool === 'flashcards'} onClick={() => setActiveTool('flashcards')} />
        </div>

        {selectedText ? (
          <div className="mt-4 rounded-[22px] border border-emerald-500/20 bg-emerald-500/8 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">Using selection</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">"{selectedTextPreview}"</p>
              </div>
              <button onClick={() => setSelectedText('')} className="rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
        {activeTool === 'doubt' ? (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[var(--border-subtle)] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">Thread</p>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">A cleaner running conversation for this chapter.</p>
                </div>
                {isThreadLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" /> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickQuestionPrompts.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestionInput(prompt)}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {doubtHistory.length === 0 && !isThreadLoading ? (
              <div className="rounded-[20px] border border-dashed border-[var(--border-subtle)] px-4 py-5 text-sm leading-7 text-[var(--text-secondary)]">
                Start with a direct question, or highlight a part of the chapter first.
              </div>
            ) : null}

            {doubtHistory.map(interaction => (
              <HistoryCard
                key={interaction.id}
                interaction={interaction}
                onFollowUpClick={prompt => handleFollowUpPrompt(prompt, interaction.sourceText)}
              />
            ))}
          </div>
        ) : null}

        {activeTool === 'explain' ? (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[var(--border-subtle)] bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">Transforms</p>
              <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                Pick the lens first. Keep the context tight.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {EXPLANATION_OPTIONS.map(mode => (
                  <button
                    key={mode}
                    onClick={() => void handleExplain(mode)}
                    disabled={Boolean(explainLoadingMode)}
                    className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition ${
                      explainLoadingMode === mode
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-[var(--text-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{EXPLANATION_MODE_LABELS[mode]}</span>
                      {explainLoadingMode === mode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                ))}
              </div>
              {selectedContextText ? (
                <div className="mt-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-xs leading-6 text-[var(--text-secondary)]">
                  Current context: "{selectedContextText.slice(0, 220)}{selectedContextText.length > 220 ? '...' : ''}"
                </div>
              ) : null}
              {explainError ? (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                  <div>{explainError}</div>
                  {lastExplainPayload ? (
                    <button
                      onClick={() => void handleExplain(lastExplainPayload.mode, lastExplainPayload.selectedText)}
                      className="mt-3 inline-flex items-center gap-2 font-semibold text-red-200"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {explainHistory.length === 0 && !isThreadLoading ? (
              <div className="rounded-[20px] border border-dashed border-[var(--border-subtle)] px-4 py-5 text-sm leading-7 text-[var(--text-secondary)]">
                Pick a transform to create your first alternate explanation.
              </div>
            ) : null}

            {explainHistory.map(interaction => (
              <HistoryCard
                key={interaction.id}
                interaction={interaction}
                onFollowUpClick={prompt => handleFollowUpPrompt(prompt, interaction.sourceText)}
              />
            ))}
          </div>
        ) : null}

        {activeTool === 'flashcards' ? (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[var(--border-subtle)] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">Flashcards</p>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                    Turn this chapter into a compact recall deck and review it right here.
                  </p>
                </div>
                {isDeckLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" /> : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => void handleGenerateFlashcards()} disabled={flashcardsLoading} className="btn btn-primary py-2.5">
                  {flashcardsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  {deck ? 'Refresh deck' : 'Generate deck'}
                </button>
                {deck ? (
                  <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                    {deck.cards.length} cards saved
                  </span>
                ) : null}
              </div>

              {flashcardsError ? (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                  <div>{flashcardsError}</div>
                  <button onClick={() => void handleGenerateFlashcards()} className="mt-3 inline-flex items-center gap-2 font-semibold text-red-200">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              ) : null}
            </div>

            {deck ? (
              <FlashcardDeckView
                deck={deck}
                activeIndex={reviewIndex}
                revealAnswer={revealAnswer}
                onReveal={() => setRevealAnswer(true)}
                onNavigate={direction => {
                  setRevealAnswer(false);
                  setReviewIndex(previous => {
                    if (direction === 'prev') {
                      return previous === 0 ? deck.cards.length - 1 : previous - 1;
                    }

                    return (previous + 1) % deck.cards.length;
                  });
                }}
                onRate={difficulty => void handleRateCard(difficulty)}
              />
            ) : !isDeckLoading ? (
              <div className="rounded-[20px] border border-dashed border-[var(--border-subtle)] px-4 py-5 text-sm leading-7 text-[var(--text-secondary)]">
                Generate a deck once and it will stay attached to this chapter locally.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeTool === 'doubt' ? (
        <div className="border-t border-white/8 bg-[rgba(10,12,13,0.98)] px-5 py-5">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-3">
            <textarea
              value={questionInput}
              onChange={event => setQuestionInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask about the current chapter..."
              className="min-h-[88px] w-full resize-none bg-transparent text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {selectedText ? (
                  <button onClick={() => setSelectedText('')} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
                    Clear selection
                  </button>
                ) : null}
                {moduleOverviewSnippet ? (
                  <button onClick={() => setSelectedText(moduleOverviewSnippet)} className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">
                    Use chapter overview
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--text-muted)]">Enter to ask</span>
                <button onClick={() => void handleAskDoubt()} disabled={doubtLoading} className="btn btn-primary py-2.5">
                  {doubtLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {doubtLoading ? 'Thinking' : 'Ask'}
                </button>
              </div>
            </div>
            {doubtError ? (
              <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                <div>{doubtError}</div>
                {lastDoubtPayload ? (
                  <button onClick={() => void handleAskDoubt(lastDoubtPayload)} className="mt-3 inline-flex items-center gap-2 font-semibold text-red-200">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col px-3 pb-8 pt-3 md:px-5 md:pt-5">
        <header className="sticky top-0 z-50 mb-5 overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,14,15,0.92),rgba(9,11,12,0.9))] shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(254,205,140,0.5),transparent)]" />
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              <button onClick={onBack} className="btn btn-secondary px-3 py-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-[var(--text-muted)]">Pustakam Study Workspace</p>
                <h1 className="truncate text-sm font-semibold text-[var(--text-primary)] md:text-base">{book.title}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {!isMobile ? (
                <>
                  <button
                    onClick={() => setLeftSidebarOpen(previous => !previous)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      leftSidebarOpen
                        ? 'border-white/10 bg-white/[0.05] text-[var(--text-primary)]'
                        : 'border-white/8 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <BookOpen className="mr-2 inline h-3.5 w-3.5" />
                    {leftSidebarOpen ? 'Hide chapters' : 'Show chapters'}
                  </button>
                  <button
                    onClick={() => setStudyPanelOpen(previous => !previous)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      studyPanelOpen
                        ? 'border-white/10 bg-white/[0.05] text-[var(--text-primary)]'
                        : 'border-white/8 bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Brain className="mr-2 inline h-3.5 w-3.5" />
                    {studyPanelOpen ? 'Hide assistant' : 'Show assistant'}
                  </button>
                </>
              ) : null}
              {[
                { label: 'Chapters', value: `${completedModules}/${orderedModules.length}` },
                { label: 'Read', value: `${readerSurface === 'full_book' ? fullBookProgress : moduleProgress}%` },
                { label: 'ETA', value: `${estimatedReadMinutes} min` },
              ].map(item => (
                <div key={item.label} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                  <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">{item.label}</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className={`grid gap-5 ${desktopGridClass}`}>
          {leftSidebarOpen && !isMobile ? (
            <aside className="xl:sticky xl:top-[6.75rem] xl:self-start xl:max-h-[calc(100vh-8rem)]">
              <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,16,17,0.95),rgba(9,11,12,0.98))]">
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--text-muted)]">Chapters</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{orderedModules.length} sections in this workspace</p>
                  </div>
                  <button onClick={() => setLeftSidebarOpen(false)} className="rounded-full border border-white/10 p-2 text-[var(--text-secondary)] transition hover:bg-white/[0.04] hover:text-[var(--text-primary)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-b border-white/8 px-4 py-4">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">Current chapter</p>
                        <h2 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{currentModule.title}</h2>
                      </div>
                      <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                        {moduleProgress}%
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
                      {roadmapModule?.description || 'Pick a chapter to keep the assistant and reading context aligned.'}
                    </p>
                  </div>
                </div>

                <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-3">
                  {orderedModules.map((module, index) => {
                    const progress = readingProgressUtils.getModuleProgress(book.id, index)?.percentComplete || 0;
                    const isActive = index === selectedModuleIndex && readerSurface === 'module';

                    return (
                      <button
                        key={module.id}
                        onClick={() => {
                          setSelectedModuleIndex(index);
                          setReaderSurface('module');
                          setSelectedText('');
                        }}
                        className={`group w-full rounded-[20px] border px-3 py-3 text-left transition ${
                          isActive
                            ? 'border-[var(--brand)]/25 bg-[rgba(254,205,140,0.09)]'
                            : 'border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-[var(--brand)] text-black' : 'border border-white/10 text-[var(--text-secondary)]'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{module.title}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className="h-full rounded-full bg-[var(--brand)]/80 transition-all" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{progress}%</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          ) : null}

        <section className="min-w-0 space-y-4">
          {isMobile ? (
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-2">
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
                        : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)]'
                    }`}
                  >
                    {index + 1}. {module.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,14,15,0.96),rgba(8,10,11,0.98))] shadow-[0_28px_100px_rgba(0,0,0,0.34)]">
            <div className="border-b border-white/8 px-5 py-5 md:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                      {readerSurface === 'full_book' ? 'Full book review' : `Chapter ${selectedModuleIndex + 1}`}
                    </span>
                    {roadmapModule?.estimatedTime ? (
                      <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                        {roadmapModule.estimatedTime}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-[2.5rem]">
                    {readerSurface === 'full_book' ? book.title : currentModule.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
                    {readerSurface === 'full_book'
                      ? 'Use this surface for long-form revision and polish, while the assistant stays pinned to the currently selected chapter for precise help.'
                      : roadmapModule?.description || 'This chapter is now your active study surface, so questions, re-explanations, and flashcards stay grounded in the right context.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!studyPanelOpen && !isMobile ? (
                    <button onClick={() => setStudyPanelOpen(true)} className="btn btn-secondary py-2">
                      <Brain className="h-4 w-4" />
                      Open assistant
                    </button>
                  ) : null}
                  {!leftSidebarOpen && !isMobile ? (
                    <button onClick={() => setLeftSidebarOpen(true)} className="btn btn-secondary py-2">
                      <BookOpen className="h-4 w-4" />
                      Open chapters
                    </button>
                  ) : null}
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

              {roadmapModule?.objectives?.length && readerSurface === 'module' ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {roadmapModule.objectives.slice(0, 4).map(objective => (
                    <div key={objective} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                        <span>{objective}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-b border-white/8 px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 rounded-full border border-white/8 p-1" style={{ backgroundColor: currentTheme.contentBg }}>
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

                  <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">
                    <button onClick={() => setSettings(previous => ({ ...previous, fontSize: Math.max(12, previous.fontSize - 1) }))} className="rounded-full p-2 transition hover:bg-white/[0.05]" style={{ color: currentTheme.secondary }}>
                      <ZoomOut size={16} />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-mono" style={{ color: currentTheme.secondary }}>
                      {settings.fontSize}px
                    </span>
                    <button onClick={() => setSettings(previous => ({ ...previous, fontSize: Math.min(28, previous.fontSize + 1) }))} className="rounded-full p-2 transition hover:bg-white/[0.05]" style={{ color: currentTheme.secondary }}>
                      <ZoomIn size={16} />
                    </button>
                  </div>

                  <div className="relative hidden items-center group md:flex">
                    <button className="flex items-center gap-2 rounded-full border border-white/8 px-3 py-2 text-sm font-medium" style={{ backgroundColor: currentTheme.contentBg, color: currentTheme.text }}>
                      <span className="opacity-70">Font</span>
                      <span>{FONT_LABELS[settings.fontFamily]}</span>
                      <ChevronDown size={14} className="opacity-50" />
                    </button>
                    <div className="absolute left-0 top-full z-30 mt-2 hidden w-44 overflow-hidden rounded-2xl border border-white/10 shadow-xl group-hover:block" style={{ backgroundColor: currentTheme.contentBg }}>
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

                <SurfaceToggle value={readerSurface} onChange={setReaderSurface} />
              </div>
            </div>

            <div className="px-5 py-6 md:px-7">
              {readerSurface === 'full_book' && isEditing ? (
                <textarea
                  className="w-full rounded-[28px] border border-white/10 bg-black/20 p-5 font-mono text-sm leading-relaxed text-[var(--text-primary)] outline-none"
                  value={editedContent}
                  onChange={event => onContentChange(event.target.value)}
                  style={{ minHeight: '70vh', fontSize: `${settings.fontSize - 2}px` }}
                />
              ) : (
                <div ref={contentRef} className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-4 py-5 md:px-7 md:py-7">
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
            </div>
          </div>
        </section>

        {studyPanelOpen && !isMobile ? <section className="xl:sticky xl:top-[6.75rem] xl:h-[calc(100vh-8rem)] xl:self-start">{renderStudyPanel()}</section> : null}
      </div>

      {!studyPanelOpen || isMobile ? (
        <button
          onClick={() => setStudyPanelOpen(true)}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full border border-[var(--brand)]/20 bg-[linear-gradient(135deg,rgba(254,205,140,0.95),rgba(254,205,140,0.78))] px-4 py-3 text-sm font-semibold text-black shadow-[0_20px_50px_rgba(0,0,0,0.34)] transition hover:translate-y-[-1px]"
        >
          <Brain className="h-4 w-4" />
          Open assistant
        </button>
      ) : null}

      <AnimatePresence>
        {isMobile && studyPanelOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
              className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-hidden rounded-t-[32px] bg-[var(--bg-elevated)] p-3"
            >
              {renderStudyPanel()}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
    </div>
  );
}
