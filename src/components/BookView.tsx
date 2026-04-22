// src/components/BookView.tsx
import React, { Suspense, lazy, useEffect, ReactNode, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Book, Download, Trash2, Clock, CheckCircle, AlertCircle, Loader2,
  Brain, Sparkles, BarChart3, ListChecks, Play, Box, ArrowLeft, Check,
  BookText, RefreshCw, X, FileText, List, Settings, BookOpen, AlertTriangle,
  CheckCircle2, Pause, Zap, Palette, ChevronDown,
  Search, Code, Music, Heart, Cpu, TrendingUp, Eye, Coins, Utensils,
  MessageCircle, Users, GraduationCap, Atom, Target, Briefcase, Crown, Key,
} from 'lucide-react';
import { APISettings, ModelProvider } from '../types';
import type { QuotaStatus } from '../types/providers';
import { BookProject, BookSession } from '../types/book';
import { bookService } from '../services/bookService';
import { getModelsForProvider, getProviderConfig } from '../services/providerRegistry';
import { CustomSelect } from './CustomSelect';
import { readingProgressUtils } from '../utils/readingProgress';

const BookAnalytics = lazy(() => import('./BookAnalytics').then(module => ({ default: module.BookAnalytics })));
const ReadingMode = lazy(() => import('./ReadingMode').then(module => ({ default: module.ReadingMode })));

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
  onOpenStudyMode?: (bookId: string) => void;
  settings: APISettings;
  onModelChange: (model: string, provider: ModelProvider) => void;
  quotaStatus?: QuotaStatus | null;
}

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

const STATUS_LABELS: Record<BookProject['status'], string> = {
  planning: 'Planning',
  generating_roadmap: 'Creating roadmap',
  roadmap_completed: 'Ready to write',
  generating_content: 'Writing',
  assembling: 'Assembling',
  completed: 'Completed',
  error: 'Needs attention',
};

const getStatusIcon = (status: BookProject['status']) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'planning': return <Clock className="w-4 h-4 text-[var(--text-muted)]" />;
    default: return <Loader2 className="w-4 h-4 text-[var(--brand)] animate-spin" />;
  }
};

const getStatusText = (status: BookProject['status']) => {
  return STATUS_LABELS[status] || 'Unknown';
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
  retryInfo, onRetry, onSwitchModel, onSkip, availableModels, showHighDemandNotice = true,
}: {
  retryInfo: { moduleTitle: string; error: string; retryCount: number; maxRetries: number; waitTime?: number; };
  onRetry: () => void;
  onSwitchModel: () => void;
  onSkip: () => void;
  availableModels: Array<{ provider: string; model: string; name: string }>;
  showHighDemandNotice?: boolean;
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
        {showHighDemandNotice && (
          <div className="mb-6">
            <HighDemandNotice />
          </div>
        )}

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
  generationStatus, stats, onCancel, onPause, onResume, onRetryDecision, availableModels, bookTitle, isByok = false,
}: {
  generationStatus: GenerationStatus;
  stats: GenerationStats;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetryDecision?: (decision: 'retry' | 'switch' | 'skip') => void;
  availableModels?: Array<{ provider: string; model: string; name: string }>;
  bookTitle?: string;
  isByok?: boolean;
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
        showHighDemandNotice={!isByok}
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
                {isPaused ? 'Generation paused' : 'Writing book'}
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
                className="streaming-text-box mt-3 max-h-[140px] overflow-y-auto pr-1 font-mono text-xs leading-relaxed text-[var(--text-secondary)] opacity-70"
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

const DetailTabButton = ({ label, Icon, isActive, onClick }: { label: ReactNode; Icon: React.ElementType; isActive: boolean; onClick: () => void; }) => (
  <button
    onClick={onClick}
    className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
      isActive
        ? 'border-[var(--brand)]/25 bg-[var(--brand)]/12 text-[var(--text-primary)] shadow-[0_14px_28px_rgba(0,0,0,0.12)]'
        : 'border-[var(--workspace-line)] bg-[var(--workspace-soft)] text-[var(--text-secondary)] hover:border-[var(--workspace-line-strong)] hover:bg-[var(--workspace-soft-strong)] hover:text-[var(--text-primary)]'
    }`}
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

const DetailPaneFallback = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
    <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 py-2">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--brand)]" />
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </div>
  </div>
);

// ============================================================================
// HOME VIEW  (original design, robustness-hardened)
// ============================================================================
const HomeView = ({
  onShowList,
  onOpenBook,
  books,
  bookCount,
  formData,
  setFormData,
  showAdvanced,
  setShowAdvanced,
  handleCreateRoadmap,
  handleEnhanceWithAI,
  isEnhancing,
  setIsEnhancing,
  enhanceError,
  localIsGenerating,
  onOpenSettings,
  settings,
  quotaStatus,
}: {
  onShowList: () => void;
  onOpenBook: (id: string) => void;
  books: BookProject[];
  bookCount: number;
  formData: BookSession;
  setFormData: React.Dispatch<React.SetStateAction<BookSession>>;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  handleCreateRoadmap: (data: BookSession) => void;
  handleEnhanceWithAI: () => void;
  isEnhancing: boolean;
  setIsEnhancing: (val: boolean) => void;
  enhanceError: string | null;
  localIsGenerating: boolean;
  onOpenSettings: () => void;
  settings: APISettings;
  quotaStatus?: QuotaStatus | null;
}) => {
  const canGenerate = !!(formData.goal.trim() && !localIsGenerating);
  const recentBooks = [...books]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const activeProvider = getProviderConfig(settings.selectedProvider);
  const activeModel =
    getModelsForProvider(settings.selectedProvider).find(model => model.id === settings.selectedModel)?.name
    ?? settings.selectedModel;

  return (
    <div className="workspace-page workspace-stack">
      <section className="workspace-hero workspace-hero--split">
        <div className="workspace-hero__content">
          <div className="workspace-stack">
            <div>
              <p className="workspace-eyebrow">Create a book</p>
              <h1 className="workspace-title">
                Start with a topic.
                <span className="mt-3 block text-[0.56em] font-semibold tracking-[-0.04em] text-[var(--text-secondary)]">
                  Shape the roadmap first, then let the workspace write the full draft.
                </span>
              </h1>
              <p className="workspace-body mt-4">
                Write the learning goal clearly, refine the brief if needed, and launch the roadmap. Existing drafts and finished books stay available in your library so you can return to them anytime.
              </p>
            </div>

            <div className="workspace-chip-row">
              <div className="workspace-chip">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Provider</span>
                <span className="workspace-chip__value">{activeProvider.name}</span>
              </div>
              <div className="workspace-chip">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Model</span>
                <span className="workspace-chip__value">{activeModel}</span>
              </div>
              <div className="workspace-chip workspace-chip--accent">
                <BookOpen size={14} />
                <strong>{bookCount}</strong> {bookCount === 1 ? 'book' : 'books'} in library
              </div>
            </div>
          </div>

            <aside className="workspace-card p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Recent books</p>
                  <h2 className="mt-3 text-[1.35rem] font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                    {bookCount > 0 ? 'Pick up where you left off' : 'Library is empty'}
                  </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {bookCount > 0
                    ? 'Open a draft, continue writing, or jump into study mode.'
                    : 'Your created books will appear here once the first roadmap is generated.'}
                </p>
              </div>
              {bookCount > 0 ? (
                <button onClick={onShowList} className="btn btn-secondary px-3">
                  <BookOpen size={14} />
                  View library
                </button>
              ) : null}
            </div>

            {recentBooks.length > 0 ? (
              <div className="workspace-stack mt-5">
                {recentBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => onOpenBook(book.id)}
                    className="workspace-card-muted flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--workspace-soft)]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{book.title}</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        {STATUS_LABELS[book.status]} • {new Date(book.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-[var(--text-muted)]" />
                  </button>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="workspace-input-shell">
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
                     title: enhanced.title,
                     goal: enhanced.goal,
                     targetAudience: enhanced.targetAudience,
                     complexityLevel: enhanced.complexityLevel,
                    reasoning: enhanced.reasoning || '',
                    preferences: enhanced.preferences,
                  };
                  setFormData(updatedData);
                  // Wait a tiny bit for state to propagate
                  setTimeout(() => {
                    void handleCreateRoadmap(updatedData);
                  }, 100);
                } catch (err) {
                  void handleCreateRoadmap(formData);
                } finally {
                  setIsEnhancing(false);
                }
              }
            }}
            placeholder="Describe the book you want to create"
            className="outline-none"
            rows={1}
            style={{ maxHeight: '260px' }}
          />
          <div className="workspace-input-shell__footer">
            <div className="workspace-kbd-row">
              <span className="workspace-kbd">Enter</span>
              <span>Start the roadmap</span>
              <span className="h-1 w-1 rounded-full bg-[var(--workspace-line)]" />
              <span className="workspace-kbd">Shift + Enter</span>
              <span>New line</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { if (!showAdvanced) setShowAdvanced(true); handleEnhanceWithAI(); }}
                disabled={!formData.goal.trim() || isEnhancing}
                className="btn btn-secondary px-4 py-2"
                title="Refine prompt with AI"
              >
                {isEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{isEnhancing ? 'Refining brief' : 'Refine brief'}</span>
              </button>
              <button
                onClick={() => canGenerate ? handleCreateRoadmap(formData) : onOpenSettings()}
                disabled={!formData.goal.trim() || localIsGenerating}
                className="btn btn-primary px-4 py-2.5"
              >
                {localIsGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Building roadmap</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Create roadmap</>
                )}
              </button>
            </div>
          </div>
      </section>

      {enhanceError && (
        <div className="animate-fade-in-up">
          <HighDemandNotice compact />
        </div>
      )}

      <div className="workspace-toolbar-row">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn btn-secondary px-4">
          <List size={14} /> Build settings
          <ChevronDown size={12} className={`transition-transform opacity-50 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        {bookCount > 0 && (
          <button onClick={onShowList} className="btn btn-secondary px-4">
            <BookOpen size={14} /> View created books <span className="opacity-40">({bookCount})</span>
          </button>
        )}
      </div>

      {quotaStatus && (
        <div className="workspace-chip-row">
          <div className={`workspace-chip ${quotaStatus.remaining > 0 || quotaStatus.hasBYOK ? 'workspace-chip--accent' : 'workspace-chip--warning'}`}>
            {quotaStatus.remaining > 0 ? (
              <>
                <Zap size={14} className="text-[var(--brand)]" />
                <span>{quotaStatus.remaining} free {quotaStatus.remaining === 1 ? 'book' : 'books'} remaining</span>
              </>
            ) : quotaStatus.hasBYOK ? (
              <>
                <Key size={14} className="text-[var(--brand)]" />
                <span>Using your own API key</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-amber-400" />
                <span>Free quota used</span>
              </>
            )}
          </div>
          {!quotaStatus.hasBYOK && !quotaStatus.remaining && (
            <button onClick={onOpenSettings} className="btn btn-secondary px-4">
              <Key size={14} />
              Add API key
            </button>
          )}
        </div>
      )}

      {showAdvanced && (
        <section
          className="workspace-panel p-6 md:p-7"
          style={{ animation: 'dropdownSlideIn 0.2s cubic-bezier(0.16,1,0.3,1)', transformOrigin: 'top center' }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Build settings</p>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">Tune the brief before generation</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Add audience context, set the learning level, and choose the generation personality for this run.
              </p>
            </div>
          </div>

          <div className="workspace-grid mt-6 md:grid-cols-2">
            <div className="workspace-field">
              <label className="workspace-field__label">Audience</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={e => setFormData(p => ({ ...p, targetAudience: e.target.value }))}
                placeholder="Beginners, operators, analysts..."
                className="h-11 px-4 text-sm outline-none"
              />
            </div>
            <div className="workspace-field">
              <label className="workspace-field__label">Complexity level</label>
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

          <div className="workspace-field mt-5">
            <label className="workspace-field__label">Extra context</label>
            <textarea
              value={formData.reasoning}
              onChange={e => setFormData(p => ({ ...p, reasoning: e.target.value }))}
              placeholder="What outcome should the reader reach by the end of the book?"
              className="p-4 text-sm outline-none"
              rows={4}
            />
          </div>

          <div className="workspace-grid mt-6 border-t border-[var(--workspace-line)] pt-6 md:grid-cols-2">
            <div className="workspace-field">
              <label className="workspace-field__label">Generation mode</label>
              <div className="relative flex h-12 overflow-hidden rounded-[18px] border border-[var(--workspace-line)] bg-[var(--workspace-soft)] p-1">
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
                    className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-[14px] px-3 text-[11px] font-bold transition-colors duration-200 ${
                      formData.generationMode === value
                        ? 'text-[#14100b]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {formData.generationMode === value && (
                      <motion.div
                        layoutId="activeMode"
                        className="absolute inset-0 rounded-[14px] bg-[var(--brand)] shadow-[0_14px_24px_rgba(0,0,0,0.12)]"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon size={14} className="relative z-10" />
                    <span className="relative z-10">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="workspace-field">
              <label className="workspace-field__label">Output language</label>
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

          <div className="mt-8 border-t border-[var(--workspace-line)] pt-5">
            <button
              onClick={() => canGenerate ? handleCreateRoadmap(formData) : onOpenSettings()}
              disabled={!formData.goal.trim() || localIsGenerating}
              className="btn btn-primary w-full justify-center py-3"
            >
              {localIsGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Building roadmap</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Create roadmap</>
              )}
            </button>
          </div>
        </section>
      )}
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

  const filtered = books
    .filter(b => `${b.title} ${b.goal}`.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const featuredBook = filtered[0] || null;
  const completedCount = books.filter(book => book.status === 'completed').length;
  const inProgressCount = books.filter(book => ['planning', 'generating_roadmap', 'roadmap_completed', 'generating_content', 'assembling'].includes(book.status)).length;

  return (
    <div className="workspace-page workspace-stack">
        <section className="workspace-hero">
          <div className="workspace-hero__content">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="workspace-eyebrow">Library</p>
                <h2 className="workspace-title">Your books</h2>
                <p className="workspace-body mt-4">
                  Open a draft, review the finished export, or jump back to the builder to start another run.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="workspace-search">
                  <Search className="h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search title or topic"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="text-sm outline-none"
                  />
                </div>
                <button onClick={() => setShowListInMain(false)} className="btn btn-secondary px-4">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to builder
                </button>
              </div>
            </div>

            <div className="workspace-grid workspace-grid--sidebar">
              <div className="workspace-card p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Featured</p>
                    <h3 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                      {featuredBook ? featuredBook.title : 'No matching books'}
                    </h3>
                  </div>
                  {featuredBook ? getStatusIcon(featuredBook.status) : null}
                </div>
                {featuredBook ? (
                  <>
                    <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{featuredBook.goal}</p>
                    <div className="workspace-metric-grid mt-6">
                      {[
                        { label: 'Status', value: STATUS_LABELS[featuredBook.status] },
                        { label: 'Updated', value: new Date(featuredBook.updatedAt).toLocaleDateString() },
                        { label: 'Words', value: `${(featuredBook.modules.reduce((a, m) => a + (m.wordCount || 0), 0) || featuredBook.totalWords || 0).toLocaleString()}` },
                      ].map((item) => (
                        <div key={item.label} className="workspace-metric-card">
                          <span className="workspace-metric-card__label">{item.label}</span>
                          <span className="workspace-metric-card__value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <GradientProgressBar progress={Math.min(100, Math.round(featuredBook.progress || 0))} />
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[var(--workspace-line)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                    Nothing matches that search yet.
                  </div>
                )}
              </div>

              <div className="workspace-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Overview</p>
                <div className="workspace-metric-grid mt-4">
                  {[
                    { label: 'Total books', value: books.length },
                    { label: 'Completed', value: completedCount },
                    { label: 'In progress', value: inProgressCount },
                  ].map((item) => (
                    <div key={item.label} className="workspace-metric-card">
                      <span className="workspace-metric-card__label">{item.label}</span>
                      <span className="workspace-metric-card__value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="workspace-panel workspace-list-shell">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--workspace-line)] bg-white/[0.02]">
                <BookOpen className="h-6 w-6 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{searchQuery ? 'No books found' : 'Empty library'}</h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--text-secondary)]">
                {searchQuery ? 'Try a different word or clear the search.' : 'Your first book will show up here once the roadmap is created.'}
              </p>
              {!searchQuery && (
                <button onClick={() => { setView('create'); setShowListInMain(false); }} className="btn btn-primary mt-5 px-6 py-2.5">
                  <Sparkles size={16} /> Start a New Book
                </button>
              )}
            </div>
          ) : (
            <div className="workspace-list">
              {filtered.map(book => {
                const wordCount = book.modules.reduce((a, m) => a + (m.wordCount || 0), 0) || book.totalWords || 0;
                const Icon = getBookIcon(book.title);
                return (
                  <div
                    key={book.id}
                    onClick={() => onSelectBook(book.id)}
                    className="workspace-list-row group cursor-pointer"
                  >
                    <div className={`relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--workspace-line)] ${getBookCoverTone(book.title)}`}>
                      <Icon className="h-4 w-4 text-white/45" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{book.title}</h3>
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">{getStatusIcon(book.status)}{STATUS_LABELS[book.status]}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-[var(--text-secondary)]">{book.goal}</p>
                      <div className="workspace-list-row__meta mt-2">
                        <span>{wordCount.toLocaleString()} words</span>
                        <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="workspace-list-row__actions">
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteBook(book.id); }}
                        className="rounded-full p-2 text-[var(--text-muted)] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
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
  showAlertDialog, showToast, onReadingModeChange, settings, onModelChange, quotaStatus, onOpenStudyMode
}: BookViewProps) {
  const [detailTab, setDetailTab] = useState<'overview' | 'analytics' | 'read'>('overview');
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookSession>({
    title: '',
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
        title: enhanced.title,
        goal: enhanced.goal,
        language: 'en',
        targetAudience: enhanced.targetAudience,
        complexityLevel: enhanced.complexityLevel,
        reasoning: enhanced.reasoning || '',
        generationMode: formData.generationMode,
        preferences: enhanced.preferences,
      });
      showToast('Idea refined! ? Review and adjust as needed.', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Refinement failed';
      setEnhanceError(msg);
      showToast(msg, 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCreateRoadmap = async (session: BookSession) => {
    if (!session.goal.trim()) { showToast('Please enter a learning goal.', 'warning'); return; }
    try {
      await onCreateBookRoadmap(session);
      setFormData({ title: '', goal: '', language: 'en', targetAudience: '', complexityLevel: 'intermediate', reasoning: '', generationMode: 'stellar', preferences: { includeExamples: true, includePracticalExercises: false, includeQuizzes: false } });
      setShowAdvanced(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create roadmap.';
      showToast(message, 'error');
    }
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
      const { pdfService } = await import('../services/pdfService');
      await pdfService.generatePdf(currentBook, setPdfProgress);
      showToast('PDF downloaded!', 'success');
      setTimeout(() => setPdfProgress(0), 2000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'PDF generation failed';
      if (msg.toLowerCase().includes('cancel')) {
        showToast('PDF download cancelled.', 'info');
        setPdfProgress(0);
        return;
      }
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

  // -- LIST VIEW --
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
          onShowList={() => { setShowListInMain(true); setView('list'); }}
          onOpenBook={(id) => { onSelectBook(id); setView('detail'); }}
          books={books}
          bookCount={books.length}
          formData={formData}
          setFormData={setFormData}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          handleCreateRoadmap={handleCreateRoadmap}
          handleEnhanceWithAI={handleEnhanceWithAI}
          isEnhancing={isEnhancing}
          setIsEnhancing={setIsEnhancing}
          enhanceError={enhanceError}
          localIsGenerating={localIsGenerating}
          onOpenSettings={onOpenSettings}
          settings={settings}
          quotaStatus={quotaStatus}
        />
    );
  }

  // -- CREATE VIEW --
  if (view === 'create') {
    return (
      <HomeView
        onShowList={() => { setShowListInMain(true); setView('list'); }}
        onOpenBook={(id) => { onSelectBook(id); setView('detail'); }}
        books={books}
        bookCount={books.length}
        formData={formData}
        setFormData={setFormData}
        showAdvanced={true}
        setShowAdvanced={setShowAdvanced}
        handleCreateRoadmap={handleCreateRoadmap}
        handleEnhanceWithAI={handleEnhanceWithAI}
        isEnhancing={isEnhancing}
        enhanceError={enhanceError}
        setIsEnhancing={setIsEnhancing}
        localIsGenerating={localIsGenerating}
        onOpenSettings={onOpenSettings}
        settings={settings}
        quotaStatus={quotaStatus}
      />
    );
  }

  // -- DETAIL VIEW --
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
      <div className="workspace-page workspace-page--detail workspace-stack">
          <div className="workspace-stack">
            <button
              onClick={() => { setView('list'); onSelectBook(null); setShowListInMain(true); }}
              className="flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to library
            </button>

            <section className="workspace-hero">
              <div className="workspace-hero__content">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,360px)] lg:items-end">
                  <div>
                    <p className="workspace-eyebrow">Book workspace</p>
                    <h1 className="workspace-title">{currentBook.title}</h1>
                    <p className="workspace-body mt-4 max-w-3xl">{currentBook.goal}</p>
                    <div className="workspace-chip-row mt-5">
                      {[
                        { icon: FileText, text: `${totalModuleCount} chapters` },
                        { icon: Sparkles, text: `${totalWords.toLocaleString()} words` },
                        { icon: Clock, text: `${estimatedReadTime} min read` },
                      ].map(({ icon: Icon, text }) => (
                        <span key={text} className="workspace-chip">
                          <Icon className="h-3.5 w-3.5 text-[var(--brand)]" />
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="workspace-metric-grid">
                    {[
                      {
                        label: 'Status',
                        value: (
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                            {getStatusIcon(currentBook.status)}
                            {getStatusText(currentBook.status)}
                          </div>
                        ),
                        meta: 'Current run state',
                      },
                      { label: 'Progress', value: `${completedModules.length}/${totalModuleCount}`, meta: 'Completed chapters' },
                      { label: 'Updated', value: new Date(currentBook.updatedAt).toLocaleDateString(), meta: 'Most recent activity' },
                      { label: 'Mode', value: currentBook.generationMode === 'blackhole' ? 'Street' : 'Stellar', meta: 'Generation personality' },
                    ].map(({ label, value, meta }) => (
                      <div key={label} className="workspace-metric-card">
                        <span className="workspace-metric-card__label">{label}</span>
                        <span className="workspace-metric-card__value">{value}</span>
                        <span className="workspace-metric-card__meta">{meta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {currentBook.status === 'completed' && (
            <div className="workspace-toolbar-row">
              <DetailTabButton label="Overview"  Icon={ListChecks} isActive={detailTab === 'overview'}  onClick={() => setDetailTab('overview')} />
              <DetailTabButton label="Analytics" Icon={BarChart3}  isActive={detailTab === 'analytics'} onClick={() => setDetailTab('analytics')} />
              <DetailTabButton label="Read Book" Icon={BookText}   isActive={detailTab === 'read'}      onClick={() => setDetailTab('read')} />
              <button
                onClick={() => onOpenStudyMode?.(currentBook.id)}
                className="btn btn-primary px-4 py-2"
              >
                <Brain className="w-4 h-4" />
                <span>Study Companion</span>
              </button>

            </div>
          )}

          {detailTab === 'analytics' && currentBook.status === 'completed' ? (
            <Suspense fallback={<DetailPaneFallback label="Loading analytics..." />}>
              <BookAnalytics book={currentBook} />
            </Suspense>
          ) : detailTab === 'read' && currentBook.status === 'completed' ? (
            <Suspense fallback={<DetailPaneFallback label="Opening reader..." />}>
              <ReadingMode
                book={currentBook}
                theme={theme}
                isEditing={isEditing}
                editedContent={editedContent}
                onEditFullBook={() => { setEditedContent(currentBook.finalBook || ''); setIsEditing(true); }}
                onSaveFullBook={() => { onUpdateBookContent(currentBook.id, editedContent); setIsEditing(false); setEditedContent(''); showToast('Changes saved.', 'success'); }}
                onCancelEdit={() => { setIsEditing(false); setEditedContent(''); }}
                onContentChange={setEditedContent}
                showToast={showToast}
                isMobile={isMobile}
              />
            </Suspense>
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
                    isByok={quotaStatus?.mode === 'byok'}
                  />
                </div>
              )}

              <div className="workspace-grid workspace-grid--sidebar">
                {currentBook.roadmap && (
                  <div className="workspace-panel p-6">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">Roadmap</h3>
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
                    <div className="workspace-panel p-6">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">Generate chapters</h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {completedModules.length > 0 ? `Resume writing from ${completedModules.length} completed modules.` : 'Start the AI writing pass for all chapters.'}
                      </p>
                      <button onClick={handleStartGeneration} disabled={localIsGenerating} className="btn btn-primary mt-6 w-full py-2.5">
                        {localIsGenerating ? <><Loader2 className="animate-spin w-4 h-4" /> Generating…</> : <><Play className="w-3.5 h-3.5" />{completedModules.length > 0 ? 'Resume Generation' : 'Begin writing chapters'}</>}
                      </button>
                    </div>
                  )}

                  {areAllModulesDone && currentBook.status !== 'completed' && !localIsGenerating && !isGenerating && !isPaused && (
                    <div className="workspace-panel p-6 space-y-4 animate-fade-in-up">
                      <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Assemble book</h3>
                        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">All chapters complete. Build the final professional book export.</p>
                      </div>
                      <button onClick={handleStartAssembly} className="btn btn-primary w-full py-2.5">
                        <Box className="w-4 h-4" /> Finalize Assembly
                      </button>
                    </div>
                  )}

                  {currentBook.status === 'assembling' && (
                    <div className="workspace-panel p-6 space-y-6 animate-pulse">
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
                    <div className="workspace-panel p-6">
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">Export book</h3>
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

                  <div className="workspace-panel p-6">
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
    );
  }

  return null;
}
