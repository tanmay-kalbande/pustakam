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
  Save,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
  PanelLeft,
  PanelRight,
  RotateCcw,
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
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', monospace",
};

const FONT_LABELS = { sans: 'Sans', serif: 'Serif', mono: 'Mono' };

const MAX_WIDTHS = { narrow: '62ch', medium: '72ch', wide: '84ch' };

const EXPLANATION_OPTIONS: ExplanationMode[] = [
  'simpler', 'deeper', 'step_by_step', 'analogy', 'exam_focused', 'practical',
];

const EXPLANATION_ICONS: Record<ExplanationMode, string> = {
  simpler: '↓', deeper: '↑', step_by_step: '→', analogy: '≈', exam_focused: '★', practical: '⚡',
};

const normalizeSelection = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 900);

// ─── Code Block ──────────────────────────────────────────────────────────────
const CodeBlock = React.memo(function CodeBlock({
  children, className, readingTheme,
}: { children: ReactNode; className?: string; readingTheme?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace(/language-/, '') || 'text';
  const isDark = readingTheme !== 'light' && readingTheme !== 'sepia';

  return (
    <div className="my-5 overflow-hidden rounded-lg border"
      style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? '#0d0d0d' : '#f6f6f6' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{language}</span>
        <button onClick={() => { navigator.clipboard.writeText(String(children)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors"
          style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? vscDarkPlus : prism}
        language={language}
        PreTag="div"
        customStyle={{ backgroundColor: 'transparent', padding: '1rem 1.25rem', fontSize: '0.8125rem', lineHeight: '1.6', margin: 0 }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
});

// ─── Surface Toggle ───────────────────────────────────────────────────────────
const SurfaceToggle = ({ value, onChange }: { value: ReaderSurface; onChange: (v: ReaderSurface) => void }) => (
  <div className="inline-flex rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
    {[
      { v: 'module' as const, label: 'Chapters', icon: BookOpen },
      { v: 'full_book' as const, label: 'Full Book', icon: BookText },
    ].map(({ v, label, icon: Icon }) => (
      <button key={v} onClick={() => onChange(v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
        style={{
          backgroundColor: value === v ? '#FECD8C' : 'transparent',
          color: value === v ? '#000' : 'rgba(255,255,255,0.5)',
        }}>
        <Icon size={12} />
        {label}
      </button>
    ))}
  </div>
);

// ─── Interaction Card ─────────────────────────────────────────────────────────
const InteractionCard = ({
  interaction, onFollowUp,
}: { interaction: StudyInteraction; onFollowUp?: (p: string) => void }) => (
  <div className="space-y-2">
    {interaction.question?.question && (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3.5 py-2.5 rounded-xl rounded-tr-sm text-sm leading-relaxed"
          style={{ backgroundColor: 'rgba(254,205,140,0.12)', border: '1px solid rgba(254,205,140,0.15)', color: 'rgba(255,255,255,0.85)' }}>
          {interaction.question.question}
        </div>
      </div>
    )}
    <div className="flex gap-2.5">
      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
        style={{ backgroundColor: 'rgba(254,205,140,0.1)', border: '1px solid rgba(254,205,140,0.2)' }}>
        <Sparkles size={11} style={{ color: '#FECD8C' }} />
      </div>
      <div className="flex-1 min-w-0">
        {interaction.sourceText && (
          <div className="mb-2 px-3 py-2 rounded-lg text-xs leading-relaxed italic"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderLeft: '2px solid rgba(254,205,140,0.3)', color: 'rgba(255,255,255,0.45)' }}>
            "{interaction.sourceText.slice(0, 180)}{interaction.sourceText.length > 180 ? '…' : ''}"
          </div>
        )}
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {interaction.answer.answer}
        </p>
        {interaction.answer.followUpSuggestions?.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {interaction.answer.followUpSuggestions.map(s => (
              <button key={s} onClick={() => onFollowUp?.(s)}
                className="px-2.5 py-1 rounded-full text-[11px] transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(254,205,140,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
                {s}
              </button>
            ))}
          </div>
        ) : null}
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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <span>{deck.deckTitle}</span>
        <span>{idx + 1} / {deck.cards.length}</span>
      </div>

      <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2"
            style={{ color: 'rgba(255,255,255,0.25)' }}>Question</div>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {card.front}
          </p>
          {card.tags?.length ? (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {card.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded text-[10px]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>{t}</span>
              ))}
            </div>
          ) : null}
        </div>

        <AnimatePresence>
          {revealed ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2"
                  style={{ color: 'rgba(254,205,140,0.5)' }}>Answer</div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {card.back}
                </p>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Hard', v: 'hard' as const, color: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)', text: 'rgba(252,165,165,0.9)' },
                    { label: 'Fair', v: 'medium' as const, color: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: 'rgba(254,215,170,0.9)' },
                    { label: 'Easy', v: 'easy' as const, color: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: 'rgba(134,239,172,0.9)' },
                  ].map(opt => (
                    <button key={opt.v} onClick={() => onRate(opt.v)}
                      className="py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ backgroundColor: opt.color, border: `1px solid ${opt.border}`, color: opt.text }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="px-4 pb-4">
              <button onClick={onReveal}
                className="w-full py-2.5 rounded-lg text-sm font-medium mt-3 transition-all"
                style={{ backgroundColor: '#FECD8C', color: '#000' }}>
                Reveal Answer
              </button>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex gap-2">
        <button onClick={() => onNav('prev')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
          <ArrowLeft size={13} /> Prev
        </button>
        <button onClick={() => onNav('next')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
          Next <ArrowRight size={13} />
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
  const selectedTextPreview = selectedText ? `${selectedText.slice(0, 160)}${selectedText.length > 160 ? '…' : ''}` : '';

  const readerBg = settings.theme === 'dark' ? '#0a0a0a' : settings.theme === 'sepia' ? '#f5f1e8' : '#ffffff';
  const readerText = settings.theme === 'dark' ? '#e5e5e5' : settings.theme === 'sepia' ? '#3c2a1e' : '#111111';

  // Persist settings
  useEffect(() => { localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings)); }, [settings]);

  // Load thread + deck when module changes
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

  // Text selection handler
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
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
    const st = payload?.selectedText ?? selectedText || undefined;
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

  // Quick question prompts
  const quickPrompts = [
    `What is the core concept in "${currentModule.title}"?`,
    'What are common mistakes to avoid here?',
    'Give me a practical real-world example.',
  ];

  // Panel header divider style
  const dividerStyle = { borderColor: 'rgba(255,255,255,0.06)' };

  // ─── Render Study Panel ───────────────────────────────────────────────────
  const renderPanel = () => (
    <div className="flex flex-col h-full"
      style={{ backgroundColor: '#0e0e0e', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Panel Header */}
      <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(254,205,140,0.6)' }}>
              Study Assistant
            </div>
            <h3 className="text-sm font-semibold leading-tight truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {currentModule.title}
            </h3>
          </div>
          <button onClick={() => setPanelOpen(false)}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
            <X size={14} />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          {([
            { t: 'doubt' as StudyTool, label: 'Ask', icon: MessageCircle },
            { t: 'explain' as StudyTool, label: 'Reframe', icon: Sparkles },
            { t: 'flashcards' as StudyTool, label: 'Cards', icon: Brain },
          ]).map(({ t, label, icon: Icon }) => (
            <button key={t} onClick={() => setActiveTool(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                backgroundColor: activeTool === t ? '#FECD8C' : 'transparent',
                color: activeTool === t ? '#000' : 'rgba(255,255,255,0.4)',
              }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        {/* Selected text chip */}
        {selectedText && (
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg"
            style={{ backgroundColor: 'rgba(254,205,140,0.06)', border: '1px solid rgba(254,205,140,0.15)' }}>
            <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] mt-0.5" style={{ color: 'rgba(254,205,140,0.6)' }}>
              Sel.
            </div>
            <p className="flex-1 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {selectedTextPreview}
            </p>
            <button onClick={() => setSelectedText('')}
              className="shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">

        {/* ── Doubt Tab ── */}
        {activeTool === 'doubt' && (
          <>
            {!threadLoading && doubtHistory.length === 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Suggested
                </div>
                <div className="space-y-1.5">
                  {quickPrompts.map(p => (
                    <button key={p} onClick={() => setQuestionInput(p)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {threadLoading && (
              <div className="flex items-center gap-2 py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <Loader2 size={13} className="animate-spin" />
                <span className="text-xs">Loading history…</span>
              </div>
            )}
            {doubtHistory.map(i => (
              <InteractionCard key={i.id} interaction={i}
                onFollowUp={p => handleFollowUp(p, i.sourceText)} />
            ))}
          </>
        )}

        {/* ── Explain Tab ── */}
        {activeTool === 'explain' && (
          <>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Transform this section
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {EXPLANATION_OPTIONS.map(mode => (
                  <button key={mode} onClick={() => void handleExplain(mode)}
                    disabled={!!explainLoading}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all"
                    style={{
                      backgroundColor: explainLoading === mode ? 'rgba(254,205,140,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${explainLoading === mode ? 'rgba(254,205,140,0.25)' : 'rgba(255,255,255,0.07)'}`,
                      color: explainLoading === mode ? '#FECD8C' : 'rgba(255,255,255,0.55)',
                      opacity: explainLoading && explainLoading !== mode ? 0.4 : 1,
                    }}>
                    <span className="text-base leading-none" style={{ fontFamily: 'monospace' }}>{EXPLANATION_ICONS[mode]}</span>
                    <span className="leading-tight">{EXPLANATION_MODE_LABELS[mode]}</span>
                    {explainLoading === mode && <Loader2 size={11} className="animate-spin ml-auto" />}
                  </button>
                ))}
              </div>
              {contextText && (
                <p className="mt-2 text-[11px] leading-relaxed truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Context: "{contextText.slice(0, 80)}{contextText.length > 80 ? '…' : ''}"
                </p>
              )}
              {explainError && (
                <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(252,165,165,0.8)' }}>
                  <span className="text-xs">{explainError}</span>
                  {lastExplainPayload && (
                    <button onClick={() => void handleExplain(lastExplainPayload.mode, lastExplainPayload.selectedText)}
                      className="shrink-0 ml-2"><RefreshCw size={12} /></button>
                  )}
                </div>
              )}
            </div>
            {explainHistory.length > 0 && <div className="space-y-4">
              {explainHistory.map(i => <InteractionCard key={i.id} interaction={i} onFollowUp={p => handleFollowUp(p, i.sourceText)} />)}
            </div>}
          </>
        )}

        {/* ── Flashcards Tab ── */}
        {activeTool === 'flashcards' && (
          <>
            {!deck ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Generate a recall deck from this chapter. Cards are saved and persist between sessions.
                </p>
                <button onClick={handleGenerateFlashcards} disabled={flashLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: '#FECD8C', color: '#000', opacity: flashLoading ? 0.6 : 1 }}>
                  {flashLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                  {flashLoading ? 'Generating…' : 'Generate Deck'}
                </button>
                {flashError && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(252,165,165,0.8)' }}>
                    <span className="text-xs">{flashError}</span>
                    <button onClick={handleGenerateFlashcards}><RefreshCw size={12} /></button>
                  </div>
                )}
                {deckLoading && <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  <Loader2 size={13} className="animate-spin" /><span className="text-xs">Loading deck…</span>
                </div>}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{deck.cards.length} cards</span>
                  <button onClick={handleGenerateFlashcards} disabled={flashLoading}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <RotateCcw size={11} /> Refresh
                  </button>
                </div>
                <FlashcardView deck={deck} idx={cardIdx} revealed={cardRevealed}
                  onReveal={() => setCardRevealed(true)}
                  onNav={dir => { setCardRevealed(false); setCardIdx(prev => dir === 'prev' ? (prev === 0 ? deck.cards.length - 1 : prev - 1) : (prev + 1) % deck.cards.length); }}
                  onRate={diff => void handleRateCard(diff)} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Doubt Input */}
      {activeTool === 'doubt' && (
        <div className="shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <textarea value={questionInput} onChange={e => setQuestionInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!doubtLoading) void handleAskDoubt(); } }}
              placeholder="Ask anything about this chapter…"
              className="w-full bg-transparent px-4 pt-3 pb-2 text-sm resize-none outline-none leading-relaxed"
              style={{ minHeight: '72px', color: 'rgba(255,255,255,0.8)', caretColor: '#FECD8C' }}
              rows={3} />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>↵ to send</span>
              <div className="flex items-center gap-2">
                {doubtError && lastDoubtPayload && (
                  <button onClick={() => void handleAskDoubt(lastDoubtPayload)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ color: 'rgba(252,165,165,0.7)' }}>
                    <RefreshCw size={11} /> Retry
                  </button>
                )}
                <button onClick={() => void handleAskDoubt()} disabled={doubtLoading || !questionInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: questionInput.trim() ? '#FECD8C' : 'rgba(255,255,255,0.06)',
                    color: questionInput.trim() ? '#000' : 'rgba(255,255,255,0.25)',
                    opacity: doubtLoading ? 0.6 : 1,
                  }}>
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

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#080808', color: 'rgba(255,255,255,0.85)' }}>

      {/* ─── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 shrink-0 flex items-center justify-between gap-4 px-5 h-14"
        style={{ backgroundColor: 'rgba(8,8,8,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div className="min-w-0 hidden sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Study Workspace
            </div>
            <h1 className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {book.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>Chapter</span>
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {selModIdx + 1}/{orderedModules.length}
            </span>
            {moduleProgress > 0 && <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{ color: 'rgba(254,205,140,0.7)' }}>{moduleProgress}%</span>
            </>}
          </div>

          {/* Toggle sidebar */}
          {!isMobile && (
            <button onClick={() => setSidebarOpen(p => !p)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                backgroundColor: sidebarOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: sidebarOpen ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              title="Toggle chapters">
              <PanelLeft size={15} />
            </button>
          )}

          {/* Toggle study panel */}
          {!isMobile && (
            <button onClick={() => setPanelOpen(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: panelOpen ? 'rgba(254,205,140,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${panelOpen ? 'rgba(254,205,140,0.2)' : 'rgba(255,255,255,0.08)'}`,
                color: panelOpen ? '#FECD8C' : 'rgba(255,255,255,0.4)',
              }}>
              <Brain size={13} />
              {panelOpen ? 'Hide' : 'Tutor'}
            </button>
          )}
        </div>
      </header>

      {/* ─── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && !isMobile && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 248, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 flex flex-col overflow-hidden"
              style={{ borderRight: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0a0a0a' }}>
              <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Chapters
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {orderedModules.map((mod, idx) => {
                  const prog = readingProgressUtils.getModuleProgress(book.id, idx)?.percentComplete || 0;
                  const active = idx === selModIdx && surface === 'module';
                  return (
                    <button key={mod.id}
                      onClick={() => { setSelModIdx(idx); setSurface('module'); setSelectedText(''); }}
                      className="w-full text-left px-4 py-3 transition-all relative"
                      style={{
                        backgroundColor: active ? 'rgba(254,205,140,0.05)' : 'transparent',
                        borderLeft: `2px solid ${active ? '#FECD8C' : 'transparent'}`,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <div className="flex items-start gap-2.5">
                        <span className="shrink-0 text-[10px] font-semibold mt-0.5 w-4 text-right"
                          style={{ color: active ? 'rgba(254,205,140,0.7)' : 'rgba(255,255,255,0.2)' }}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-snug"
                            style={{ color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}>
                            {mod.title}
                          </p>
                          {prog > 0 && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${prog}%`, backgroundColor: active ? '#FECD8C' : 'rgba(255,255,255,0.15)' }} />
                              </div>
                              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{prog}%</span>
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

        {/* ─── Reader ─────────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto" id="main-scroll-area">

          {/* Mobile chapter scroll */}
          {isMobile && (
            <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 custom-scrollbar"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {orderedModules.map((mod, idx) => (
                <button key={mod.id}
                  onClick={() => { setSelModIdx(idx); setSurface('module'); }}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                  style={{
                    backgroundColor: idx === selModIdx ? '#FECD8C' : 'rgba(255,255,255,0.04)',
                    color: idx === selModIdx ? '#000' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${idx === selModIdx ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  {idx + 1}. {mod.title}
                </button>
              ))}
            </div>
          )}

          {/* Reader Toolbar */}
          <div className="shrink-0 sticky top-14 z-30 flex items-center justify-between gap-3 px-6 py-2.5"
            style={{ backgroundColor: 'rgba(8,8,8,0.92)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center gap-2">
              {/* Theme */}
              <div className="flex items-center rounded-md overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                {(['dark', 'sepia', 'light'] as const).map(t => (
                  <button key={t} onClick={() => setSettings(p => ({ ...p, theme: t }))}
                    className="w-8 h-7 flex items-center justify-center transition-colors"
                    style={{ backgroundColor: settings.theme === t ? 'rgba(255,255,255,0.1)' : 'transparent', color: settings.theme === t ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }}>
                    {t === 'dark' ? <Moon size={13} /> : t === 'sepia' ? <Palette size={13} /> : <Sun size={13} />}
                  </button>
                ))}
              </div>

              {/* Font size */}
              <div className="flex items-center gap-1 px-2 h-7 rounded-md"
                style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <button onClick={() => setSettings(p => ({ ...p, fontSize: Math.max(13, p.fontSize - 1) }))}
                  style={{ color: 'rgba(255,255,255,0.35)' }}><ZoomOut size={13} /></button>
                <span className="text-[11px] font-medium w-6 text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {settings.fontSize}
                </span>
                <button onClick={() => setSettings(p => ({ ...p, fontSize: Math.min(26, p.fontSize + 1) }))}
                  style={{ color: 'rgba(255,255,255,0.35)' }}><ZoomIn size={13} /></button>
              </div>

              {/* Font family */}
              <div className="relative group hidden md:block">
                <button className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }}>
                  {FONT_LABELS[settings.fontFamily]} <ChevronDown size={11} />
                </button>
                <div className="absolute top-full left-0 mt-1 w-28 rounded-lg overflow-hidden z-20 hidden group-hover:block"
                  style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  {(['sans', 'serif', 'mono'] as const).map(f => (
                    <button key={f} onClick={() => setSettings(p => ({ ...p, fontFamily: f }))}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        fontFamily: FONT_FAMILIES[f],
                        color: settings.fontFamily === f ? '#FECD8C' : 'rgba(255,255,255,0.5)',
                        backgroundColor: settings.fontFamily === f ? 'rgba(254,205,140,0.06)' : 'transparent',
                      }}>
                      {FONT_LABELS[f]}
                      {settings.fontFamily === f && <Check size={11} />}
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
                    <button onClick={onCancelEdit}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                      <X size={11} /> Cancel
                    </button>
                    <button onClick={onSaveFullBook}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: '#FECD8C', color: '#000' }}>
                      <Save size={11} /> Save
                    </button>
                  </div>
                ) : (
                  <button onClick={onEditFullBook}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                    <Edit size={11} /> Edit
                  </button>
                )
              )}
            </div>
          </div>

          {/* Module header */}
          {surface === 'module' && (
            <div className="shrink-0 px-8 pt-10 pb-6 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Chapter {selModIdx + 1} of {orderedModules.length}
                </span>
                {roadmapModule?.estimatedTime && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{roadmapModule.estimatedTime}</span>
                  </>
                )}
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
                {currentModule.title}
              </h2>
              {roadmapModule?.description && (
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '56ch' }}>
                  {roadmapModule.description}
                </p>
              )}
              {roadmapModule?.objectives?.length ? (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roadmapModule.objectives.slice(0, 4).map(obj => (
                    <div key={obj} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: 'rgba(254,205,140,0.6)' }} />
                      <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{obj}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Divider */}
          {surface === 'module' && <div className="mx-8 max-w-4xl" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />}

          {/* Content area */}
          <div className="flex-1 px-8 py-8 mx-auto w-full" style={{ maxWidth: '72rem' }}>
            {surface === 'full_book' && isEditing ? (
              <textarea
                value={editedContent} onChange={e => onContentChange(e.target.value)}
                className="w-full rounded-xl font-mono text-sm leading-relaxed outline-none p-6 resize-none"
                style={{ minHeight: '70vh', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: `${settings.fontSize - 2}px` }} />
            ) : (
              <div ref={contentRef} style={{ maxWidth: MAX_WIDTHS[settings.maxWidth] }}>
                <article className={`prose prose-lg max-w-none ${settings.theme !== 'light' ? 'prose-invert' : ''}`}
                  style={{
                    fontFamily: FONT_FAMILIES[settings.fontFamily],
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: 1.8,
                    color: readerText,
                    '--tw-prose-body': readerText,
                    '--tw-prose-headings': settings.theme === 'dark' ? '#f5f5f5' : '#111',
                  } as React.CSSProperties}>
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
            <div className="shrink-0 flex items-center justify-between gap-4 px-8 py-5 mt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => { if (selModIdx > 0) { setSelModIdx(s => s - 1); setSurface('module'); } }}
                disabled={selModIdx === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { if (selModIdx > 0) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                <ArrowLeft size={14} /> Previous
              </button>
              <button
                onClick={() => { if (selModIdx < orderedModules.length - 1) { setSelModIdx(s => s + 1); setSurface('module'); } }}
                disabled={selModIdx === orderedModules.length - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                style={{ backgroundColor: '#FECD8C', color: '#000' }}>
                Next <ArrowRight size={14} />
              </button>
            </div>
          )}
        </main>

        {/* ─── Study Panel (desktop) ─────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {panelOpen && !isMobile && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden">
              <div className="w-[340px] h-full flex flex-col">
                {renderPanel()}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile FAB */}
      {(!panelOpen || isMobile) && (
        <button onClick={() => setPanelOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-sm font-semibold shadow-2xl transition-all"
          style={{ backgroundColor: '#FECD8C', color: '#000', boxShadow: '0 8px 32px rgba(254,205,140,0.25)' }}>
          <Brain size={16} /> Ask Tutor
        </button>
      )}

      {/* Mobile Study Panel */}
      <AnimatePresence>
        {isMobile && panelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setPanelOpen(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.45 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden"
              style={{ maxHeight: '88vh', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
              </div>
              <div className="flex flex-col" style={{ maxHeight: 'calc(88vh - 16px)' }}>
                {renderPanel()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
