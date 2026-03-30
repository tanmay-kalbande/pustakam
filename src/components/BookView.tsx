// src/components/BookView.tsx
import React, { useEffect, ReactNode, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Book, Download, Trash2, Clock, CheckCircle, AlertCircle, Loader2,
  Brain, Sparkles, BarChart3, ListChecks, Play, Box, ArrowLeft, Check,
  BookText, RefreshCw, Edit, Save, X, FileText, List, Settings, Moon,
  ZoomIn, ZoomOut, BookOpen, BookmarkCheck, Copy, AlertTriangle,
  CheckCircle2, Pause, Zap, Sun, Palette, Bookmark, ChevronDown,
  Search, Code, Music, Heart, Cpu, TrendingUp, Eye, Coins, Utensils,
  MessageCircle, Users, GraduationCap, Atom, Target, Briefcase, Crown,
} from 'lucide-react';
import { APISettings, ModelProvider } from '../types';
import { BookProject, BookSession, ReadingBookmark } from '../types/book';
import { bookService } from '../services/bookService';
import { BookAnalytics } from './BookAnalytics';
import { CustomSelect } from './CustomSelect';
import { pdfService } from '../services/pdfService';
import { readingProgressUtils } from '../utils/readingProgress';
import { ZHIPU_PROVIDER, DEFAULT_ZHIPU_MODEL } from '../constants/ai';

// ============================================================================
// TYPES
// ============================================================================
type AppView = 'list' | 'create' | 'detail';

interface GenerationStatus {
  currentModule?: { id: string; title: string; attempt: number; progress: number; generatedText?: string; };
  totalProgress: number;
  status: 'idle' | 'generating' | 'completed' | 'error' | 'paused' | 'waiting_retry';
  logMessage?: string;
  totalWordsGenerated?: number;
  aiStage?: 'analyzing' | 'writing' | 'examples' | 'polishing' | 'complete';
  retryInfo?: { moduleTitle: string; error: string; retryCount: number; maxRetries: number; waitTime?: number; };
}

interface GenerationStats {
  startTime: Date;
  totalModules: number;
  completedModules: number;
  failedModules: number;
  averageTimePerModule: number;
  estimatedTimeRemaining: number;
  totalWordsGenerated: number;
  wordsPerMinute: number;
}

interface BookViewProps {
  books: BookProject[];
  currentBookId: string | null;
  onCreateBookRoadmap: (session: BookSession) => Promise<void>;
  onGenerateAllModules: (book: BookProject, session: BookSession) => Promise<void>;
  onRetryFailedModules: (book: BookProject, session: BookSession) => Promise<void>;
  onAssembleBook: (book: BookProject, session: BookSession) => Promise<void>;
  onSelectBook: (id: string | null) => void;
  onDeleteBook: (id: string) => void;
  onUpdateBookStatus: (id: string, status: BookProject['status']) => void;
  hasApiKey: boolean;
  view: AppView;
  setView: React.Dispatch<React.SetStateAction<AppView>>;
  onUpdateBookContent: (bookId: string, newContent: string) => void;
  showListInMain: boolean;
  setShowListInMain: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile?: boolean;
  generationStatus?: GenerationStatus;
  generationStats?: GenerationStats;
  onPauseGeneration?: (bookId: string) => void;
  onResumeGeneration?: (book: BookProject, session: BookSession) => void;
  isGenerating?: boolean;
  onRetryDecision?: (decision: 'retry' | 'switch' | 'skip') => void;
  availableModels?: Array<{ provider: string; model: string; name: string }>;
  theme: 'light' | 'dark';
  onOpenSettings: () => void;
  showAlertDialog: (props: {
    type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onReadingModeChange?: (isReading: boolean) => void;
  settings: APISettings;
  onModelChange: (model: string, provider: ModelProvider) => void;
}

interface ReadingModeProps {
  content: string;
  isEditing: boolean;
  editedContent: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onContentChange: (content: string) => void;
  onGoBack: () => void;
  theme: 'light' | 'dark';
  bookId: string;
  currentModuleIndex: number;
}

interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'nunito' | 'mono' | 'crimson' | 'rubik';
  theme: 'dark' | 'sepia' | 'light';
  maxWidth: 'narrow' | 'medium' | 'wide';
  textAlign: 'left' | 'justify';
}

// ============================================================================
// CONSTANTS
// ============================================================================
const THEMES = {
  dark:  { bg: 'rgba(5, 5, 5, 0.4)', contentBg: 'var(--bg-surface)', text: 'var(--text-primary)', secondary: 'var(--text-secondary)', border: 'var(--border-subtle)', accent: 'var(--brand)' },
  sepia: { bg: '#F5F1E8', contentBg: '#FAF7F0', text: '#3C2A1E', secondary: '#8B7355', border: '#D4C4A8', accent: '#B45309' },
  light: { bg: '#FFFFFF', contentBg: '#F9F9F9', text: '#1A1A1A', secondary: '#555555', border: '#E0E0E0', accent: '#3B82F6' },
};
/* Note: Sepia and Light themes are kept for Reading Mode specifically as per standard patterns */
const FONT_FAMILIES = {
  mono:   'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", monospace',
  nunito: "'Nunito', 'Segoe UI', sans-serif",
  crimson: "'Crimson Pro', serif",
  rubik:  "'Outfit', sans-serif",
};
const FONT_LABELS = { rubik: 'Rubik', nunito: 'Smooth', crimson: 'Book', mono: 'Code' };
const MAX_WIDTHS  = { narrow: '65ch', medium: '75ch', wide: '85ch' };

// ============================================================================
// UTILS
// ============================================================================
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 1) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const getContextualIcon = (title: string): React.ElementType => {
  const t = title.toLowerCase();
  if (t.includes('code') || t.includes('program') || t.includes('software')) return Code;
  if (t.includes('ai') || t.includes('machine') || t.includes('neural'))    return Brain;
  if (t.includes('data') || t.includes('analytics'))                          return TrendingUp;
  if (t.includes('music') || t.includes('song'))                              return Music;
  if (t.includes('art') || t.includes('design'))                              return Palette;
  if (t.includes('health') || t.includes('fitness'))                          return Heart;
  if (t.includes('money') || t.includes('finance'))                           return Coins;
  if (t.includes('food') || t.includes('nutrition'))                          return Utensils;
  if (t.includes('leader') || t.includes('team'))                             return Users;
  if (t.includes('learn') || t.includes('study'))                             return GraduationCap;
  if (t.includes('science') || t.includes('physics'))                         return Atom;
  if (t.includes('habit') || t.includes('goal'))                              return Target;
  if (t.includes('career') || t.includes('job'))                              return Briefcase;
  return Sparkles;
};

const getBookCoverTone = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('finance') || t.includes('money'))  return 'bg-emerald-950/60';
  if (t.includes('ai') || t.includes('code') || t.includes('machine') || t.includes('learn')) return 'bg-zinc-900/80';
  if (t.includes('health') || t.includes('fitness')) return 'bg-rose-950/50';
  if (t.includes('science') || t.includes('physics')) return 'bg-blue-950/50';
  if (t.includes('business') || t.includes('career')) return 'bg-amber-950/50';
  return 'bg-zinc-900/70';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const GradientProgressBar = ({ progress = 0, active = true }: { progress?: number; active?: boolean }) => (
  <div className="relative w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
    <div
      className="absolute inset-0 bg-[var(--brand)] transition-all duration-700 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
);

const StatusLoader = () => (
  <div className="status-loader">
    {Array.from({ length: 9 }).map((_, i) => <div key={i} className="status-loader-dot" />)}
  </div>
);

const HighDemandNotice = ({ compact = false }: { compact?: boolean }) => (
  <div className={`relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 ${compact ? 'p-4' : 'p-5'} shadow-[0_0_30px_rgba(245,158,11,0.1)]`}>
    <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
    <div className={`flex items-start ${compact ? 'gap-3' : 'gap-4'} relative z-10`}>
      <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} shrink-0 flex items-center justify-center bg-amber-500/20 rounded-full border border-amber-500/30 shadow-inner`}>
        <Zap className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-amber-500`} />
      </div>
      <div>
        <h4 className={`${compact ? 'text-[13px]' : 'text-[15px]'} font-bold text-amber-500 mb-1 leading-tight tracking-tight`}>Experiencing High Demand</h4>
        <p className={`${compact ? 'text-[12px]' : 'text-[13px]'} text-amber-500/80 leading-relaxed font-medium`}>
          Our AI servers are currently processing a large number of requests. We're actively scaling our infrastructure to provide a seamless experience. Feel free to retry!
        </p>
      </div>
    </div>
  </div>
);

const AIWaveAnimation = () => {
  return (
    <div className="w-full h-1 mt-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
      <div className="h-full w-full origin-left bg-[var(--brand)]/20 animate-pulse" />
    </div>
  );
};

const RetryDecisionPanel = ({
  retryInfo, onRetry, onSwitchModel, onSkip, availableModels,
}: {
  retryInfo: { moduleTitle: string; error: string; retryCount: number; maxRetries: number; waitTime?: number; };
  onRetry: () => void;
  onSwitchModel: () => void;
  onSkip: () => void;
  availableModels: Array<{ provider: string; model: string; name: string }>;
}) => {
  const [countdown, setCountdown] = useState(Math.ceil((retryInfo.waitTime || 0) / 1000));

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  return (
    <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-lg overflow-hidden animate-fade-in-up">
      <div className="p-6">
        <div className="mb-6">
          <HighDemandNotice />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-lg border border-red-500/30">
            <AlertCircle className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Generation Failed</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">Attempt {retryInfo.retryCount} of {retryInfo.maxRetries}</p>
          </div>
        </div>
        <div className="mb-4 p-4 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-md">
          <h4 className="font-medium text-[var(--text-primary)] mb-2">{retryInfo.moduleTitle}</h4>
          <p className="text-sm text-[var(--text-secondary)]"><span className="text-red-400 font-medium">Error:</span> {retryInfo.error}</p>
        </div>
        <div className="space-y-2">
          <button
            onClick={onRetry}
            disabled={countdown > 0}
            className="w-full btn btn-primary py-2.5"
          >
            <RefreshCw className="w-4 h-4" />
            {countdown > 0 ? `Retry in ${countdown}s` : 'Retry Same Model'}
          </button>
          {availableModels.length > 0 && (
            <button onClick={onSwitchModel} className="w-full btn btn-secondary py-2.5">
              <Settings className="w-4 h-4" /> Switch AI Model
            </button>
          )}
          <button onClick={onSkip} className="w-full btn btn-ghost py-2.5 hover:text-red-400">
            <X className="w-4 h-4" /> Skip This Module
          </button>
        </div>
      </div>
    </div>
  );
};

const EmbeddedProgressPanel = ({
  generationStatus, stats, onCancel, onPause, onResume, onRetryDecision, availableModels, bookTitle,
}: {
  generationStatus: GenerationStatus;
  stats: GenerationStats;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetryDecision?: (decision: 'retry' | 'switch' | 'skip') => void;
  availableModels?: Array<{ provider: string; model: string; name: string }>;
  bookTitle?: string;
}) => {
  const ContextIcon    = bookTitle ? getContextualIcon(bookTitle) : Sparkles;
  const streamBoxRef   = useRef<HTMLDivElement>(null);
  const isPaused       = generationStatus.status === 'paused';
  const isGenerating   = generationStatus.status === 'generating';
  const isWaitingRetry = generationStatus.status === 'waiting_retry';
  const overallProgress = (stats.completedModules / (stats.totalModules || 1)) * 100;

  useEffect(() => {
    if (streamBoxRef.current && generationStatus.currentModule?.generatedText) {
      streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
    }
  }, [generationStatus.currentModule?.generatedText]);

  if (isWaitingRetry && generationStatus.retryInfo && onRetryDecision) {
    return (
      <RetryDecisionPanel
        retryInfo={generationStatus.retryInfo}
        onRetry={() => onRetryDecision('retry')}
        onSwitchModel={() => onRetryDecision('switch')}
        onSkip={() => onRetryDecision('skip')}
        availableModels={availableModels || []}
      />
    );
  }

  return (
    <div className={`overflow-hidden rounded-md border animate-fade-in-up ${isPaused ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)]' : 'border-[var(--border-default)] bg-[var(--bg-surface)]'}`}>
      <div className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            {isPaused ? (
              <Pause className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ContextIcon className="w-4 h-4 text-[var(--text-muted)]" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] md:text-xl">
                {isPaused ? 'Generation Paused' : 'Generating Chapters…'}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">{stats.completedModules} of {stats.totalModules} complete</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)]">
            <span>{Math.round(overallProgress)}%</span>
            <span>{stats.totalWordsGenerated.toLocaleString()} words</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="h-1 w-full bg-[var(--border-subtle)] overflow-hidden rounded-full">
            <div 
              className="h-full bg-[var(--brand)] transition-all duration-700" 
              style={{ width: `${overallProgress}%` }} 
            />
          </div>
        </div>

        {isGenerating && generationStatus.currentModule && (
          <div className="mb-6 pt-5 border-t border-[var(--border-subtle)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Writing</p>
                <p className="mt-1 font-medium text-[var(--text-primary)]">{generationStatus.currentModule.title}</p>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                #{generationStatus.currentModule.attempt}
              </span>
            </div>
            
            <AIWaveAnimation />

            {generationStatus.currentModule.generatedText && (
              <div
                ref={streamBoxRef}
                className="mt-3 max-h-[80px] overflow-hidden font-mono text-xs leading-relaxed text-[var(--text-secondary)] opacity-60"
              >
                {generationStatus.currentModule.generatedText}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-[var(--color-border)] pt-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">{isPaused ? `${stats.completedModules} of ${stats.totalModules} saved` : `~${formatTime(stats.estimatedTimeRemaining)} left`}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(isGenerating || isPaused) && onCancel && (
                <button onClick={onCancel} className="btn btn-secondary px-3 py-1.5 hover:text-red-400">
                  <X className="w-4 h-4" /> Cancel
                </button>
              )}
              {isPaused && onResume && (
                <button onClick={onResume} className="btn btn-primary px-4 py-2">
                  <Play className="w-4 h-4" /> Resume
                </button>
              )}
              {isGenerating && onPause && (
                <button onClick={onPause} className="btn btn-secondary px-4 py-2">
                  <Pause className="w-4 h-4" /> Pause
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CodeBlock = React.memo(({ children, className, theme, readingTheme }: {
  children: ReactNode; className?: string; theme: 'light' | 'dark'; readingTheme?: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const language = className?.replace(/language-/, '') || 'text';

  const handleCopy = () => {
    if (isCopied) return;
    navigator.clipboard.writeText(String(children)).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const themeMap: Record<string, { containerBg: string; headerBg: string; headerText: string; }> = {
    dark:  { containerBg: '#0D1117', headerBg: 'rgba(22,27,34,0.7)',   headerText: '#8B949E' },
    sepia: { containerBg: '#F0EAD6', headerBg: 'rgba(232,225,209,0.7)', headerText: '#8B7355' },
    light: { containerBg: '#f8f8f8', headerBg: 'rgba(239,239,239,0.7)', headerText: '#555555' },
  };
  const ts = themeMap[readingTheme as string] || themeMap.dark;

  return (
    <div className="relative rounded-lg my-4 overflow-hidden" style={{ backgroundColor: ts.containerBg }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: ts.headerBg, color: ts.headerText }}>
        <span className="text-xs font-semibold uppercase tracking-wider">{language}</span>
        <button onClick={handleCopy} className={`flex items-center gap-1.5 p-1.5 rounded-md text-xs transition-all ${isCopied ? 'text-green-400' : ''}`}>
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          {isCopied ? 'Copied!' : 'Copy'}
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

const ReadingMode: React.FC<ReadingModeProps> = ({
  content, isEditing, editedContent, onEdit, onSave, onCancel, onContentChange,
  onGoBack, theme, bookId, currentModuleIndex,
}) => {
  const contentRef  = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem('pustakam-reading-settings');
    return {
      fontSize: 18, lineHeight: 1.8, fontFamily: 'nunito',
      theme: theme === 'dark' ? 'dark' : 'light',
      maxWidth: 'medium', textAlign: 'left',
      ...(saved ? JSON.parse(saved) : {}),
    };
  });
  const [isBookmarked,       setIsBookmarked]       = useState(false);
  const [showFloatingButtons, setShowFloatingButtons] = useState(false);
  const [bookmark,            setBookmark]            = useState<ReadingBookmark | null>(null);

  const getScrollEl = () => document.getElementById('main-scroll-area') || document.documentElement;

  useEffect(() => {
    const bm = readingProgressUtils.getBookmark(bookId);
    setBookmark(bm);
    setIsBookmarked(!!bm && bm.moduleIndex === currentModuleIndex);
  }, [bookId, currentModuleIndex]);

  useEffect(() => {
    setShowFloatingButtons(!isEditing);
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;
    const el = document.getElementById('main-scroll-area') || window;
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const pos = getScrollEl().scrollTop;
        if (pos > 100) readingProgressUtils.saveBookmark(bookId, currentModuleIndex, pos);
      }, 500);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); el.removeEventListener('scroll', onScroll); };
  }, [bookId, currentModuleIndex, isEditing]);

  useEffect(() => { localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings)); }, [settings]);

  const toggleBookmark = () => {
    if (isBookmarked) {
      readingProgressUtils.deleteBookmark(bookId);
      setIsBookmarked(false);
      setBookmark(null);
    } else {
      const pos = getScrollEl().scrollTop;
      readingProgressUtils.saveBookmark(bookId, currentModuleIndex, pos);
      setBookmark(readingProgressUtils.getBookmark(bookId));
      setIsBookmarked(true);
    }
  };

  const handleGoToBookmark = () => {
    if (bookmark) getScrollEl().scrollTo({ top: bookmark.scrollPosition, behavior: 'smooth' });
  };

  const currentTheme = THEMES[settings.theme];

  if (isEditing) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-[rgba(5,5,5,0.5)] backdrop-blur-xl z-30 pt-4 pb-2 border-b border-[var(--border-subtle)]">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
            <Edit className="w-4 h-4" /> Editing Mode
          </h3>
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn btn-secondary px-3 py-1.5"><X size={14} /> Cancel</button>
            <button onClick={onSave} className="btn btn-primary px-3 py-1.5"><Save size={14} /> Save</button>
          </div>
        </div>
        <textarea
          className="w-full h-[70vh] glass-input rounded-md p-4 text-[var(--text-primary)] font-mono text-sm leading-relaxed resize-none focus:outline-none transition-all"
          value={editedContent}
          onChange={e => onContentChange(e.target.value)}
          style={{ fontSize: `${settings.fontSize - 2}px` }}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={`reading-container theme-${settings.theme} min-h-[calc(100vh-120px)] overflow-hidden rounded-lg border border-[var(--border-subtle)] shadow-2xl transition-colors duration-300`}
        style={{ backgroundColor: currentTheme.bg, color: currentTheme.text, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Toolbar */}
        <div className="z-20 flex flex-wrap justify-between items-center px-3 py-2 sm:px-4 border-b border-[var(--border-subtle)]" style={{ backgroundColor: currentTheme.bg }}>
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
            <div className="flex items-center gap-0.5 p-0.5 sm:p-1 rounded-md" style={{ backgroundColor: currentTheme.contentBg }}>
              {(['light', 'sepia', 'dark'] as const).map(t => (
                <button key={t} onClick={() => setSettings(p => ({ ...p, theme: t }))} className="p-1.5 sm:p-2 rounded-md transition-all"
                  style={{ backgroundColor: settings.theme === t ? currentTheme.accent : 'transparent', color: settings.theme === t ? '#FFF' : currentTheme.secondary }}>
                  {t === 'light' ? <Sun size={14} /> : t === 'sepia' ? <Palette size={14} /> : <Moon size={14} />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 ml-2">
              <button onClick={() => setSettings(p => ({ ...p, fontSize: Math.max(12, p.fontSize - 1) }))} className="p-1.5 sm:p-2 rounded-lg hover:bg-black/5" style={{ color: currentTheme.secondary }}>
                <ZoomOut size={16} />
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-mono" style={{ color: currentTheme.secondary }}>{settings.fontSize}px</span>
              <button onClick={() => setSettings(p => ({ ...p, fontSize: Math.min(28, p.fontSize + 1) }))} className="p-1.5 sm:p-2 rounded-lg hover:bg-black/5" style={{ color: currentTheme.secondary }}>
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <div className="relative group hidden md:flex items-center ml-4">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={{ backgroundColor: currentTheme.contentBg, color: currentTheme.text, borderColor: currentTheme.border }}>
              <span className="opacity-70">Font:</span>
              <span>{FONT_LABELS[settings.fontFamily]}</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-xl border overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
              style={{ backgroundColor: currentTheme.contentBg, borderColor: currentTheme.border }}>
              {(['rubik', 'nunito', 'crimson', 'mono'] as const).map(f => (
                <button key={f} onClick={() => setSettings(p => ({ ...p, fontFamily: f }))}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:brightness-95"
                  style={{ fontFamily: FONT_FAMILIES[f], color: settings.fontFamily === f ? currentTheme.accent : currentTheme.text, backgroundColor: settings.fontFamily === f ? `${currentTheme.accent}15` : 'transparent' }}>
                  <span>{FONT_LABELS[f]}</span>
                  {settings.fontFamily === f && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {bookmark && (
              <button onClick={handleGoToBookmark} className="btn btn-secondary btn-sm flex items-center gap-1 sm:gap-2"
                style={{ borderColor: currentTheme.border, color: currentTheme.secondary }}>
                <Bookmark size={14} />
                <span className="hidden md:flex">Go to Bookmark</span>
              </button>
            )}
            <button onClick={onEdit} className="btn btn-secondary btn-sm flex items-center gap-1 sm:gap-2"
              style={{ borderColor: currentTheme.border, color: currentTheme.secondary }}>
              <Edit size={14} /> <span className="hidden md:flex">Edit</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="p-4 sm:p-8">
          <article
            className={`prose prose-lg max-w-none transition-all duration-300 mx-auto ${settings.theme !== 'light' ? 'prose-invert' : ''}`}
            style={{ fontFamily: FONT_FAMILIES[settings.fontFamily], fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight, maxWidth: MAX_WIDTHS[settings.maxWidth], textAlign: settings.textAlign as any, color: currentTheme.text }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ className, children, ...props }) => {
                  if (!className?.includes('language-')) return <code className={className} {...props}>{children}</code>;
                  return <CodeBlock {...props} theme={theme} readingTheme={settings.theme} className={className}>{children}</CodeBlock>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </div>

      <div className={`reading-back-btn transition-all duration-300 ${showFloatingButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button onClick={onGoBack} className="reading-floating-btn" title="Back to Library">
          <ArrowLeft size={18} />
          <span className="tooltip">Back</span>
        </button>
      </div>

      <div className={`reading-floating-controls transition-all duration-300 ${showFloatingButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button onClick={toggleBookmark} className={`reading-floating-btn ${isBookmarked ? 'bookmark-active' : ''}`}>
          {isBookmarked ? <BookmarkCheck size={18} className="bookmark-check-icon" /> : <Bookmark size={18} />}
          <span className="tooltip">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
        </button>
      </div>
    </>
  );
};

const DetailTabButton = ({ label, Icon, isActive, onClick }: { label: ReactNode; Icon: React.ElementType; isActive: boolean; onClick: () => void; }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${isActive
      ? 'border-[var(--brand)]/20 bg-[var(--brand)]/10 text-[var(--text-primary)]'
      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'}`}
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

// ============================================================================
// HOME VIEW  (original design, robustness-hardened)
// ============================================================================
const HomeView = ({
  onNewBook,
  onShowList,
  hasApiKey,
  bookCount,
  theme,
  formData,
  setFormData,
  showAdvanced,
  setShowAdvanced,
  handleCreateRoadmap,
  handleEnhanceWithAI,
  isEnhancing,
  enhanceError,
  localIsGenerating,
  onOpenSettings,
  settings,
  onModelChange,
}: {
  onNewBook: () => void;
  onShowList: () => void;
  hasApiKey: boolean;
  bookCount: number;
  theme: 'light' | 'dark';
  formData: BookSession;
  setFormData: React.Dispatch<React.SetStateAction<BookSession>>;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  handleCreateRoadmap: (data: BookSession) => void;
  handleEnhanceWithAI: () => void;
  isEnhancing: boolean;
  enhanceError: string | null;
  setIsEnhancing: (val: boolean) => void;
  localIsGenerating: boolean;
  onOpenSettings: () => void;
  settings: APISettings;
  onModelChange: (model: string, provider: ModelProvider) => void;
}) => {
  const canGenerate = !!(formData.goal.trim() && !localIsGenerating);

  return (
    <div
      className="relative flex-1 flex flex-col items-center px-6 w-full min-h-[90vh] overflow-y-auto"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(255,255,255,0.02),transparent_70%)] -z-10" />
      
      {/* Spacer for smooth vertical centering transition */}
      <div 
        className="w-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]" 
        style={{ height: showAdvanced ? '8rem' : '22vh' }}
      />

      <div className="w-full max-w-2xl mx-auto animate-subtle-fade relative z-10 shrink-0 pb-32">
        {/* Badge + logo + headline */}
        <div className="mb-10 text-center flex flex-col items-center">
          <div className="w-11 h-11 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shadow-lg mb-6">
            <Sparkles size={20} className="text-[var(--brand)] opacity-80" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight leading-[1.1]">
            Build Better<br />
            <span className="text-[var(--text-secondary)]">Learning Books</span>
          </h1>
        </div>



        {/* Input bar */}
        <div className="relative flex items-center w-full glass-input shadow-2xl rounded-full p-1.5 pl-6 transition-all duration-300">
          <textarea
            value={formData.goal}
            onChange={e => {
              setFormData(p => ({ ...p, goal: e.target.value }));
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey && canGenerate) {
                e.preventDefault();
                setIsEnhancing(true);
                try {
                  const enhanced = await bookService.enhanceBookInput(formData.goal, formData.generationMode);
                  const updatedData = {
                    ...formData,
                    goal: enhanced.goal,
                    targetAudience: enhanced.targetAudience,
                    complexityLevel: enhanced.complexityLevel,
                    reasoning: enhanced.reasoning || '',
                    preferences: enhanced.preferences,
                  };
                  setFormData(updatedData);
                  // Wait a tiny bit for state to propagate
                  setTimeout(() => {
                    handleCreateRoadmap(updatedData);
                  }, 100);
                } catch (err) {
                  handleCreateRoadmap(formData);
                } finally {
                  setIsEnhancing(false);
                }
              }
            }}
            placeholder="Describe the book you want to create..."
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] text-base resize-none pt-2.5 pb-2"
            rows={1}
            style={{ minHeight: '28px', maxHeight: '200px' }}
          />
          <button
            onClick={() => { if (!showAdvanced) setShowAdvanced(true); handleEnhanceWithAI(); }}
            disabled={!formData.goal.trim() || isEnhancing}
            className="shrink-0 btn btn-primary h-9 px-4 rounded-full text-xs"
            title="Enhance prompt with AI"
          >
            {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isEnhancing ? 'Refining' : 'Enhance'}</span>
          </button>
        </div>

        {enhanceError && (
          <div className="mt-4 max-w-[620px] mx-auto animate-fade-in-up">
            <HighDemandNotice compact />
          </div>
        )}

        {/* Action chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 max-w-[620px] mx-auto">
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn btn-secondary px-4 py-1.5 rounded-full text-xs">
            <List size={14} /> Options
            <ChevronDown size={12} className={`transition-transform opacity-50 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          {bookCount > 0 && (
            <button onClick={onShowList} className="btn btn-secondary px-4 py-1.5 rounded-full text-xs">
              <BookOpen size={14} /> My Library <span className="opacity-40">({bookCount})</span>
            </button>
          )}
        </div>

        {/* Advanced options */}
        {showAdvanced && (
          <div
            className="mt-6 p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-xl"
            style={{ animation: 'dropdownSlideIn 0.2s cubic-bezier(0.16,1,0.3,1)', transformOrigin: 'top center' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] uppercase tracking-wider">Target Audience</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={e => setFormData(p => ({ ...p, targetAudience: e.target.value }))}
                  placeholder="Beginners, Professionals..."
                  className="w-full h-10 glass-input rounded-md px-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] uppercase tracking-wider">Complexity Level</label>
                <CustomSelect
                  value={formData.complexityLevel || 'intermediate'}
                  onChange={val => setFormData(p => ({ ...p, complexityLevel: val as any }))}
                  options={[
                    { value: 'beginner',     label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced',     label: 'Advanced' },
                  ]}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] uppercase tracking-wider">Context & Goals (Optional)</label>
              <textarea
                value={formData.reasoning}
                onChange={e => setFormData(p => ({ ...p, reasoning: e.target.value }))}
                placeholder="What should the reader achieve?"
                className="w-full glass-input rounded-md p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none transition-all"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-[var(--border-subtle)]">
              <div>
                <label className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] uppercase tracking-wider">Generation Mode</label>
                <div className="relative flex p-1 bg-white/5 border border-white/10 rounded-full h-10 overflow-hidden">
                  {[
                    { value: 'stellar',   label: 'Stellar', icon: Sparkles },
                    { value: 'blackhole', label: 'Street',  icon: Crown },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData((p: BookSession) => ({
                        ...p,
                        generationMode: value as any,
                        language: value === 'stellar' ? 'en' : p.language,
                      }))}
                      className={`relative z-10 flex-1 flex items-center justify-center gap-2 rounded-full text-[10px] font-bold transition-colors duration-200 ${
                        formData.generationMode === value
                          ? 'text-white'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {formData.generationMode === value && (
                        <motion.div
                          layoutId="activeMode"
                          className="absolute inset-0 rounded-full border border-white/5 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon size={14} className="relative z-10" />
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] uppercase tracking-wider">Output Language</label>
                <CustomSelect
                  value={formData.language || 'en'}
                  onChange={val => setFormData((p: BookSession) => ({ ...p, language: val as any }))}
                  options={[
                    { value: 'en', label: 'English (Standard)' },
                    ...(formData.generationMode === 'blackhole' ? [
                      { value: 'hi', label: 'Hindi (Tapori)' },
                      { value: 'mr', label: 'Marathi (Tapori)' },
                    ] : []),
                  ]}
                />
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => canGenerate ? handleCreateRoadmap(formData) : onOpenSettings()}
                disabled={!formData.goal.trim() || localIsGenerating}
                className="w-full h-12 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hover)] hover:brightness-110 active:scale-[0.98] text-black font-black uppercase tracking-[0.15em] text-xs rounded-xl shadow-[0_4px_20px_rgba(254,205,140,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {localIsGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating Roadmap…</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Book Roadmap</>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


// ============================================================================
// BOOK LIST GRID
// ============================================================================
const BookListGrid = ({
  books, onSelectBook, onDeleteBook, setView, setShowListInMain,
}: {
  books: BookProject[];
  onSelectBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  setView: (view: AppView) => void;
  setShowListInMain: (show: boolean) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getBookIcon = (title: string): React.ElementType => {
    const t = title.toLowerCase();
    if (t.includes('ai') || t.includes('intelligence') || t.includes('machine')) return Brain;
    if (t.includes('code') || t.includes('program') || t.includes('dev'))        return Code;
    if (t.includes('music') || t.includes('song'))                                return Music;
    if (t.includes('health') || t.includes('fitness'))                            return Heart;
    if (t.includes('money') || t.includes('finance'))                             return TrendingUp;
    return Book;
  };

  const filtered = books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-full flex flex-col bg-[var(--bg-base)] pt-16">
      <div className="flex-shrink-0 w-full sticky top-16 z-40 bg-[var(--bg-base)]/80 pb-3 pt-1 px-8 lg:px-12 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Your Bookshelf</h2>
              <p className="text-sm text-[var(--text-secondary)]">{books.length} {books.length === 1 ? 'project' : 'projects'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="text" placeholder="Search books..." value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-52 rounded-full glass-input pl-10 pr-4 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:w-60 focus:outline-none" />
            </div>
            <button onClick={() => setShowListInMain(false)} className="btn btn-secondary px-4 py-1.5 rounded-full text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1400px] mx-auto px-8 lg:px-12 pt-6 pb-10">
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] border-dashed">
              <div className="w-14 h-14 mx-auto mb-5 bg-[var(--bg-base)] rounded-full flex items-center justify-center border border-[var(--border-subtle)]">
                <BookOpen className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{searchQuery ? 'No books found' : 'Empty Bookshelf'}</h3>
              <p className="text-[var(--text-secondary)] mb-6 max-w-xs mx-auto text-sm">
                {searchQuery ? 'Try adjusting your search terms.' : 'Create your first professional learning book in minutes.'}
              </p>
              {!searchQuery && (
                <button onClick={() => { setView('create'); setShowListInMain(false); }}
                  className="btn btn-primary px-6 rounded-full text-sm">
                  <Sparkles size={16} /> Create Book
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(book => {
                const wordCount = book.modules.reduce((a, m) => a + (m.wordCount || 0), 0) || book.totalWords || 0;
                const Icon = getBookIcon(book.title);
                return (
                  <div key={book.id} onClick={() => onSelectBook(book.id)}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 transition-all duration-200 hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)] hover:-translate-y-0.5">
                    <div className="flex items-center gap-3">
                      <div className={`relative h-20 w-[52px] shrink-0 overflow-hidden rounded border border-[var(--border-subtle)] ${getBookCoverTone(book.title)} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white/40" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-sm font-semibold leading-tight text-[var(--text-primary)]">{book.title}</h3>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-[var(--text-secondary)]">
                              <span className="inline-flex items-center gap-1.5 uppercase tracking-wider"><Clock size={10} />{new Date(book.createdAt).toLocaleDateString()}</span>
                              {wordCount > 0 && <span className="inline-flex items-center gap-1.5 uppercase tracking-wider"><Sparkles size={10} />{wordCount.toLocaleString()} wds</span>}
                            </div>
                          </div>
                          <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteBook(book.id); }}
                            className="rounded-full p-2 text-[var(--text-muted)] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function BookView({
  books, currentBookId, onCreateBookRoadmap, onGenerateAllModules, onRetryFailedModules,
  onAssembleBook, onSelectBook, onDeleteBook, onUpdateBookStatus, hasApiKey, view, setView,
  onUpdateBookContent, showListInMain, setShowListInMain, isMobile = false,
  generationStatus, generationStats, onPauseGeneration, onResumeGeneration,
  isGenerating, onRetryDecision, availableModels, theme, onOpenSettings,
  showAlertDialog, showToast, onReadingModeChange, settings, onModelChange
}: BookViewProps) {
  const [detailTab, setDetailTab] = useState<'overview' | 'analytics' | 'read'>('overview');
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookSession>({
    goal: '',
    language: settings?.defaultLanguage || 'en',
    targetAudience: '',
    complexityLevel: 'intermediate',
    reasoning: '',
    generationMode: settings?.defaultGenerationMode || 'stellar',
    preferences: { includeExamples: true, includePracticalExercises: false, includeQuizzes: false },
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [pdfProgress, setPdfProgress] = useState(0);

  const currentBook = currentBookId ? books.find(b => b.id === currentBookId) : null;

  useEffect(() => {
    setFormData((prev: BookSession) => ({
      ...prev,
      generationMode: settings?.defaultGenerationMode || 'stellar',
      language: settings?.defaultLanguage || 'en',
    }));
  }, [settings?.defaultGenerationMode, settings?.defaultLanguage]);

  useEffect(() => {
    if (currentBook) {
      setLocalIsGenerating(['generating_roadmap', 'generating_content', 'assembling'].includes(currentBook.status));
      setIsEditing(false);
      if (currentBook.status === 'completed') {
        const bm = readingProgressUtils.getBookmark(currentBook.id);
        setDetailTab(bm ? 'read' : 'overview');
      } else {
        setDetailTab('overview');
      }
    } else {
      setDetailTab('overview');
    }
  }, [currentBook]);

  useEffect(() => {
    if (onReadingModeChange) onReadingModeChange(detailTab === 'read' && view === 'detail' && !!currentBook);
  }, [detailTab, view, currentBook, onReadingModeChange]);

  useEffect(() => {
    return () => { if (currentBookId) bookService.cancelActiveRequests(currentBookId); };
  }, [currentBookId]);

  const handleEnhanceWithAI = async () => {
    if (!formData.goal.trim()) return;

    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const enhanced = await bookService.enhanceBookInput(formData.goal, formData.generationMode);
      setFormData({
        goal: enhanced.goal,
        language: 'en',
        targetAudience: enhanced.targetAudience,
        complexityLevel: enhanced.complexityLevel,
        reasoning: enhanced.reasoning || '',
        generationMode: formData.generationMode,
        preferences: enhanced.preferences,
      });
      showToast('Idea refined! ✨ Review and adjust as needed.', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Refinement failed';
      setEnhanceError(msg);
      showToast(msg, 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGoBackToLibrary = () => {
    setView('list');
    onSelectBook(null);
    setShowListInMain(true);
  };

  const handleCreateRoadmap = async (session: BookSession) => {
    if (!session.goal.trim()) { showToast('Please enter a learning goal.', 'warning'); return; }

    await onCreateBookRoadmap(session);
    setFormData({ goal: '', language: 'en', targetAudience: '', complexityLevel: 'intermediate', reasoning: '', generationMode: 'stellar', preferences: { includeExamples: true, includePracticalExercises: false, includeQuizzes: false } });
    setShowAdvanced(false);
  };

  const handleStartGeneration = () => {
    if (!currentBook?.roadmap) { showToast('No roadmap found. Generate a roadmap first.', 'warning'); return; }
    const session: BookSession = {
      goal: currentBook.goal, language: 'en', targetAudience: '',
      complexityLevel: currentBook.roadmap.difficultyLevel || 'intermediate',
      preferences: { includeExamples: true, includePracticalExercises: false, includeQuizzes: false },
      reasoning: currentBook.reasoning, generationMode: currentBook.generationMode,
    };
    onGenerateAllModules(currentBook, session);
  };

  const handleStartAssembly = () => {
    if (!currentBook) return;
    const session: BookSession = {
      goal: currentBook.goal, language: 'en', targetAudience: '',
      complexityLevel: currentBook.roadmap?.difficultyLevel || 'intermediate',
      preferences: { includeExamples: true, includePracticalExercises: false, includeQuizzes: false },
      reasoning: currentBook.reasoning, generationMode: currentBook.generationMode,
    };
    onAssembleBook(currentBook, session);
  };

  const handlePauseGeneration = () => { if (currentBook) onPauseGeneration?.(currentBook.id); };

  const handleResumeGeneration = async () => {
    if (!currentBook?.roadmap) { showToast('No roadmap found. Cannot resume.', 'error'); return; }
    const session: BookSession = {
      goal: currentBook.goal, language: 'en', targetAudience: '',
      complexityLevel: currentBook.roadmap.difficultyLevel || 'intermediate',
      preferences: { includeExamples: true, includePracticalExercises: false, includeQuizzes: false },
      reasoning: currentBook.reasoning, generationMode: currentBook.generationMode,
    };
    onResumeGeneration?.(currentBook, session);
  };

  const handleDownloadPdf = async () => {
    if (!currentBook) return;
    setPdfProgress(1);
    try {
      await pdfService.generatePdf(currentBook, setPdfProgress);
      showToast('PDF downloaded!', 'success');
      setTimeout(() => setPdfProgress(0), 2000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'PDF generation failed';
      showAlertDialog({ type: 'error', title: 'PDF Generation Failed', message: msg, confirmText: 'Dismiss' });
      setPdfProgress(0);
    }
  };

  const getStatusIcon = (status: BookProject['status']) => {
    if (['generating_roadmap', 'generating_content', 'assembling'].includes(status)) return <StatusLoader />;
    const map: Record<BookProject['status'], React.ElementType> = {
      planning: Clock, generating_roadmap: Loader2, roadmap_completed: ListChecks,
      generating_content: Loader2, assembling: Box, completed: CheckCircle, error: AlertCircle,
    };
    const Icon = map[status] || Loader2;
    const color = status === 'completed' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-cyan-500';
    return <Icon className={`w-4 h-4 ${color}`} />;
  };

  const getStatusText = (status: BookProject['status']) =>
    ({ planning: 'Planning', generating_roadmap: 'Creating Roadmap', roadmap_completed: 'Ready to Write', generating_content: 'Writing Chapters', assembling: 'Finalizing Book', completed: 'Completed', error: 'Error' }[status] || 'Unknown');

  // ── LIST VIEW ──
  if (view === 'list') {
    if (showListInMain) {
      return (
        <BookListGrid
          books={books}
          onSelectBook={onSelectBook}
          onDeleteBook={onDeleteBook}
          setView={setView}
          setShowListInMain={setShowListInMain}
        />
      );
    }
    return (
      <HomeView
        onNewBook={() => { setView('create'); }}
        onShowList={() => { setShowListInMain(true); setView('list'); }}
        hasApiKey={hasApiKey}
        bookCount={books.length}
        theme={theme}
        formData={formData}
        setFormData={setFormData}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        handleCreateRoadmap={onCreateBookRoadmap}
        handleEnhanceWithAI={handleEnhanceWithAI}
        isEnhancing={isEnhancing}
        enhanceError={enhanceError}
        setIsEnhancing={setIsEnhancing}
        localIsGenerating={localIsGenerating}
        onOpenSettings={onOpenSettings}
        settings={settings}
        onModelChange={onModelChange}
      />
    );
  }

  // ── CREATE VIEW ──
  if (view === 'create') {
    return (
      <div className="w-full max-w-2xl mx-auto px-6 pt-24 pb-10 animate-fade-in-up">
        <button onClick={() => { setView('list'); setShowListInMain(false); }}
          className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-10 group uppercase tracking-widest">
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          Back to Library
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text-primary)] tracking-tight leading-tight">
            Build Better <span className="text-[var(--brand)]">Learning Books</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">Professional AI-powered content generation.</p>
        </div>

        <div className="space-y-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-8 rounded-lg shadow-xl">
          <div>
            <label className="block text-xs font-semibold mb-3 text-[var(--text-secondary)] uppercase tracking-wider">What would you like to write about?</label>
            <div className="relative">
              <textarea
                value={formData.goal}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((p: BookSession) => ({ ...p, goal: e.target.value }))}
                placeholder="A practical guide to organic gardening for beginners..."
                className="w-full glass-input rounded-md p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none text-base leading-relaxed transition-all"
                rows={4} required
              />
              <div className="absolute bottom-3 right-3">
                <button onClick={handleEnhanceWithAI} disabled={!formData.goal.trim() || isEnhancing}
                  className="btn btn-secondary px-3 py-1.5 rounded-full text-[10px]">
                  {isEnhancing ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3 text-[var(--brand)]" />}
                  {isEnhancing ? 'Refining…' : 'Enhance with AI'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] uppercase tracking-wider">Target Audience</label>
              <input type="text" value={formData.targetAudience}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((p: BookSession) => ({ ...p, targetAudience: e.target.value }))}
                placeholder="Beginners, Professionals..."
                className="w-full h-11 glass-input rounded-md px-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] uppercase tracking-wider">Complexity Level</label>
              <CustomSelect
                value={formData.complexityLevel || 'intermediate'}
                onChange={val => setFormData((p: BookSession) => ({ ...p, complexityLevel: val as any }))}
                options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]}
              />
            </div>
          </div>

          <button
            onClick={() => handleCreateRoadmap(formData)}
            disabled={!formData.goal.trim() || localIsGenerating}
            className="btn btn-primary w-full py-4 rounded-md text-base"
          >
            {localIsGenerating ? (
              <><Loader2 className="animate-spin w-5 h-5" /><span>Designing Roadmap…</span></>
            ) : (
              <><Sparkles size={18} /><span>Generate Book Roadmap</span></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (view === 'detail' && currentBook) {
    const areAllModulesDone =
      currentBook.roadmap &&
      currentBook.modules.length === currentBook.roadmap.modules.length &&
      currentBook.modules.every(m => m.status === 'completed');
    const failedModules    = currentBook.modules.filter(m => m.status === 'error');
    const completedModules = currentBook.modules.filter(m => m.status === 'completed');
    const isPaused         = generationStatus?.status === 'paused';
    const totalModuleCount = Math.max(currentBook.roadmap?.modules.length || currentBook.modules.length, 1);
    const totalWords       = currentBook.modules.reduce((s, m) => s + (m.wordCount || 0), 0) || currentBook.totalWords || 0;
    const estimatedReadTime = Math.max(10, Math.round(totalWords / 220));

    return (
      <div className="min-h-[calc(100vh-48px)] bg-[var(--bg-base)]">
        <div className="w-full max-w-6xl mx-auto px-6 pt-24 pb-10">
          <div className="mb-8">
            <button onClick={() => { setView('list'); onSelectBook(null); setShowListInMain(true); }}
              className="mb-5 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Library
            </button>

            <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="relative overflow-hidden border-b border-[var(--border-subtle)] p-7 md:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-end">
                  <div>
                    <h1 className="mb-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl md:leading-tight">{currentBook.title}</h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{currentBook.goal}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[
                        { icon: FileText, text: `${totalModuleCount} modules` },
                        { icon: Sparkles, text: `${totalWords.toLocaleString()} words` },
                        { icon: Clock, text: `${estimatedReadTime} min read` },
                      ].map(({ icon: Icon, text }) => (
                        <span key={text} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          <Icon className="h-3 w-3" /> {text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Status', value: <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">{getStatusIcon(currentBook.status)}{getStatusText(currentBook.status)}</div> },
                      { label: 'Progress', value: `${completedModules.length}/${totalModuleCount} modules` },
                      { label: 'Updated', value: new Date(currentBook.updatedAt).toLocaleDateString() },
                      { label: 'Mode', value: currentBook.generationMode === 'blackhole' ? 'Street' : 'Stellar' },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
                        <div className="mt-1.5 text-xs font-semibold text-[var(--text-secondary)]">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {currentBook.status === 'completed' && (
            <div className="mb-8 flex items-center gap-3">
              <DetailTabButton label="Overview"  Icon={ListChecks} isActive={detailTab === 'overview'}  onClick={() => setDetailTab('overview')} />
              <DetailTabButton label="Analytics" Icon={BarChart3}  isActive={detailTab === 'analytics'} onClick={() => setDetailTab('analytics')} />
              <DetailTabButton label="Read Book" Icon={BookText}   isActive={detailTab === 'read'}      onClick={() => setDetailTab('read')} />
            </div>
          )}

          {detailTab === 'analytics' && currentBook.status === 'completed' ? (
            <BookAnalytics book={currentBook} />
          ) : detailTab === 'read' && currentBook.status === 'completed' ? (
            <ReadingMode
              content={currentBook.finalBook || ''}
              isEditing={isEditing}
              editedContent={editedContent}
              onEdit={() => { setEditedContent(currentBook.finalBook || ''); setIsEditing(true); }}
              onSave={() => { onUpdateBookContent(currentBook.id, editedContent); setIsEditing(false); setEditedContent(''); showToast('Changes saved.', 'success'); }}
              onCancel={() => { setIsEditing(false); setEditedContent(''); }}
              onContentChange={setEditedContent}
              onGoBack={handleGoBackToLibrary}
              theme={theme}
              bookId={currentBook.id}
              currentModuleIndex={0}
            />
          ) : (
            <>
              {(isGenerating || isPaused || generationStatus?.status === 'waiting_retry') && generationStatus && generationStats && (
                <div className="mb-14 mt-4">
                  <EmbeddedProgressPanel
                    generationStatus={generationStatus}
                    stats={generationStats}
                    onCancel={() => showAlertDialog({ type: 'confirm', title: 'Cancel Generation', message: 'Cancel generation? Progress will be saved.', confirmText: 'Yes, Cancel', cancelText: 'Keep Generating', onConfirm: () => bookService.cancelActiveRequests(currentBook.id) })}
                    onPause={handlePauseGeneration}
                    onResume={handleResumeGeneration}
                    onRetryDecision={onRetryDecision}
                    availableModels={availableModels}
                    bookTitle={currentBook.title}
                  />
                </div>
              )}

              <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                {currentBook.roadmap && (
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">Learning Flow</h3>
                      <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {completedModules.length}/{totalModuleCount} complete
                      </div>
                    </div>
                    <div className="space-y-4">
                      {currentBook.roadmap.modules.map((mod, idx) => {
                        const done   = currentBook.modules.find(m => m.roadmapModuleId === mod.id);
                        const active = generationStatus?.currentModule?.id === mod.id;
                        const isDone = done?.status === 'completed';
                        const isError = done?.status === 'error';

                        return (
                          <div key={mod.id} className={`group flex items-start gap-4 rounded-md border px-4 py-3 transition-all ${
                            active 
                              ? 'border-[var(--brand)]/30 bg-[var(--brand)]/5' 
                              : isDone 
                                ? 'border-[var(--border-subtle)] bg-[var(--bg-base)] opacity-70' 
                                : isError 
                                  ? 'border-red-500/20 bg-red-500/5' 
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-base)]/40 hover:border-[var(--border-default)] hover:bg-[var(--bg-base)]'
                          }`}>
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                              isDone 
                                ? 'border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)]' 
                                : isError 
                                  ? 'border-red-500/30 bg-red-500/10 text-red-400' 
                                  : active 
                                    ? 'border-[var(--brand)] bg-[var(--brand)] text-white' 
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)]'
                            }`}>
                              {isDone ? <Check size={14} /> : isError ? <X size={14} /> : active ? <Loader2 size={14} className="animate-spin" /> : String(idx + 1).padStart(2, '0')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className={`text-sm font-bold ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{mod.title}</h4>
                                {isDone && <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--brand)]">Done</span>}
                                {active && <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Writing</span>}
                              </div>
                              <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-1">{mod.description || mod.estimatedTime}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  {currentBook.status === 'error' && !isGenerating && !isPaused && generationStatus?.status !== 'waiting_retry' && (
                    <div className="space-y-4 animate-fade-in-up">
                      <HighDemandNotice />
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">Generation Interrupted</h4>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {completedModules.length > 0
                            ? `${completedModules.length} of ${totalModuleCount} chapters were saved successfully. You can resume from where it stopped.`
                            : 'The generation process was interrupted before any chapters could be completed. Please try again.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(currentBook.status === 'roadmap_completed' || (currentBook.status === 'error' && completedModules.length > 0)) && !areAllModulesDone && !isGenerating && !isPaused && generationStatus?.status !== 'waiting_retry' && (
                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">Generate Chapters</h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {completedModules.length > 0 ? `Resume writing from ${completedModules.length} completed modules.` : 'Start the AI writing pass for all chapters.'}
                      </p>
                      <button onClick={handleStartGeneration} disabled={localIsGenerating} className="btn btn-primary mt-6 w-full py-2.5">
                        {localIsGenerating ? <><Loader2 className="animate-spin w-4 h-4" /> Generating…</> : <><Play className="w-3.5 h-3.5" />{completedModules.length > 0 ? 'Resume Generation' : 'Begin writing chapters'}</>}
                      </button>
                    </div>
                  )}

                  {areAllModulesDone && currentBook.status !== 'completed' && !localIsGenerating && !isGenerating && !isPaused && (
                    <div className="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-6 space-y-4 animate-fade-in-up">
                      <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Assemble Book</h3>
                        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">All chapters complete. Build the final professional book export.</p>
                      </div>
                      <button onClick={handleStartAssembly} className="btn btn-primary w-full py-2.5">
                        <Box className="w-4 h-4" /> Finalize Assembly
                      </button>
                    </div>
                  )}

                  {currentBook.status === 'assembling' && (
                    <div className="rounded-lg border border-[var(--brand)]/30 bg-[var(--bg-surface)] p-6 space-y-6 animate-pulse">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)] opacity-80">Assembly In Progress</p>
                        <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Finalizing Your Book</h3>
                        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Chapters are being stitched together for export.</p>
                      </div>
                      <div className="w-full h-1.5 overflow-hidden rounded-full bg-[var(--bg-base)]">
                        <div className="h-full rounded-full bg-[var(--brand)] animate-slide-in-out" />
                      </div>
                    </div>
                  )}

                  {currentBook.status === 'completed' && detailTab === 'overview' && (
                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">Export Book</h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">Download your book in professional formats.</p>
                      <div className="mt-6 space-y-3">
                        <button onClick={handleDownloadPdf} disabled={pdfProgress > 0 && pdfProgress < 100}
                          className="group flex w-full items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                          <div className="flex items-center gap-3">
                            <Download className="w-4 h-4 text-[var(--brand)]" />
                            <div className="text-left">
                              <div className="text-sm font-bold text-[var(--text-primary)]">Professional PDF</div>
                              <div className="text-xs text-[var(--text-muted)]">{pdfProgress > 0 && pdfProgress < 100 ? `Generating… ${pdfProgress}%` : 'Print-ready layout'}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">Export</span>
                        </button>
                        <button onClick={() => {
                          if (!currentBook.finalBook) return;
                          const blob = new Blob([currentBook.finalBook], { type: 'text/markdown;charset=utf-8' });
                          const url  = URL.createObjectURL(blob);
                          const a    = document.createElement('a');
                          a.href     = url;
                          a.download = `${currentBook.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase()}_book.md`;
                          document.body.appendChild(a); a.click();
                          document.body.removeChild(a); URL.revokeObjectURL(url);
                          showToast('Markdown downloaded.', 'success');
                        }}
                          className="group flex w-full items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-all">
                          <div className="flex items-center gap-3">
                            <Download className="w-4 h-4 text-[var(--text-secondary)]" />
                            <div className="text-left">
                              <div className="text-sm font-bold text-[var(--text-primary)]">Markdown Source</div>
                              <div className="text-xs text-[var(--text-muted)]">Easy to edit and version</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">Export</span>
                        </button>
                      </div>
                      {pdfProgress > 0 && pdfProgress < 100 && (
                        <div className="mt-5">
                          <div className="w-full h-1 rounded-full bg-[var(--bg-base)] overflow-hidden">
                            <div className="h-full bg-[var(--brand)] transition-all duration-300" style={{ width: `${pdfProgress}%` }} />
                          </div>
                          <p className="mt-2 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Generating PDF… {pdfProgress}%</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                    <div className="space-y-4">
                      {[
                        { label: 'Completed modules', value: `${completedModules.length}/${totalModuleCount}` },
                        { label: 'Failed modules',    value: failedModules.length },
                        { label: 'Total Words',       value: totalWords.toLocaleString() },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)] font-medium uppercase tracking-wider">{label}</span>
                          <span className="font-bold text-[var(--text-secondary)]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
