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
  ChevronDown,
  ChevronUp,
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
  Target,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
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
const EXPANDED_MAX_WIDTHS = { narrow: '64ch', medium: '80ch', wide: '94ch' };
const DESKTOP_PANEL_WIDTH = 296;

const EXPLANATION_OPTIONS: ExplanationMode[] = [
  'simpler', 'deeper', 'step_by_step', 'analogy', 'exam_focused', 'practical',
];

const EXPLANATION_META: Record<ExplanationMode, { badge: string; icon: string; color: string; hint: string }> = {
  simpler: { badge: 'S', icon: 'S', color: '#60a5fa', hint: 'Strip away the jargon and make it easy to grasp.' },
  deeper: { badge: 'D', icon: 'D', color: '#a78bfa', hint: 'Go under the hood and connect the bigger ideas.' },
  step_by_step: { badge: '123', icon: '123', color: '#34d399', hint: 'Break the concept into a clean sequence.' },
  analogy: { badge: 'IRL', icon: 'IRL', color: '#fbbf24', hint: 'Use a comparison so it clicks faster.' },
  exam_focused: { badge: 'EX', icon: 'EX', color: '#f87171', hint: 'Condense the parts most likely to matter in tests.' },
  practical: { badge: 'DO', icon: 'DO', color: '#fb923c', hint: 'Turn the idea into action, examples, and usage.' },
};

const normalizeSelection = (v: string) => v.replace(/\s+/g, ' ').trim().slice(0, 900);
const WIDTH_LABELS: Record<ReadingSettings['maxWidth'], string> = {
  narrow: 'Focus',
  medium: 'Balance',
  wide: 'Roomy',
};
const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const getReadMinutes = (wordCount: number) => Math.max(1, Math.ceil(wordCount / 220));
const formatReadMinutes = (wordCount: number) => `${getReadMinutes(wordCount)} min read`;
const toTitleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

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
const SurfaceToggle = ({
  value,
  onChange,
  accentColor,
  activeTextColor,
  borderColor,
  mutedTextColor,
  surfaceColor,
}: {
  value: ReaderSurface;
  onChange: (v: ReaderSurface) => void;
  accentColor: string;
  activeTextColor: string;
  borderColor: string;
  mutedTextColor: string;
  surfaceColor: string;
}) => (
  <div
    className="inline-flex items-center gap-1 overflow-hidden p-1"
    style={{ borderRadius: 20, border: `1px solid ${borderColor}`, background: surfaceColor }}
  >
    {([
      { v: 'module' as const, label: 'Chapters', icon: BookOpen },
      { v: 'full_book' as const, label: 'Full Book', icon: BookText },
    ] as const).map(({ v, label, icon: Icon }) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        className="flex h-8 min-w-[110px] items-center justify-center gap-1.5 rounded-full px-4 text-[11px] font-semibold transition-all"
        style={{
          background: value === v ? accentColor : 'transparent',
          color: value === v ? activeTextColor : mutedTextColor,
          letterSpacing: '0.02em',
          boxShadow: value === v ? '0 10px 24px rgba(0,0,0,0.12)' : 'none',
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
}: { interaction: StudyInteraction; onFollowUp?: (p: string) => void }) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
      whileHover={{ y: -1.5 }}
      className="space-y-2.5 rounded-[22px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.18)]"
    >
      {interaction.question?.question && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.04, duration: 0.2 }}
          className="flex justify-end"
        >
          <div
            className="max-w-[84%] rounded-[16px] border border-[rgba(254,205,140,0.16)] bg-[linear-gradient(180deg,rgba(254,205,140,0.12),rgba(254,205,140,0.06))] px-3 py-2.5 text-[12px] leading-6 text-white/88 shadow-[0_10px_24px_rgba(254,205,140,0.07)]"
            style={{ borderRadius: '14px 14px 4px 14px' }}
          >
            {interaction.question.question}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.24 }}
        className="flex gap-3 rounded-[18px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.06))] p-3"
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(254,205,140,0.18)] bg-[rgba(254,205,140,0.1)]">
          <Sparkles size={10} style={{ color: '#FECD8C' }} />
        </div>

        <div className="min-w-0 flex-1">
          {interaction.sourceText && (
            <div className="mb-3 rounded-[14px] border border-white/[0.05] bg-white/[0.03] px-3 py-2 text-[10px] leading-5 italic text-white/42">
              "{interaction.sourceText.slice(0, 180)}{interaction.sourceText.length > 180 ? '...' : ''}"
            </div>
          )}

          <div className="chat-md text-[12.5px] leading-6 text-white/74">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-white/90">{children}</strong>,
              em: ({ children }) => <em className="italic text-white/68">{children}</em>,
              ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-white/68">{children}</ul>,
              ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-white/68">{children}</ol>,
              li: ({ children }) => <li className="leading-5">{children}</li>,
              code: ({ children }) => <code className="rounded px-1 py-0.5 font-mono text-[11px]" style={{ background: 'rgba(255,255,255,0.07)', color: '#FECD8C' }}>{children}</code>,
            }}>
              {interaction.answer.answer}
            </ReactMarkdown>
          </div>

          {(interaction.answer.followUpSuggestions?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {interaction.answer.followUpSuggestions!.map(s => (
                <button
                  key={s}
                  onClick={() => onFollowUp?.(s)}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/48 transition-all hover:border-[rgba(254,205,140,0.28)] hover:bg-[rgba(254,205,140,0.06)] hover:text-white/78"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
          {deck.deckTitle}
        </span>
        <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-mono text-white/30">
          {idx + 1} / {deck.cards.length}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: '#FECD8C' }}
        />
      </div>

      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(254,205,140,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] shadow-[0_24px_54px_rgba(0,0,0,0.24)]"
      >
        <div className="p-5">
          <div className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/28">
            Question
          </div>
          <div className="text-[15px] font-semibold leading-7 text-white/88 flashcard-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-white/96">{children}</strong>,
              em: ({ children }) => <em className="italic text-white/72">{children}</em>,
              code: ({ children }) => <code className="rounded px-1 font-mono text-[13px]" style={{ background: 'rgba(255,255,255,0.08)', color: '#FECD8C' }}>{children}</code>,
            }}>
              {card.front}
            </ReactMarkdown>
          </div>
          {(card.tags?.length ?? 0) > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {card.tags!.map(t => (
                <span
                  key={t}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28"
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
              <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">
                <div className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[rgba(254,205,140,0.6)]">
                  Answer
                </div>
                <div className="text-[13px] leading-7 text-white/68 flashcard-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-white/90">{children}</strong>,
                    em: ({ children }) => <em className="italic text-white/60">{children}</em>,
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-5">{children}</li>,
                    code: ({ children }) => <code className="rounded px-1 font-mono text-[12px]" style={{ background: 'rgba(255,255,255,0.07)', color: '#FECD8C' }}>{children}</code>,
                  }}>
                    {card.back}
                  </ReactMarkdown>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Hard', v: 'hard' as const, bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.22)', text: 'rgba(252,165,165,0.9)' },
                    { label: 'Fair', v: 'medium' as const, bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.22)', text: 'rgba(254,215,170,0.9)' },
                    { label: 'Easy', v: 'easy' as const, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: 'rgba(134,239,172,0.9)' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => onRate(opt.v)}
                      className="rounded-2xl py-2.5 text-xs font-semibold transition-all"
                      style={{ background: opt.bg, border: `1px solid ${opt.border}`, color: opt.text, borderRadius: 6 }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="px-5 pb-5">
              <button
                onClick={onReveal}
                className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:translate-y-[-1px]"
                style={{ background: '#FECD8C', color: '#000', borderRadius: 6 }}
              >
                Reveal Answer
              </button>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onNav('prev')}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] py-2.5 text-xs font-medium text-white/48 transition-all hover:border-white/[0.14] hover:text-white/72"
        >
          <ArrowLeft size={12} /> Prev
        </button>
        <button
          onClick={() => onNav('next')}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] py-2.5 text-xs font-medium text-white/48 transition-all hover:border-white/[0.14] hover:text-white/72"
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
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

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
  const [heroOpen, setHeroOpen] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
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
  const [liveModuleProgress, setLiveModuleProgress] = useState(
    () => readingProgressUtils.getModuleProgress(book.id, resumeState?.moduleIndex || 0)?.percentComplete || 0
  );
  const [liveFullBookProgress, setLiveFullBookProgress] = useState(
    () => readingProgressUtils.getFullBookProgress(book.id)?.percentComplete || 0
  );

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
  const moduleProgress = liveModuleProgress;
  const selectedTextPreview = selectedText ? `${selectedText.slice(0, 150)}${selectedText.length > 150 ? '…' : ''}` : '';

  const rt = READER_THEMES[settings.theme];
  const accentTextColor = settings.theme === 'dark' ? '#111111' : '#FFFFFF';
  const readerShellMaxWidth = panelOpen
    ? (sidebarOpen ? '76rem' : '82rem')
    : (sidebarOpen ? '94rem' : '108rem');
  const readerContentMaxWidth = panelOpen ? MAX_WIDTHS[settings.maxWidth] : EXPANDED_MAX_WIDTHS[settings.maxWidth];

  useEffect(() => {
    setSidebarOpen(!isMobile);
    setPanelOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => { localStorage.setItem('pustakam-reading-settings', JSON.stringify(settings)); }, [settings]);

  useEffect(() => {
    if (!panelOpen || activeTool !== 'doubt' || !questionInputRef.current) return;
    requestAnimationFrame(() => questionInputRef.current?.focus());
  }, [panelOpen, activeTool, currentModule?.id]);

  useEffect(() => {
    if (!questionInputRef.current) return;
    const input = questionInputRef.current;
    input.style.height = '0px';
    input.style.height = `${Math.min(input.scrollHeight, 148)}px`;
  }, [questionInput]);

  useEffect(() => {
    const nextResume = readingProgressUtils.getResumeState(book.id);
    if (!nextResume) return;
    setSelModIdx(Math.max(0, Math.min(nextResume.moduleIndex, Math.max(orderedModules.length - 1, 0))));
    setSurface(nextResume.mode);
  }, [book.id, orderedModules.length]);

  useEffect(() => {
    setLiveModuleProgress(readingProgressUtils.getModuleProgress(book.id, selModIdx)?.percentComplete || 0);
  }, [book.id, selModIdx]);

  useEffect(() => {
    setLiveFullBookProgress(readingProgressUtils.getFullBookProgress(book.id)?.percentComplete || 0);
  }, [book.id]);

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

  useEffect(() => {
    if (!content) return;
    if (surface === 'full_book' && isEditing) return;

    const scrollEl = (document.getElementById('main-scroll-area') as HTMLElement | null) || document.documentElement;
    const savedProgress = surface === 'full_book'
      ? readingProgressUtils.getFullBookProgress(book.id)
      : readingProgressUtils.getModuleProgress(book.id, selModIdx);

    requestAnimationFrame(() => {
      scrollEl.scrollTo({
        top: savedProgress?.scrollPosition || 0,
        behavior: 'auto',
      });
    });
  }, [book.id, content, surface, selModIdx, isEditing]);

  useEffect(() => {
    if (!content) return;
    if (surface === 'full_book' && isEditing) return;

    const scrollEl = (document.getElementById('main-scroll-area') as HTMLElement | null) || document.documentElement;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const saveReadingProgress = () => {
      const maxScroll = Math.max(1, scrollEl.scrollHeight - scrollEl.clientHeight);
      const scrollPosition = scrollEl.scrollTop;
      const percent = Math.min(100, Math.max(0, (scrollPosition / maxScroll) * 100));

      readingProgressUtils.saveBookmark(book.id, selModIdx, scrollPosition, percent, surface);
      if (surface === 'full_book') setLiveFullBookProgress(percent);
      else setLiveModuleProgress(percent);
    };

    const onScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(saveReadingProgress, 120);
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, [book.id, content, surface, selModIdx, isEditing]);

  if (!currentModule) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
      No module content available.
    </div>
  );

  const chapterProgressList = orderedModules.map((module, index) => ({
    module,
    progress: index === selModIdx
      ? liveModuleProgress
      : readingProgressUtils.getModuleProgress(book.id, index)?.percentComplete || 0,
  }));
  const completedModules = chapterProgressList.filter(item => item.progress >= 95).length;
  const totalWords = book.totalWords || orderedModules.reduce((sum, module) => sum + (module.wordCount || countWords(module.content || '')), 0);
  const currentWordCount = surface === 'full_book'
    ? totalWords
    : currentModule.wordCount || countWords(currentModule.content || '');
  const fullBookProgress = liveFullBookProgress > 0
    ? liveFullBookProgress
    : Math.round((completedModules / Math.max(orderedModules.length, 1)) * 100);
  const readerProgress = surface === 'full_book' ? fullBookProgress : moduleProgress;
  const currentReadLabel = surface === 'full_book'
    ? book.roadmap?.estimatedReadingTime || formatReadMinutes(totalWords)
    : roadmapModule?.estimatedTime || formatReadMinutes(currentWordCount);
  const surfaceLabel = surface === 'full_book' ? 'Full book studio' : `Chapter ${selModIdx + 1} focus`;
  const surfaceTitle = surface === 'full_book' ? book.title : currentModule.title;
  const surfaceDescription = surface === 'full_book'
    ? 'Review the full manuscript in one place while the tutor stays anchored to your active chapter for precise help.'
    : roadmapModule?.description || 'Stay in this chapter to keep questions, reframes, and flashcards aligned with the right context.';
  const moduleObjectiveList = roadmapModule?.objectives?.slice(0, 4) || [];
  const bookmarkStats = readingProgressUtils.getBookmarkStats(book.id);
  const lastReadLabel = bookmarkStats.hasBookmark && bookmarkStats.lastReadDate
    ? readingProgressUtils.formatLastRead(bookmarkStats.lastReadDate)
    : 'Start here';
  const heroStats = [
    {
      label: 'Reading progress',
      value: `${Math.round(readerProgress)}%`,
      detail: surface === 'full_book' ? 'Across the full study book' : 'Inside this chapter',
    },
    {
      label: surface === 'full_book' ? 'Chapter coverage' : 'Chapter length',
      value: surface === 'full_book' ? `${completedModules}/${orderedModules.length}` : `${currentWordCount.toLocaleString()}`,
      detail: surface === 'full_book' ? 'Chapters essentially completed' : 'Words ready for review',
    },
    {
      label: 'Study time',
      value: currentReadLabel,
      detail: `Last read ${lastReadLabel}`,
    },
    {
      label: 'Tutor activity',
      value: `${interactions.length}`,
      detail: `${doubtHistory.length} doubts · ${explainHistory.length} reframes`,
    },
  ];


  const appendInteraction = (interaction: StudyInteraction) => {
    setThread(prev => ({
      id: prev?.id || `${book.id}:${currentModule.id}`,
      bookId: book.id, moduleId: currentModule.id, moduleTitle: currentModule.title,
      interactions: [...(prev?.interactions || []), interaction], updatedAt: new Date(),
    }));
  };

  const handleClearChat = async () => {
    if (!currentModule) return;
    setClearingChat(true);
    try {
      await learningService.clearModuleThread(book.id, currentModule.id);
      setThread(null);
    } catch {
      showToast('Could not clear chat.', 'error');
    } finally {
      setClearingChat(false);
    }
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
    `Break "${currentModule.title}" into plain language`,
    'Give me one example that makes this stick',
    'What part of this chapter usually trips people up?',
  ];

  // ─── Study Panel ─────────────────────────────────────────────────────────
  const renderPanel = () => (
    <div className="flex h-full flex-col border-l border-white/[0.06] bg-[linear-gradient(180deg,#121212,#0b0b0b)] text-white/84">
      {/* Panel header */}
      <div className="shrink-0 border-b border-white/[0.06] px-4 pb-2.5 pt-3">
        {/* Top row: label + clear + close */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-[rgba(254,205,140,0.72)]">Study Companion</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-white/40 max-w-[140px]">{currentModule.title}</p>
          </div>
          <div className="flex items-center gap-1">
            {/* Clear chat */}
            {interactions.length > 0 && (
              <button
                onClick={handleClearChat}
                disabled={clearingChat}
                title="Clear chat history"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/36 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              >
                {clearingChat ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              </button>
            )}
            <button
              onClick={() => setPanelOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/42 transition-all hover:bg-white/[0.08] hover:text-white/72"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Compact stats */}


        {/* Tab switcher */}
        <div className="flex gap-1 rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-1">
          {([
            { t: 'doubt' as StudyTool, label: 'Ask', icon: MessageCircle },
            { t: 'explain' as StudyTool, label: 'Reframe', icon: Sparkles },
            { t: 'flashcards' as StudyTool, label: 'Cards', icon: Brain },
          ] as const).map(({ t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setActiveTool(t)}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-all ${
                activeTool === t ? 'bg-[#FECD8C] text-black' : 'text-white/38 hover:text-white/70'
              }`}
              style={{ boxShadow: activeTool === t ? '0 12px 28px rgba(254,205,140,0.14)' : 'none' }}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        {/* Context pin */}
        {selectedText && (
          <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-[rgba(254,205,140,0.14)] bg-[rgba(254,205,140,0.05)] px-2.5 py-1.5">
            <span className="flex-1 truncate text-[10px] text-[rgba(254,205,140,0.72)]">"{selectedTextPreview}"</span>
            <button onClick={() => setSelectedText('')} className="shrink-0 text-[9px] text-white/36 hover:text-white/68 transition-all">✕</button>
          </div>
        )}
      </div>

      {/* Panel body — gets all remaining height */}
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4">

        {/* ── DOUBT TAB ── */}
        {activeTool === 'doubt' && (
          <>
            {!threadLoading && doubtHistory.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-[18px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.08))] px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-white/82">
                    Ask for a simpler explanation, a real-world example, or a quick memory trick.
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-white/44">
                    I stay tied to this chapter, so answers stay focused instead of generic.
                  </p>
                </div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Suggested Questions
                </p>
                <div className="space-y-1.5">
                  {quickPrompts.map(p => (
                    <button
                      key={p}
                      onClick={() => setQuestionInput(p)}
                      className="w-full rounded-[16px] border px-3 py-2.5 text-left text-[11px] leading-5 transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        borderColor: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.48)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(254,205,140,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.78)'; e.currentTarget.style.background = 'rgba(254,205,140,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.48)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
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
                <span className="text-[11px]">Loading history...</span>
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
                      className="flex items-center gap-2 rounded-[16px] px-3 py-2.5 text-left text-[11px] font-medium transition-all"
                      style={{
                        background: isActive ? `${meta.color}12` : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${isActive ? `${meta.color}30` : 'rgba(255,255,255,0.07)'}`,
                        color: isActive ? meta.color : 'rgba(255,255,255,0.52)',
                        opacity: explainLoading && !isActive ? 0.35 : 1,
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
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-semibold transition-all"
                  style={{ background: '#FECD8C', color: '#000', opacity: flashLoading ? 0.6 : 1 }}
                >
                  {flashLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                  {flashLoading ? 'Generating...' : 'Generate Deck'}
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
                    <span className="text-[11px]">Loading deck...</span>
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
        <div className="shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.018))',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {selectedText && (
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
                <span className="truncate text-[10px] font-medium text-[rgba(254,205,140,0.74)]">
                  Pinned: {selectedTextPreview}
                </span>
                <button
                  onClick={() => setSelectedText('')}
                  className="shrink-0 rounded-full border border-white/[0.08] px-2 py-0.5 text-[9px] font-semibold text-white/44 transition-all hover:text-white/76"
                >
                  Clear
                </button>
              </div>
            )}
            <textarea
              ref={questionInputRef}
              value={questionInput}
              onChange={e => setQuestionInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!doubtLoading) void handleAskDoubt();
                }
              }}
              placeholder={selectedText ? 'Ask about the highlighted passage...' : 'Ask for a clearer explanation, example, or shortcut...'}
              className="w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] leading-6 outline-none"
              style={{ minHeight: '54px', maxHeight: '148px', color: 'rgba(255,255,255,0.8)', caretColor: '#FECD8C' }}
              rows={2}
            />
            <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.24)' }}>Enter to send</span>
              <div className="flex items-center gap-2">
                {doubtError && lastDoubtPayload && (
                  <button
                    onClick={() => void handleAskDoubt(lastDoubtPayload)}
                    className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px]"
                    style={{ color: 'rgba(252,165,165,0.7)' }}
                  >
                    <RefreshCw size={10} /> Retry
                  </button>
                )}
                <button
                  onClick={() => void handleAskDoubt()}
                  disabled={doubtLoading || !questionInput.trim()}
                  className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold transition-all"
                  style={{
                    background: questionInput.trim() ? '#FECD8C' : 'rgba(255,255,255,0.05)',
                    color: questionInput.trim() ? '#000' : 'rgba(255,255,255,0.22)',
                    opacity: doubtLoading ? 0.6 : 1,
                    boxShadow: questionInput.trim() ? '0 14px 30px rgba(254,205,140,0.14)' : 'none',
                  }}
                >
                  {doubtLoading ? <Loader2 size={11} className="animate-spin" /> : <MessageCircle size={11} />}
                  Send
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
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: 'radial-gradient(circle at top left, rgba(254,205,140,0.09), transparent 24%), radial-gradient(circle at 85% 12%, rgba(96,165,250,0.08), transparent 22%), #080808',
        color: 'rgba(255,255,255,0.84)',
      }}
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex h-[64px] shrink-0 items-center justify-between gap-4 px-5"
        style={{
          background: 'rgba(8,8,8,0.82)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-white/52 transition-all hover:border-white/[0.14] hover:text-white/82"
          >
            <ArrowLeft size={12} /> Back
          </button>

          <div className="hidden sm:block min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em]" style={{ color: 'rgba(254,205,140,0.6)' }}>
              Study Workspace
            </p>
            <h1 className="text-[14px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.84)' }}>
              {book.title}
            </h1>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Chapter / progress badge */}
          <div
            className="hidden h-10 items-center gap-1.5 rounded-[16px] border px-3.5 text-[11px] sm:flex"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
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
              className="flex h-10 w-10 items-center justify-center rounded-[16px] border transition-all"
              style={{
                background: sidebarOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: sidebarOpen ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
              title="Toggle chapters"
            >
              <List size={15} />
            </button>
          )}

          {!isMobile && (
            <button
              onClick={() => setPanelOpen(p => !p)}
              className="flex h-10 items-center gap-1.5 rounded-[16px] border px-3.5 text-[11px] font-semibold transition-all"
              style={{
                background: panelOpen ? 'rgba(254,205,140,0.09)' : 'rgba(255,255,255,0.04)',
                borderColor: panelOpen ? 'rgba(254,205,140,0.2)' : 'rgba(255,255,255,0.08)',
                color: panelOpen ? '#FECD8C' : 'rgba(255,255,255,0.38)',
                boxShadow: panelOpen ? '0 12px 28px rgba(254,205,140,0.08)' : 'none',
              }}
            >
              <MessageCircle size={12} />
              {panelOpen ? 'Hide' : 'Companion'}
            </button>
          )}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ overflowX: 'hidden' }}>

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
              {/* Sidebar header — height matches reader toolbar ~44px */}
              <div className="flex items-center px-4" style={{ height: 44, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
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

          {/* Reader toolbar — height matches sidebar header ~44px */}
          <div
            className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-3 px-6"
            style={{
              height: 44,
              background: rt.bg === '#0c0c0c' ? 'rgba(12,12,12,0.95)' : `${rt.bg}f2`,
              borderBottom: `1px solid ${rt.border}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center gap-2">
              {/* Theme switcher */}
              <div
                className="flex items-center overflow-hidden rounded-[18px] border p-1"
                style={{ borderColor: rt.border, background: 'rgba(255,255,255,0.02)' }}
              >
                {(['dark', 'sepia', 'light'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSettings(p => ({ ...p, theme: t }))}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
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
                className="flex h-10 items-center gap-1.5 rounded-[18px] border px-2.5"
                style={{ borderColor: rt.border, background: 'rgba(255,255,255,0.02)' }}
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
                  className="flex h-10 items-center gap-1.5 rounded-[18px] border px-3.5 text-[11px]"
                  style={{ borderColor: rt.border, background: 'rgba(255,255,255,0.02)', color: rt.sub }}
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

              <div
                className="hidden items-center gap-1 overflow-hidden rounded-[20px] border p-1 lg:flex"
                style={{ borderColor: rt.border, background: 'rgba(255,255,255,0.02)' }}
              >
                {(['narrow', 'medium', 'wide'] as const).map(width => (
                  <button
                    key={width}
                    onClick={() => setSettings(p => ({ ...p, maxWidth: width }))}
                    className="flex h-8 min-w-[88px] items-center justify-center rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all"
                    style={{
                      background: settings.maxWidth === width ? `${rt.accent}` : 'transparent',
                      color: settings.maxWidth === width ? accentTextColor : rt.sub,
                    }}
                  >
                    {WIDTH_LABELS[width]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SurfaceToggle
                value={surface}
                onChange={setSurface}
                accentColor={rt.accent}
                activeTextColor={accentTextColor}
                borderColor={rt.border}
                mutedTextColor={rt.sub}
                surfaceColor="rgba(255,255,255,0.03)"
              />

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

          {/* Collapsible chapter overview — collapsed by default so the book is front and center */}
          <div className="shrink-0 px-5 pt-3 pb-0" style={{ maxWidth: readerShellMaxWidth, margin: '0 auto', width: '100%' }}>
            <button
              onClick={() => setHeroOpen(o => !o)}
              className="flex w-full items-center justify-between gap-3 rounded-[16px] border px-4 py-2.5 text-left transition-all"
              style={{
                borderColor: rt.border,
                background: heroOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em]"
                  style={{ borderColor: `${rt.accent}36`, background: `${rt.accent}14`, color: rt.accent }}
                >
                  {surfaceLabel}
                </span>
                <h2 className="truncate text-[13px] font-semibold" style={{ color: rt.text }}>{surfaceTitle}</h2>
                {readerProgress > 0 && (
                  <span className="shrink-0 text-[10px] font-mono" style={{ color: rt.sub }}>{Math.round(readerProgress)}%</span>
                )}
              </div>
              {heroOpen ? <ChevronUp size={13} style={{ color: rt.sub, flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: rt.sub, flexShrink: 0 }} />}
            </button>
          </div>

          {/* Expanded hero details */}
          <AnimatePresence initial={false}>
            {heroOpen && (
              <motion.section
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mx-auto w-full px-5 pb-3 pt-2" style={{ maxWidth: readerShellMaxWidth }}>
                  <div
                    className="overflow-hidden rounded-[24px] border"
                    style={{
                      borderColor: rt.border,
                      background: `radial-gradient(circle at top left, ${rt.accent}10, transparent 40%), linear-gradient(180deg, ${rt.surface}, ${rt.bg})`,
                    }}
                  >
                    {/* Stats row */}
                    <div className="flex flex-wrap gap-3 px-4 py-3 border-b" style={{ borderColor: rt.border }}>
                      {heroStats.map(item => (
                        <div key={item.label} className="min-w-[100px]">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: rt.sub }}>{item.label}</p>
                          <p className="mt-0.5 text-[15px] font-semibold" style={{ color: rt.text }}>{item.value}</p>
                          <p className="text-[10px]" style={{ color: rt.sub }}>{item.detail}</p>
                        </div>
                      ))}
                    </div>

                    {/* Description + goal */}
                    <div className="px-4 py-3">
                      {book.goal && (
                        <div className="mb-2 flex items-start gap-2">
                          <Target size={12} className="mt-0.5 shrink-0" style={{ color: rt.accent }} />
                          <p className="text-[11px] leading-5" style={{ color: rt.sub }}>{book.goal}</p>
                        </div>
                      )}
                      {moduleObjectiveList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {moduleObjectiveList.map(o => (
                            <span key={o} className="rounded-full border px-2.5 py-1 text-[10px] leading-snug" style={{ borderColor: rt.border, color: rt.sub, background: 'rgba(255,255,255,0.025)' }}>{o}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Module header */}
          {false && surface === 'module' && (
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
          {false && surface === 'module' && (
            <div className="mx-8" style={{ height: 1, background: rt.border, maxWidth: MAX_WIDTHS[settings.maxWidth] }} />
          )}

          {/* Content */}
          <div className="mx-auto flex-1 w-full px-8 py-8" style={{ maxWidth: readerShellMaxWidth, overflowX: 'hidden' }}>
            {surface === 'full_book' && isEditing ? (
              <textarea
                value={editedContent}
                onChange={e => onContentChange(e.target.value)}
                className="w-full resize-none rounded-[28px] p-6 font-mono text-sm leading-relaxed outline-none"
                style={{
                  minHeight: '70vh',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${rt.border}`,
                  color: rt.text,
                  fontSize: `${settings.fontSize - 2}px`,
                }}
              />
            ) : (
              <div
                ref={contentRef}
                className="overflow-hidden rounded-[30px] border px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] md:px-7 md:py-8"
                style={{
                  maxWidth: readerContentMaxWidth,
                  width: '100%',
                  boxSizing: 'border-box',
                  borderColor: rt.border,
                  background: `linear-gradient(180deg, ${rt.surface}, ${rt.bg})`,
                }}
              >
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
              animate={{ width: DESKTOP_PANEL_WIDTH, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden"
            >
              <div className="flex h-full flex-col" style={{ width: DESKTOP_PANEL_WIDTH }}>
                {renderPanel()}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile FAB */}
      {isMobile && !panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full pl-4 pr-5 py-3 text-sm font-semibold shadow-2xl transition-all"
          style={{
            background: '#FECD8C',
            color: '#000',
            boxShadow: '0 8px 32px rgba(254,205,140,0.22)',
          }}
        >
          <MessageCircle size={15} /> Ask Tutor
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
