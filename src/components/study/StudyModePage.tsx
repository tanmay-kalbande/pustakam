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
  ChevronRight,
  Copy,
  Edit,
  Loader2,
  MessageCircle,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
  PanelLeft,
  List,
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
  onBack: () => void;
}

interface ReadingSettings {
  fontSize: number;
  fontFamily: 'sans' | 'serif' | 'mono';
  theme: 'dark' | 'sepia' | 'light';
  maxWidth: 'narrow' | 'medium' | 'wide';
}

const FONT_FAMILIES = {
  sans: "'Rubik', 'Inter', sans-serif",
  serif: "'Crimson Pro', Georgia, serif",
  mono: "ui-monospace, 'SF Mono', monospace",
};
const FONT_LABELS = { sans: 'Sans', serif: 'Serif', mono: 'Mono' };
const MAX_WIDTHS = { narrow: '60ch', medium: '72ch', wide: '86ch' };

const EXPLANATION_OPTIONS: ExplanationMode[] = [
  'simpler', 'deeper', 'step_by_step', 'analogy', 'exam_focused', 'practical',
];

const EXPLANATION_META: Record<ExplanationMode, { icon: string; color: string }> = {
  simpler:      { icon: '↓', color: '#60a5fa' },
  deeper:       { icon: '↑', color: '#a78bfa' },
  step_by_step: { icon: '→', color: '#34d399' },
  analogy:      { icon: '≈', color: '#fbbf24' },
  exam_focused: { icon: '★', color: '#f87171' },
  practical:    { icon: '⚡', color: '#fb923c' },
};

const normalizeSelection = (v: string) => v.replace(/\s+/g, ' ').trim().slice(0, 900);

// ─── Reading theme tokens ────────────────────────────────────────────────────
const READER_THEMES = {
  dark:  { bg: '#0c0c0c', surface: '#111111', text: '#e8e8e8', sub: '#888', border: 'rgba(255,255,255,0.07)', accent: '#FECD8C' },
  sepia: { bg: '#f5f0e8', surface: '#faf7f2', text: '#2c1f14', sub: '#8b7355', border: 'rgba(0,0,0,0.08)', accent: '#b45309' },
  light: { bg: '#ffffff', surface: '#f8f8f8', text: '#111111', sub: '#555', border: 'rgba(0,0,0,0.07)', accent: '#3b82f6' },
};

// ─── Code Block ──────────────────────────────────────────────────────────────
const CodeBlock = React.memo(function CodeBlock({
  children, className, readingTheme,
}: { children: ReactNode; className?: string; readingTheme?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace(/language-/, '') || 'text';
  const isDark = readingTheme !== 'light' && readingTheme !== 'sepia';

  return (
    <div
      className="my-5 overflow-hidden"
      style={{
        borderRadius: 6,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}`,
        background: isDark ? '#0a0a0a' : '#f5f5f5',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
        >
          {language}
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(String(children)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 transition-all"
          style={{
            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
            borderRadius: 4,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? vscDarkPlus : prism}
        language={language}
        PreTag="div"
        customStyle={{ backgroundColor: 'transparent', padding: '1rem 1.25rem', fontSize: '0.8125rem', lineHeight: '1.65', margin: 0 }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
});

// ─── Surface Toggle ───────────────────────────────────────────────────────────
const SurfaceToggle = ({ value, onChange }: { value: ReaderSurface; onChange: (v: ReaderSurface) => void }) => (
  <div
    className="inline-flex overflow-hidden"
    style={{ borderRadius: 6, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)' }}
  >
    {([
      { v: 'module' as const, label: 'Chapters', icon: BookOpen },
      { v: 'full_book' as const, label: 'Full Book', icon: BookText },
    ] as const).map(({ v, label, icon: Icon }) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-all"
        style={{
          background: value === v ? '#FECD8C' : 'transparent',
          color: value === v ? '#000' : 'rgba(255,255,255,0.45)',
          letterSpacing: '0.02em',
        }}
      >
        <Icon size={11} />
        {label}
      </button>
    ))}
  </div>
);

// ─── Interaction Card ─────────────────────────────────────────────────────────
const InteractionCard = ({
  interaction, onFollowUp,
}: { interaction: StudyInteraction; onFollowUp?: (p: string) => void }) => (
  <div className="space-y-3">
    {interaction.question?.question && (
      <div className="flex justify-end">
        <div
          className="max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            background: 'rgba(254,205,140,0.09)',
            border: '1px solid rgba(254,205,140,0.14)',
            color: 'rgba(255,255,255,0.82)',
            borderRadius: '10px 10px 2px 10px',
          }}
        >
          {interaction.question.question}
        </div>
      </div>
    )}

    <div className="flex gap-3">
      <div
        className="shrink-0 w-6 h-6 flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(254,205,140,0.08)', border: '1px solid rgba(254,205,140,0.18)', borderRadius: 6 }}
      >
        <Sparkles size={10} style={{ color: '#FECD8C' }} />
      </div>

      <div className="flex-1 min-w-0">
        {interaction.sourceText && (
          <div
            className="mb-2.5 px-3 py-2 text-[11px] leading-relaxed italic"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderLeft: '2px solid rgba(254,205,140,0.25)',
              borderRadius: '0 4px 4px 0',
              color: 'rgba(255,255,255,0.38)',
            }}
          >
            "{interaction.sourceText.slice(0, 200)}{interaction.sourceText.length > 200 ? '…' : ''}"
          </div>
        )}

        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
          {interaction.answer.answer}
        </p>

        {(interaction.answer.followUpSuggestions?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {interaction.answer.followUpSuggestions!.map(s => (
              <button
                key={s}
                onClick={() => onFollowUp?.(s)}
                className="px-2.5 py-1 text-[11px] transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.42)',
                  borderRadius: 20,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(254,205,140,0.3)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.42)';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── Flashcard View ───────────────────────────────────────────────────────────
const FlashcardView = ({
  deck, idx, revealed, onReveal, onNav, onRate,
}: {
  deck: FlashcardDeck; idx: number; revealed: boolean;
  onReveal: () => void; onNav: (d: 'prev' | 'next') => void;
  onRate: (d: 'easy' | 'medium' | 'hard') => void;
}) => {
  const card = deck.cards[idx];
  const progress = ((idx + 1) / deck.cards.length) * 100;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {deck.deckTitle}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {idx + 1} / {deck.cards.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: '#FECD8C' }}
        />
      </div>

      {/* Card */}
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}
      >
        {/* Front */}
        <div className="p-4" style={{ background: 'rgba(255,255,255,0.015)' }}>
          <div
            className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2.5"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >
            Question
          </div>
          <p className="text-[13px] font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.84)' }}>
            {card.front}
          </p>
          {(card.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {card.tags!.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 text-[10px]"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.28)', borderRadius: 3 }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {revealed ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2.5"
                  style={{ color: 'rgba(254,205,140,0.45)' }}
                >
                  Answer
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  {card.back}
                </p>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Hard', v: 'hard' as const, bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.22)', text: 'rgba(252,165,165,0.9)' },
                    { label: 'Fair', v: 'medium' as const, bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.22)', text: 'rgba(254,215,170,0.9)' },
                    { label: 'Easy', v: 'easy' as const, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: 'rgba(134,239,172,0.9)' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => onRate(opt.v)}
                      className="py-2 text-xs font-semibold transition-all"
                      style={{ background: opt.bg, border: `1px solid ${opt.border}`, color: opt.text, borderRadius: 6 }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="px-4 pb-4">
              <button
                onClick={onReveal}
                className="w-full py-2.5 text-sm font-semibold mt-3 transition-all"
                style={{ background: '#FECD8C', color: '#000', borderRadius: 6 }}
              >
                Reveal Answer
              </button>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onNav('prev')}
          className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', borderRadius: 6 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
        >
          <ArrowLeft size={12} /> Prev
        </button>
        <button
          onClick={() => onNav('next')}
          className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', borderRadius: 6 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
        >
          Next <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function StudyModePage({
  book, theme, isEditing, editedContent, onEditFullBook, onSaveFullBook,
  onCancelEdit, onContentChange, showToast, isMobile = false, onBack,
}: StudyModePageProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const orderedModules = useMemo(() => {
    if (!book.roadmap?.modules?.length) return [...book.modules];
    const ordered = book.roadmap.modules
      .map(rm => book.modules.find(m => m.roadmapModuleId === rm.id))
      .filter((m): m is BookModule => Boolean(m));
    return ordered.length > 0 ? ordered : [...book.modules];
  }, [book.modules, book.roadmap]);

  const resumeState = useMemo(() => readingProgressUtils.getResumeState(book.id), [book.id]);

  const [selModIdx, setSelModIdx] = useState(() => {
    if (!resumeState) return 0;
    return Math.max(0, Math.min(resumeState.moduleIndex, orderedModules.length - 1));
  });
  const [surface, setSurface] = useState<ReaderSurface>(resumeState?.mode || 'module');
  const [activeTool, setActiveTool] = useState<StudyTool>('doubt');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [panelOpen, setPanelOpen] = useState(!isMobile);
  const [selectedText, setSelectedText] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [thread, setThread] = useState<StudyThread | null>(null);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [threadLoading, setThreadLoading] = useState(true);
  const [deckLoading, setDeckLoading] = useState(true);
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [flashLoading, setFlashLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState<ExplanationMode | null>(null);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);
  const [cardIdx, setCardIdx] = useState(0);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [lastDoubtPayload, setLastDoubtPayload] = useState<{ question: string; selectedText?: string } | null>(null);
  const [lastExplainPayload, setLastExplainPayload] = useState<{ mode: ExplanationMode; selectedText?: string } | null>(null);

  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem('pustakam-reading-settings');
    return { fontSize: 17, fontFamily: 'sans', theme: theme === 'dark' ? 'dark' : 'light', maxWidth: 'medium', ...(saved ? JSON.parse(saved) : {}) };
  });

  const currentModule = orderedModules[selModIdx] || orderedModules[0] || null;
  const roadmapModule = book.roadmap?.modules.find(rm => rm.id === currentModule?.roadmapModuleId) || null;
  const content = surface === 'full_book' ? book.finalBook || '' : currentModule?.content || '';
  const interactions = thread?.interactions || [];
  const doubtHistory = interactions.filter(i => i.type === 'doubt').slice().reverse();
  const explainHistory = interactions.filter(i => i.type === 're_explain').slice().reverse();
  const moduleProgress = readingProgressUtils.getModuleProgress(book.id, selModIdx)?.percentComplete || 0;
  const selectedTextPreview = selectedText ? `${selectedText.slice(0, 150)}${selectedText.length > 150 ? '…' : ''}` : '';

  const rt = READER_THEMES[settings.theme];

  useEffect(() => { localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings)); }, [settings]);

  useEffect(() => {
    if (!currentModule) return;
    let cancelled = false;
    setQuestionInput(''); setSelectedText(''); setDoubtError(null); setExplainError(null); setFlashError(null);
    setThreadLoading(true); setDeckLoading(true);
    Promise.all([
      learningService.getModuleThread(book.id, currentModule.id),
      learningService.getFlashcardDeck(book.id, currentModule.id),
    ]).then(([t, d]) => {
      if (cancelled) return;
      setThread(t); setDeck(d); setCardIdx(0); setCardRevealed(false);
    }).catch(() => {}).finally(() => {
      if (!cancelled) { setThreadLoading(false); setDeckLoading(false); }
    });
    return () => { cancelled = true; };
  }, [book.id, currentModule?.id]);

  useEffect(() => {
    const handle = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || !contentRef.current) return;
      if (!contentRef.current.contains(sel.anchorNode) || !contentRef.current.contains(sel.focusNode)) return;
      const t = normalizeSelection(sel.toString());
      if (t.length >= 12) setSelectedText(t);
    };
    document.addEventListener('mouseup', handle);
    document.addEventListener('touchend', handle);
    return () => { document.removeEventListener('mouseup', handle); document.removeEventListener('touchend', handle); };
  }, []);

  if (!currentModule) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
      No module content available.
    </div>
  );

  const appendInteraction = (interaction: StudyInteraction) => {
    setThread(prev => ({
      id: prev?.id || `${book.id}:${currentModule.id}`,
      bookId: book.id, moduleId: currentModule.id, moduleTitle: currentModule.title,
      interactions: [...(prev?.interactions || []), interaction], updatedAt: new Date(),
    }));
  };

  const overviewSnippet = [roadmapModule?.description || '', ...(roadmapModule?.objectives || [])].filter(Boolean).join(' ');
  const contextText = selectedText || overviewSnippet;

  const handleAskDoubt = async (payload?: { question: string; selectedText?: string }) => {
    const q = payload?.question || questionInput;
    const st = payload?.selectedText ?? selectedText ?? undefined;
    if (!q.trim()) { showToast('Enter a question first.', 'warning'); return; }
    setDoubtLoading(true); setDoubtError(null);
    setLastDoubtPayload({ question: q, selectedText: st });
    try {
      const i = await learningService.askModuleDoubt({ book, module: currentModule, moduleIndex: selModIdx, question: q, selectedText: st });
      appendInteraction(i); setQuestionInput(''); setSelectedText(''); setPanelOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to answer.';
      setDoubtError(msg); showToast(msg, 'error');
    } finally { setDoubtLoading(false); }
  };

  const handleFollowUp = (p: string, src?: string) => {
    setActiveTool('doubt'); setQuestionInput(p);
    void handleAskDoubt({ question: p, selectedText: src || contextText || undefined });
  };

  const handleExplain = async (mode: ExplanationMode, retrySrc?: string) => {
    const src = retrySrc || selectedText || overviewSnippet || currentModule.title;
    setExplainLoading(mode); setExplainError(null);
    setLastExplainPayload({ mode, selectedText: src });
    try {
      const i = await learningService.reExplainModuleSection({ book, module: currentModule, moduleIndex: selModIdx, mode, selectedText: src });
      appendInteraction(i); setPanelOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed.';
      setExplainError(msg); showToast(msg, 'error');
    } finally { setExplainLoading(null); }
  };

  const handleGenerateFlashcards = async () => {
    setFlashLoading(true); setFlashError(null);
    try {
      const d = await learningService.generateFlashcards({ book, module: currentModule, moduleIndex: selModIdx });
      setDeck(d); setCardIdx(0); setCardRevealed(false); setPanelOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed.';
      setFlashError(msg); showToast(msg, 'error');
    } finally { setFlashLoading(false); }
  };

  const handleRateCard = async (diff: 'easy' | 'medium' | 'hard') => {
    if (!deck) return;
    const d = await learningService.recordFlashcardFeedback(book.id, deck.moduleId, deck.cards[cardIdx].id, diff);
    if (d) setDeck(d);
    setCardRevealed(false); setCardIdx(prev => (prev + 1) % deck.cards.length);
  };

  const quickPrompts = [
    `Explain the core concept in "${currentModule.title}"`,
    'What are the most common mistakes to avoid?',
    'Give me a real-world example of this.',
  ];

  // ─── Study Panel ─────────────────────────────────────────────────────────
  const renderPanel = () => (
    <div
      className="flex flex-col h-full"
      style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Panel Top */}
      <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: 'rgba(254,205,140,0.5)' }}>
              Study Companion
            </p>
            <h3 className="text-sm font-semibold leading-snug truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {currentModule.title}
            </h3>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="shrink-0 w-7 h-7 flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Tool tabs */}
        <div
          className="flex gap-0.5 p-1"
          style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {([
            { t: 'doubt' as StudyTool, label: 'Ask', icon: MessageCircle },
            { t: 'explain' as StudyTool, label: 'Reframe', icon: Sparkles },
            { t: 'flashcards' as StudyTool, label: 'Cards', icon: Brain },
          ] as const).map(({ t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setActiveTool(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: activeTool === t ? '#FECD8C' : 'transparent',
                color: activeTool === t ? '#000' : 'rgba(255,255,255,0.38)',
                borderRadius: 6,
              }}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        {/* Selected text chip */}
        {selectedText && (
          <div
            className="mt-3 flex items-start gap-2 p-2.5"
            style={{
              background: 'rgba(254,205,140,0.05)',
              border: '1px solid rgba(254,205,140,0.13)',
              borderRadius: 7,
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(254,205,140,0.55)' }}>
              Sel.
            </span>
            <p className="flex-1 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
              {selectedTextPreview}
            </p>
            <button
              onClick={() => setSelectedText('')}
              style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">

        {/* ── DOUBT TAB ── */}
        {activeTool === 'doubt' && (
          <>
            {!threadLoading && doubtHistory.length === 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Suggested Questions
                </p>
                <div className="space-y-1.5">
                  {quickPrompts.map(p => (
                    <button
                      key={p}
                      onClick={() => setQuestionInput(p)}
                      className="w-full text-left px-3 py-2.5 text-[12px] transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.42)',
                        borderRadius: 7,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = 'rgba(255,255,255,0.68)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {threadLoading && (
              <div className="flex items-center gap-2 py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <Loader2 size={12} className="animate-spin" />
                <span className="text-[11px]">Loading history…</span>
              </div>
            )}

            {doubtHistory.map(i => (
              <InteractionCard key={i.id} interaction={i} onFollowUp={p => handleFollowUp(p, i.sourceText)} />
            ))}
          </>
        )}

        {/* ── EXPLAIN TAB ── */}
        {activeTool === 'explain' && (
          <>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Transform this section
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {EXPLANATION_OPTIONS.map(mode => {
                  const meta = EXPLANATION_META[mode];
                  const isActive = explainLoading === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => void handleExplain(mode)}
                      disabled={!!explainLoading}
                      className="flex items-center gap-2 px-3 py-2.5 text-left text-[11px] font-medium transition-all"
                      style={{
                        background: isActive ? `${meta.color}12` : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${isActive ? `${meta.color}30` : 'rgba(255,255,255,0.07)'}`,
                        color: isActive ? meta.color : 'rgba(255,255,255,0.52)',
                        opacity: explainLoading && !isActive ? 0.35 : 1,
                        borderRadius: 7,
                      }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1, fontFamily: 'monospace', color: meta.color }}>
                        {meta.icon}
                      </span>
                      <span className="leading-tight">{EXPLANATION_MODE_LABELS[mode]}</span>
                      {isActive && <Loader2 size={10} className="animate-spin ml-auto" />}
                    </button>
                  );
                })}
              </div>

              {contextText && (
                <p className="mt-2 text-[10px] leading-relaxed truncate" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  Context: "{contextText.slice(0, 70)}{contextText.length > 70 ? '…' : ''}"
                </p>
              )}

              {explainError && (
                <div
                  className="mt-3 flex items-center justify-between px-3 py-2"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(252,165,165,0.8)', borderRadius: 7 }}
                >
                  <span className="text-[11px]">{explainError}</span>
                  {lastExplainPayload && (
                    <button onClick={() => void handleExplain(lastExplainPayload.mode, lastExplainPayload.selectedText)}>
                      <RefreshCw size={11} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {explainHistory.length > 0 && (
              <div className="space-y-4">
                {explainHistory.map(i => <InteractionCard key={i.id} interaction={i} onFollowUp={p => handleFollowUp(p, i.sourceText)} />)}
              </div>
            )}
          </>
        )}

        {/* ── FLASHCARDS TAB ── */}
        {activeTool === 'flashcards' && (
          <>
            {!deck ? (
              <div className="space-y-3">
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.34)' }}>
                  Generate a recall deck from this chapter. Cards are saved between sessions.
                </p>
                <button
                  onClick={handleGenerateFlashcards}
                  disabled={flashLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all"
                  style={{ background: '#FECD8C', color: '#000', opacity: flashLoading ? 0.6 : 1, borderRadius: 7 }}
                >
                  {flashLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                  {flashLoading ? 'Generating…' : 'Generate Deck'}
                </button>

                {flashError && (
                  <div
                    className="flex items-center justify-between px-3 py-2"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(252,165,165,0.8)', borderRadius: 7 }}
                  >
                    <span className="text-[11px]">{flashError}</span>
                    <button onClick={handleGenerateFlashcards}><RefreshCw size={11} /></button>
                  </div>
                )}

                {deckLoading && (
                  <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    <Loader2 size={12} className="animate-spin" />
                    <span className="text-[11px]">Loading deck…</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{deck.cards.length} cards</span>
                  <button
                    onClick={handleGenerateFlashcards}
                    disabled={flashLoading}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 transition-all"
                    style={{ color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}
                  >
                    <RotateCcw size={10} /> Refresh
                  </button>
                </div>
                <FlashcardView
                  deck={deck} idx={cardIdx} revealed={cardRevealed}
                  onReveal={() => setCardRevealed(true)}
                  onNav={dir => {
                    setCardRevealed(false);
                    setCardIdx(prev => dir === 'prev'
                      ? (prev === 0 ? deck.cards.length - 1 : prev - 1)
                      : (prev + 1) % deck.cards.length);
                  }}
                  onRate={diff => void handleRateCard(diff)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Doubt input */}
      {activeTool === 'doubt' && (
        <div className="shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.025)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <textarea
              value={questionInput}
              onChange={e => setQuestionInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!doubtLoading) void handleAskDoubt();
                }
              }}
              placeholder="Ask anything about this chapter…"
              className="w-full bg-transparent px-3.5 pt-3 pb-2 text-[13px] resize-none outline-none leading-relaxed"
              style={{ minHeight: '68px', color: 'rgba(255,255,255,0.78)', caretColor: '#FECD8C' }}
              rows={3}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>↵ to send</span>
              <div className="flex items-center gap-2">
                {doubtError && lastDoubtPayload && (
                  <button
                    onClick={() => void handleAskDoubt(lastDoubtPayload)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1"
                    style={{ color: 'rgba(252,165,165,0.7)' }}
                  >
                    <RefreshCw size={10} /> Retry
                  </button>
                )}
                <button
                  onClick={() => void handleAskDoubt()}
                  disabled={doubtLoading || !questionInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-all"
                  style={{
                    background: questionInput.trim() ? '#FECD8C' : 'rgba(255,255,255,0.05)',
                    color: questionInput.trim() ? '#000' : 'rgba(255,255,255,0.22)',
                    opacity: doubtLoading ? 0.6 : 1,
                    borderRadius: 6,
                  }}
                >
                  {doubtLoading ? <Loader2 size={11} className="animate-spin" /> : <MessageCircle size={11} />}
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#080808', color: 'rgba(255,255,255,0.84)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 shrink-0 flex items-center justify-between gap-4 px-5 h-[52px]"
        style={{
          background: 'rgba(8,8,8,0.96)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.46)', borderRadius: 6 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.78)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.46)'; }}
          >
            <ArrowLeft size={12} /> Back
          </button>

          <div className="hidden sm:block min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Study Workspace
            </p>
            <h1 className="text-[13px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {book.title}
            </h1>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Chapter / progress badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}
          >
            <span style={{ color: 'rgba(255,255,255,0.28)' }}>Ch.</span>
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.68)' }}>
              {selModIdx + 1}/{orderedModules.length}
            </span>
            {moduleProgress > 0 && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.14)' }}>·</span>
                <span style={{ color: 'rgba(254,205,140,0.65)' }}>{moduleProgress}%</span>
              </>
            )}
          </div>

          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(p => !p)}
              className="w-8 h-8 flex items-center justify-center transition-all"
              style={{
                background: sidebarOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: sidebarOpen ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
              }}
              title="Toggle chapters"
            >
              <List size={14} />
            </button>
          )}

          {!isMobile && (
            <button
              onClick={() => setPanelOpen(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: panelOpen ? 'rgba(254,205,140,0.09)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${panelOpen ? 'rgba(254,205,140,0.2)' : 'rgba(255,255,255,0.08)'}`,
                color: panelOpen ? '#FECD8C' : 'rgba(255,255,255,0.38)',
                borderRadius: 6,
              }}
            >
              <Brain size={12} />
              {panelOpen ? 'Hide' : 'Tutor'}
            </button>
          )}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Sidebar ── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && !isMobile && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 flex flex-col overflow-hidden"
              style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}
            >
              <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Chapters
                </p>
              </div>

              <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {orderedModules.map((mod, idx) => {
                  const prog = readingProgressUtils.getModuleProgress(book.id, idx)?.percentComplete || 0;
                  const active = idx === selModIdx && surface === 'module';
                  return (
                    <button
                      key={mod.id}
                      onClick={() => { setSelModIdx(idx); setSurface('module'); setSelectedText(''); }}
                      className="w-full text-left px-4 py-3 transition-all relative"
                      style={{
                        background: active ? 'rgba(254,205,140,0.05)' : 'transparent',
                        borderLeft: `2px solid ${active ? '#FECD8C' : 'transparent'}`,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className="shrink-0 text-[10px] font-bold mt-0.5 w-4 text-right"
                          style={{ color: active ? 'rgba(254,205,140,0.65)' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[12px] font-medium leading-snug"
                            style={{ color: active ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.46)' }}
                          >
                            {mod.title}
                          </p>
                          {prog > 0 && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="flex-1 h-px overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div
                                  className="h-full transition-all"
                                  style={{ width: `${prog}%`, background: active ? '#FECD8C' : 'rgba(255,255,255,0.15)' }}
                                />
                              </div>
                              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{prog}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Reader ─────────────────────────────────────────────────────── */}
        <main
          className="flex-1 min-w-0 flex flex-col overflow-y-auto"
          id="main-scroll-area"
          style={{ background: rt.bg }}
        >
          {/* Mobile chapter tabs */}
          {isMobile && (
            <div
              className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 custom-scrollbar"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}
            >
              {orderedModules.map((mod, idx) => (
                <button
                  key={mod.id}
                  onClick={() => { setSelModIdx(idx); setSurface('module'); }}
                  className="shrink-0 px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-all"
                  style={{
                    background: idx === selModIdx ? '#FECD8C' : 'rgba(255,255,255,0.04)',
                    color: idx === selModIdx ? '#000' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${idx === selModIdx ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 20,
                  }}
                >
                  {idx + 1}. {mod.title}
                </button>
              ))}
            </div>
          )}

          {/* Reader toolbar */}
          <div
            className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-3 px-6 py-2.5"
            style={{
              background: rt.bg === '#0c0c0c' ? 'rgba(12,12,12,0.95)' : `${rt.bg}f2`,
              borderBottom: `1px solid ${rt.border}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center gap-2">
              {/* Theme switcher */}
              <div
                className="flex items-center overflow-hidden"
                style={{ border: `1px solid ${rt.border}`, borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}
              >
                {(['dark', 'sepia', 'light'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSettings(p => ({ ...p, theme: t }))}
                    className="w-8 h-7 flex items-center justify-center transition-all"
                    style={{
                      background: settings.theme === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: settings.theme === t ? rt.text : rt.sub,
                    }}
                  >
                    {t === 'dark' ? <Moon size={12} /> : t === 'sepia' ? <Palette size={12} /> : <Sun size={12} />}
                  </button>
                ))}
              </div>

              {/* Font size */}
              <div
                className="flex items-center gap-1.5 px-2 h-7"
                style={{ border: `1px solid ${rt.border}`, borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}
              >
                <button
                  onClick={() => setSettings(p => ({ ...p, fontSize: Math.max(13, p.fontSize - 1) }))}
                  style={{ color: rt.sub }}
                >
                  <ZoomOut size={12} />
                </button>
                <span
                  className="text-[11px] font-mono w-6 text-center"
                  style={{ color: rt.sub }}
                >
                  {settings.fontSize}
                </span>
                <button
                  onClick={() => setSettings(p => ({ ...p, fontSize: Math.min(26, p.fontSize + 1) }))}
                  style={{ color: rt.sub }}
                >
                  <ZoomIn size={12} />
                </button>
              </div>

              {/* Font family */}
              <div className="relative group hidden md:block">
                <button
                  className="flex items-center gap-1.5 px-3 h-7 text-[11px]"
                  style={{ border: `1px solid ${rt.border}`, borderRadius: 6, background: 'rgba(255,255,255,0.02)', color: rt.sub }}
                >
                  {FONT_LABELS[settings.fontFamily]} <ChevronDown size={10} />
                </button>
                <div
                  className="absolute top-full left-0 mt-1 w-28 overflow-hidden z-20 hidden group-hover:block"
                  style={{
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 7,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                >
                  {(['sans', 'serif', 'mono'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setSettings(p => ({ ...p, fontFamily: f }))}
                      className="w-full flex items-center justify-between px-3 py-2 text-[11px] transition-colors"
                      style={{
                        fontFamily: FONT_FAMILIES[f],
                        color: settings.fontFamily === f ? '#FECD8C' : 'rgba(255,255,255,0.5)',
                        background: settings.fontFamily === f ? 'rgba(254,205,140,0.05)' : 'transparent',
                      }}
                    >
                      {FONT_LABELS[f]}
                      {settings.fontFamily === f && <Check size={10} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SurfaceToggle value={surface} onChange={setSurface} />

              {surface === 'full_book' && (
                isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onCancelEdit}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] transition-all"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', borderRadius: 6 }}
                    >
                      <X size={10} /> Cancel
                    </button>
                    <button
                      onClick={onSaveFullBook}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all"
                      style={{ background: '#FECD8C', color: '#000', borderRadius: 6 }}
                    >
                      <Save size={10} /> Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onEditFullBook}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', borderRadius: 6 }}
                  >
                    <Edit size={10} /> Edit
                  </button>
                )
              )}
            </div>
          </div>

          {/* Module header */}
          {surface === 'module' && (
            <div className="shrink-0 px-8 pt-10 pb-6 mx-auto w-full" style={{ maxWidth: MAX_WIDTHS[settings.maxWidth] }}>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: rt.sub }}
                >
                  Chapter {selModIdx + 1} of {orderedModules.length}
                </span>
                {roadmapModule?.estimatedTime && (
                  <>
                    <span style={{ color: `${rt.sub}60` }}>·</span>
                    <span className="text-[9px]" style={{ color: rt.sub }}>{roadmapModule.estimatedTime}</span>
                  </>
                )}
              </div>

              <h2
                className="text-3xl font-bold tracking-tight mb-3"
                style={{
                  color: rt.text,
                  fontFamily: FONT_FAMILIES[settings.fontFamily],
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2,
                }}
              >
                {currentModule.title}
              </h2>

              {roadmapModule?.description && (
                <p
                  className="text-base leading-relaxed"
                  style={{ color: rt.sub, maxWidth: '52ch', fontFamily: FONT_FAMILIES[settings.fontFamily] }}
                >
                  {roadmapModule.description}
                </p>
              )}

              {(roadmapModule?.objectives?.length ?? 0) > 0 && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roadmapModule!.objectives.slice(0, 4).map(obj => (
                    <div
                      key={obj}
                      className="flex items-start gap-2 px-3 py-2.5"
                      style={{ background: `${rt.border}`, border: `1px solid ${rt.border}`, borderRadius: 7 }}
                    >
                      <CheckCircle2 size={12} className="shrink-0 mt-0.5" style={{ color: '#FECD8C', opacity: 0.7 }} />
                      <span className="text-[12px] leading-relaxed" style={{ color: rt.sub }}>
                        {obj}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {surface === 'module' && (
            <div className="mx-8" style={{ height: 1, background: rt.border, maxWidth: MAX_WIDTHS[settings.maxWidth] }} />
          )}

          {/* Content */}
          <div className="flex-1 px-8 py-8 mx-auto w-full" style={{ maxWidth: '76rem' }}>
            {surface === 'full_book' && isEditing ? (
              <textarea
                value={editedContent}
                onChange={e => onContentChange(e.target.value)}
                className="w-full rounded-lg font-mono text-sm leading-relaxed outline-none p-6 resize-none"
                style={{
                  minHeight: '70vh',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: `${settings.fontSize - 2}px`,
                }}
              />
            ) : (
              <div ref={contentRef} style={{ maxWidth: MAX_WIDTHS[settings.maxWidth] }}>
                <article
                  className={`prose prose-lg max-w-none ${settings.theme !== 'light' ? 'prose-invert' : ''}`}
                  style={{
                    fontFamily: FONT_FAMILIES[settings.fontFamily],
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: 1.82,
                    color: rt.text,
                    '--tw-prose-body': rt.text,
                    '--tw-prose-headings': settings.theme === 'dark' ? '#f0f0f0' : rt.text,
                  } as React.CSSProperties}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    code: ({ className, children, ...props }) => {
                      if (!className?.includes('language-')) return <code className={className} {...props}>{children}</code>;
                      return <CodeBlock className={className} readingTheme={settings.theme}>{children}</CodeBlock>;
                    },
                  }}>
                    {content}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>

          {/* Chapter nav */}
          {surface === 'module' && (
            <div
              className="shrink-0 flex items-center justify-between gap-4 px-8 py-5 mt-4"
              style={{ borderTop: `1px solid ${rt.border}` }}
            >
              <button
                onClick={() => { if (selModIdx > 0) { setSelModIdx(s => s - 1); setSurface('module'); } }}
                disabled={selModIdx === 0}
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium transition-all disabled:opacity-30"
                style={{ border: `1px solid ${rt.border}`, color: rt.sub, borderRadius: 7 }}
                onMouseEnter={e => { if (selModIdx > 0) { e.currentTarget.style.color = rt.text; } }}
                onMouseLeave={e => { e.currentTarget.style.color = rt.sub; }}
              >
                <ArrowLeft size={13} /> Previous
              </button>
              <button
                onClick={() => { if (selModIdx < orderedModules.length - 1) { setSelModIdx(s => s + 1); setSurface('module'); } }}
                disabled={selModIdx === orderedModules.length - 1}
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold transition-all disabled:opacity-30"
                style={{ background: '#FECD8C', color: '#000', borderRadius: 7 }}
              >
                Next <ArrowRight size={13} />
              </button>
            </div>
          )}
        </main>

        {/* ── Study panel (desktop) ──────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {panelOpen && !isMobile && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 332, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden"
            >
              <div className="w-[332px] h-full flex flex-col">
                {renderPanel()}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile FAB */}
      {(!panelOpen || isMobile) && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-4 pr-5 py-3 text-sm font-bold shadow-2xl transition-all"
          style={{
            background: '#FECD8C',
            color: '#000',
            borderRadius: 30,
            boxShadow: '0 8px 32px rgba(254,205,140,0.22)',
          }}
        >
          <Brain size={15} /> Ask Tutor
        </button>
      )}

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {isMobile && panelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(5px)' }}
            onClick={() => setPanelOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0.08, duration: 0.42 }}
              className="absolute bottom-0 left-0 right-0 overflow-hidden"
              style={{
                maxHeight: '88vh',
                background: '#0d0d0d',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px 14px 0 0',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1" style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10 }} />
              </div>
              <div className="flex flex-col" style={{ maxHeight: 'calc(88vh - 20px)' }}>
                {renderPanel()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
