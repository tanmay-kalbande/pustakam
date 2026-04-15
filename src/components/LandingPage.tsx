import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Compass, HardDriveDownload, Home, Menu, MoveRight, Shield, X, Github } from 'lucide-react';
import NebulaBackground from './NebulaBackground';
import LandingChatPanel from './LandingChatPanel';
import LandingHomeContent from './LandingHomeContent';

interface LandingPageProps {
  onLogin: () => void;
  onGetStarted: () => void;
  onSubscribe?: () => void;
  onShowAbout?: () => void;
  onShowTerms?: () => void;
  onShowPrivacy?: () => void;
  onShowCompliance?: () => void;
  onShowDisclaimer?: () => void;
  onShowBlog?: () => void;
}

type LandingTab = 'home' | 'process' | 'demo';

// ── Demo books ────────────────────────────────────────────────
const DEMO_BOOKS = [
  {
    id: 'street-mode',
    mode: 'Street Mode',
    input: 'Stop overthinking and take action',
    title: "Burn the Boat: No More 'Someday' Shit",
    desc: 'Direct, high-energy writing built to push action fast.',
    words: '19,914',
    chapters: '10',
    accent: 'from-amber-400/60 via-orange-300/40 to-white/10',
    eyebrow: 'Street Mode Book',
    url: 'https://cdn.jsdelivr.net/gh/tanmay-kalbande/pustakam-cdn@main/demo-books/Burn_The_Boat_No_More_Someday_Shit.pdf',
  },
  {
    id: 'stellar-mode',
    mode: 'Stellar Mode',
    input: 'Personal finance for young adults',
    title: 'Foundations of Personal Finance',
    desc: 'Structured, professional writing built for calm deep learning.',
    words: '24,152',
    chapters: '12',
    accent: 'from-amber-500/50 via-yellow-400/30 to-emerald-200/10',
    eyebrow: 'Stellar Mode Book',
    url: 'https://cdn.jsdelivr.net/gh/tanmay-kalbande/pustakam-cdn@main/demo-books/Foundations_Of_Personal_Finance.pdf',
  },
] as const;

// ── Testimonials  -  natural, real-sounding ─────────────────────
const TESTIMONIALS = [
  { name: 'Arjun Mehta',     role: 'Software Engineer',   quote: 'Typed "learn Rust from scratch" and had a proper structured book 20 minutes later. Actually used it.' },
  { name: 'Priya Sharma',    role: 'Content Strategist',  quote: 'The structure it generates is honestly better than most long-form learning resources I\'ve tried.' },
  { name: 'Rohan Gupta',     role: 'CS Student',          quote: 'Used it the night before my OS exam. The roadmap alone saved me.' },
  { name: 'Ananya Iyer',     role: 'Creator',             quote: 'Street Mode genuinely slapped. Got roasted into actually understanding machine learning.' },
  { name: 'Vikram Singh',    role: 'Freelancer',          quote: 'A team needed a training doc fast. Pustakam drafted it, I cleaned it up. Done.' },
  { name: 'Sanya Verma',     role: 'Teacher',             quote: 'Made supplementary reading for my class in one afternoon. Students actually read it.' },
  { name: 'Aditya Rao',      role: 'Product Manager',     quote: 'No fluff, no filler. Just the content I needed, structured the way I\'d have done it myself.' },
  { name: 'Kavita Reddy',    role: 'Researcher',          quote: 'Finally something that organizes a topic the way my brain wants to learn it.' },
  { name: 'Ishaan Malhotra', role: 'Project Lead',     quote: 'Built our entire onboarding doc in 30 minutes. Would\'ve taken me a week alone.' },
  { name: 'Meera Deshmukh',  role: 'Writer',              quote: 'I use it for outlines and structure. It scaffolds, I add the voice.' },
];

const TAB_ORDER: LandingTab[] = ['home', 'process', 'demo'];

const desktopVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36, scale: 0.98 }),
  center: {
    opacity: 1, x: 0, scale: 1,
    transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (dir: number) => ({
    opacity: 0, x: dir * -24, scale: 0.98,
    transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] },
  }),
};

// ── Render: Home ──────────────────────────────────────────────
const renderHome = (
  onGetStarted: () => void,
  handleTabChange: (tab: LandingTab) => void,
  currentTestimonialIdx: number,
) => (
  <div className="flex w-full max-w-[960px] flex-col items-center justify-center px-6 py-4 text-center md:items-start md:text-left md:px-8 md:py-0">
    <div className="max-w-[820px]">
      <motion.h1
        className="mx-auto md:mx-0 mb-2 max-w-[760px] text-[42px] font-extrabold leading-[0.94] tracking-[-0.035em] text-white md:text-[50px] lg:text-[58px]"
        style={{ fontFamily: "'Rubik', sans-serif" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.06, ease: 'easeOut' }}
      >
        Build Better
        <span className="block text-white/55">Learning Books</span>
      </motion.h1>

      <motion.p
        className="mx-auto md:mx-0 mb-8 max-w-[620px] px-4 text-[14px] leading-[1.55] text-white/52 md:px-0 md:text-[15px]"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease: 'easeOut' }}
      >
        Type a topic. Get a structured, comprehensive book in minutes.
      </motion.p>
    </div>

    {/* Feature cards */}
    <div className="mb-4 grid w-full max-w-[920px] grid-cols-1 gap-2.5 md:grid-cols-4">
      {[
        {
          title: 'Multi-AI Engine',
          desc: '13+ providers including GPT-5.4, Claude, Gemini, Gemma, Grok & more.',
          sub: 'Bring your own key or use shared access',
          span: 2,
        },
        {
          title: 'Clean Output',
          desc: 'Roadmap, chapters, summary, glossary.',
          sub: null,
          span: 1,
        },
        {
          title: 'No Setup Needed',
          desc: 'Sign up and start generating instantly. No API key required.',
          sub: null,
          span: 1,
        },
      ].map((item, idx) => (
        <div
          key={item.title}
          className={`rounded-[14px] border p-4 text-left backdrop-blur-xl transition-all duration-300 ${
            idx === 0
              ? 'border-amber-400/30 bg-black/50 hover:border-amber-400/50 hover:bg-black/60 md:col-span-2'
              : 'border-white/5 bg-black/40 hover:border-amber-400/20 hover:bg-black/60 md:col-span-1'
          }`}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/75">{item.title}</p>
          <p className="text-[12px] leading-5 text-white/65">{item.desc}</p>
          {item.sub && (
            <p className="mt-1 text-[9px] italic tracking-wide text-white/25">{item.sub}</p>
          )}
        </div>
      ))}
    </div>

    {/* CTA buttons */}
    <div className="mb-4 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row md:items-start">
      <button
        onClick={onGetStarted}
        className="flex w-full items-center justify-center gap-2 rounded-full px-7 py-2.5 text-[12px] font-bold tracking-[0.18em] text-black transition-all sm:w-auto bg-[#FECD8C] hover:bg-[#FFD9A0]"
      >
        Start Building
        <MoveRight className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleTabChange('demo')}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/15 px-7 py-2.5 text-[12px] font-medium tracking-wide text-white/60 transition-all hover:border-amber-500/30 hover:text-white sm:w-auto"
      >
        View Sample Book
      </button>
    </div>

    {/* Testimonial */}
    <div className="mt-4 h-[84px] w-full max-w-md mx-auto md:mx-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTestimonialIdx}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="border-l border-amber-400/25 pl-4 text-left"
        >
          <p className="text-[12px] italic leading-relaxed text-white/60">
            "{TESTIMONIALS[currentTestimonialIdx].quote}"
          </p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
             -  {TESTIMONIALS[currentTestimonialIdx].name}, {TESTIMONIALS[currentTestimonialIdx].role}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>

    {/* Social proof */}
    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mx-auto md:mx-0">
      <span className="text-amber-400/60">•</span>
      <span>Used by learners across 12 countries</span>
    </div>
  </div>
);

// ── Render: Process ───────────────────────────────────────────
const renderProcess = () => (
  <div className="flex min-h-full w-full max-w-6xl flex-col items-center justify-center px-4 py-6 text-center md:min-h-0">
    <div className="mb-6">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400/65">How It Works</span>
      <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl" style={{ fontFamily: "'Inter', sans-serif" }}>
        From Prompt To Book
      </h2>
    </div>

    <motion.div
      className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-4"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.12 } },
      }}
    >
      {[
        { step: '01', title: 'Define Goal', desc: 'Start with one clear learning outcome.', icon: Compass },
        { step: '02', title: 'Generate Roadmap', desc: 'Build the chapter plan automatically.', icon: Home },
        { step: '03', title: 'Write Modules', desc: 'Stream chapter content through the AI engine.', icon: BookOpen },
        { step: '04', title: 'Export Book', desc: 'Ship a polished final book with supporting sections.', icon: HardDriveDownload },
      ].map((item) => (
        <motion.div
          key={item.step}
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-[14px] border border-amber-500/20 bg-black/50 px-5 py-6 text-left backdrop-blur-xl transition-all duration-300 hover:border-amber-500/40 hover:bg-black/60"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">{item.step}</span>
            <item.icon className="h-5 w-5 text-amber-400/60" />
          </div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-white">{item.title}</h3>
          <p className="text-sm leading-relaxed text-white/55">{item.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

// ── Render: Demo ──────────────────────────────────────────────
const renderDemo = (
  activeDemoIdx: number,
  setActiveDemoIdx: (i: number) => void,
  handleTabChange: (tab: LandingTab) => void,
  onGetStarted: () => void,
) => {
  const activeBook = DEMO_BOOKS[activeDemoIdx];
  return (
    <div className="flex min-h-full w-full max-w-[860px] flex-col items-center justify-center px-4 py-4 md:min-h-0">
      <div className="mb-4 text-center">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400/65">Sample Output</span>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-[42px]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Review A Real Book
        </h2>
        <p className="mt-2 text-sm text-white/55">See the tone, cover, and final export without the extra clutter.</p>
      </div>

      {/* Mode selector */}
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {DEMO_BOOKS.map((book, idx) => (
          <button
            key={book.id}
            onClick={() => setActiveDemoIdx(idx)}
            className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
              idx === activeDemoIdx ? 'border-white bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white'
            }`}
          >
            {book.mode}
          </button>
        ))}
      </div>

      <div className="grid w-full max-w-[860px] grid-cols-1 gap-3 md:grid-cols-[0.86fr_1.14fr]">
        <div className="rounded-[14px] border border-amber-500/20 bg-black/50 p-5 backdrop-blur-md">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">{activeBook.mode}</p>
          <h3 className="mb-3 text-[24px] font-black leading-tight text-white" style={{ fontFamily: "'Rubik', sans-serif" }}>
            {activeBook.title}
          </h3>
          <p className="mb-4 text-sm leading-6 text-white/62">{activeBook.desc}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">Length</p>
              <p className="mt-1 text-sm font-semibold text-white/80">{activeBook.words} words</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">Chapters</p>
              <p className="mt-1 text-sm font-semibold text-white/80">{activeBook.chapters}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-amber-500/20 bg-black/50 p-4 backdrop-blur-md">
          <div className="mb-3 rounded-[22px] border border-white/10 bg-[#0a0a0a] p-3">
            <div className={`relative flex h-36 overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${activeBook.accent}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_40%),linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.48))]" />
              <div className="absolute right-3 top-3 h-8 w-8 rounded-full border border-white/20 bg-white/10 backdrop-blur-md" />
              <div className="relative z-10 flex h-full w-full flex-col justify-between p-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/70">{activeBook.eyebrow}</p>
                  <div className="mt-2 h-px w-10 bg-white/25" />
                </div>
                <div>
                  <p className="mb-1.5 text-[9px] uppercase tracking-[0.22em] text-white/60">Pustakam Injin</p>
                  <h3 className="max-w-[180px] text-[18px] font-black leading-tight text-white" style={{ fontFamily: "'Rubik', sans-serif" }}>
                    {activeBook.title}
                  </h3>
                  <p className="mt-1.5 text-[9px] uppercase tracking-[0.2em] text-white/55">
                    {activeBook.chapters} chapters • {activeBook.words} words
                  </p>
                </div>
              </div>
            </div>
          </div>
          <a
            href={activeBook.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all bg-[#FECD8C] hover:bg-[#FFD9A0]"
          >
            <HardDriveDownload className="h-3.5 w-3.5" />
            Download Sample PDF
          </a>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const LandingPage = ({
  onLogin,
  onGetStarted,
  onShowAbout,
  onShowTerms,
  onShowPrivacy,
}: LandingPageProps) => {
  const [activeTab, setActiveTab] = useState<LandingTab>('home');
  const [prevTab, setPrevTab] = useState<LandingTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemoIdx, setActiveDemoIdx] = useState(0);
  const [currentTestimonialIdx, setCurrentTestimonialIdx] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonialIdx((prev: number) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleTabChange = (tab: LandingTab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const getDirection = () => {
    const from = TAB_ORDER.indexOf(prevTab);
    const to   = TAB_ORDER.indexOf(activeTab);
    return to >= from ? 1 : -1;
  };

  const renderDesktopContent = () => {
    switch (activeTab) {
      case 'process': return renderProcess();
      case 'demo':    return renderDemo(activeDemoIdx, setActiveDemoIdx, handleTabChange, onGetStarted);
      default:
        return (
          <LandingHomeContent
            onGetStarted={onGetStarted}
            onOpenDemo={() => handleTabChange('demo')}
            currentTestimonialIdx={currentTestimonialIdx}
            testimonials={TESTIMONIALS}
          />
        );
    }
  };

  // ── Mobile content ──────────────────────────────────────────
  const renderMobileContent = () => {
    switch (activeTab) {
      case 'process':
        return (
          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">How it works</p>
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: "'Rubik', sans-serif" }}>
              From idea to book.
            </h2>
            <div className="space-y-3">
              {[
                'Describe the learning goal',
                'Generate the roadmap and chapters',
                'Export a polished book output',
              ].map((step, idx) => (
                <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-white/80">{step}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'demo': {
        const activeBook = DEMO_BOOKS[activeDemoIdx];
        return (
          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex gap-2">
              {DEMO_BOOKS.map((book, i) => (
                <button
                  key={book.id}
                  onClick={() => setActiveDemoIdx(i)}
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] ${
                    activeDemoIdx === i ? 'bg-white text-black' : 'border border-white/15 text-white/70'
                  }`}
                >
                  {book.mode}
                </button>
              ))}
            </div>
            <h2 className="text-2xl font-black leading-tight text-white" style={{ fontFamily: "'Rubik', sans-serif" }}>
              {activeBook.title}
            </h2>
            <p className="text-sm leading-relaxed text-white/70">{activeBook.desc}</p>
            <a
              href={activeBook.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-xs font-black uppercase tracking-[0.2em] text-black"
            >
              <HardDriveDownload className="h-3.5 w-3.5" />
              Download sample PDF
            </a>
          </section>
        );
      }

      default:
        return (
          <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/70">Pustakam Injin</p>
            <h1 className="text-4xl font-black leading-tight text-white" style={{ fontFamily: "'Rubik', sans-serif" }}>
              Build Better
              <span className="block text-white/60">Learning Books</span>
            </h1>
            <p className="text-sm leading-relaxed text-white/70">
              Type a topic and get a structured, comprehensive book in minutes.
            </p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <p className="text-lg font-black text-white">13+</p>
                <p className="text-[11px] uppercase tracking-wide text-white/50">AI Providers</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <p className="text-lg font-black text-white">BYOK</p>
                <p className="text-[11px] uppercase tracking-wide text-white/50">Your Own Keys</p>
              </div>
            </div>
            <button
              onClick={onGetStarted}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black"
            >
              Start Building
              <MoveRight className="h-4 w-4" />
            </button>
            <LandingChatPanel onGetStarted={onGetStarted} compact />
          </section>
        );
    }
  };

  const mobileTabs = [
    { id: 'home' as LandingTab, label: 'Home', icon: Home },
    { id: 'process' as LandingTab, label: 'Process', icon: Compass },
    { id: 'demo' as LandingTab, label: 'Demo', icon: BookOpen },
  ];

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-transparent font-sans text-white selection:bg-amber-500/30 selection:text-white">
      <NebulaBackground />

      {/* ── Header ── */}
      <header
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-4 bg-gradient-to-b from-black via-black/70 to-transparent px-6 py-4 pb-20 md:py-8 pointer-events-none"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
      >
        <div className="pointer-events-auto select-none" onClick={() => handleTabChange('home')}>
          <div className="group flex cursor-pointer items-center gap-2">
            <img src="/white-logo.png" alt="Pustakam AI Logo" className="h-[33px] w-[33px] opacity-90 transition-opacity group-hover:opacity-100 md:h-8 md:w-8" />
            <span className="text-[16px] font-bold tracking-tight text-white/90 transition-colors group-hover:text-white md:text-xl">
              Pustakam<span className="ml-0.5 text-white/40">Injin</span>
            </span>
          </div>
        </div>

        {/* Mobile: start + menu */}
        <div className="flex items-center gap-2.5 md:gap-3">
          <button onClick={onGetStarted} className="pointer-events-auto rounded-full bg-white px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-white/90 md:hidden">
            Start
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="pointer-events-auto rounded-full border border-amber-500/12 bg-amber-500/5 p-2.5 text-white/50 backdrop-blur-md hover:text-white md:hidden"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="pointer-events-auto relative mx-auto hidden items-center rounded-full border border-white/5 bg-white/[0.03] p-1.5 shadow-lg backdrop-blur-md md:flex">
          {[
            { id: 'home' as LandingTab, label: 'Home' },
            { id: 'process' as LandingTab, label: 'How it Works' },
            { id: 'demo' as LandingTab, label: 'Demo' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative z-10 whitespace-nowrap rounded-full px-5 py-2 text-[11px] font-medium uppercase tracking-widest transition-colors duration-200 ${
                activeTab === tab.id ? 'text-white' : 'text-white/35 hover:text-white/65'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-full border border-white/5 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="pointer-events-auto hidden items-center gap-4 md:flex">
          <button 
            onClick={() => alert("The GitHub repository link will be available here shortly!")} 
            className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide opacity-60 transition-opacity hover:opacity-100"
            title="View Source on GitHub"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </button>
          <button onClick={onLogin} className="text-[11px] font-medium uppercase tracking-wide opacity-50 transition-opacity hover:opacity-100">
            Login
          </button>
          <button
            onClick={onGetStarted}
            className="rounded-full bg-white px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-black transition-all hover:scale-105 hover:bg-white/90 active:scale-95"
          >
            Build Your First Book
          </button>
        </div>
      </header>

      {/* ── Mobile Menu Overlay ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)', opacity: 0 }}
            animate={{ clipPath: 'circle(150% at calc(100% - 40px) 40px)', opacity: 1 }}
            exit={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120, duration: 0.8 }}
            className="pointer-events-auto fixed inset-0 z-[100] flex flex-col bg-black/95 p-8 backdrop-blur-xl"
          >
            <div className="mb-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/white-logo.png" alt="Logo" className="h-8 w-8" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold uppercase leading-none tracking-tight text-white">Pustakam Injin</span>
                  <span className="mt-1 text-[9px] font-black uppercase leading-none tracking-widest text-white/20">Open Research Build</span>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white transition-colors hover:text-white/70">
                <X size={32} strokeWidth={2} />
              </button>
            </div>

            <div className="mb-16 flex flex-col gap-8">
              {[
                { id: 'home' as LandingTab, label: 'HOME' },
                { id: 'process' as LandingTab, label: 'PROCESS' },
                { id: 'demo' as LandingTab, label: 'SAMPLE' },
              ].map((tab, idx) => (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx, duration: 0.4 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`text-left text-4xl font-black uppercase tracking-tighter transition-colors duration-300 ${
                    activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white'
                  }`}
                  style={{ fontFamily: "'Rubik', sans-serif" }}
                >
                  {tab.label}
                </motion.button>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 pb-10 backdrop-blur-md">
              <div className="flex flex-col gap-2">
                <span className="mb-1 text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Quick Links</span>
                <button onClick={() => { setMobileMenuOpen(false); onShowAbout?.(); }} className="py-1 text-left text-lg font-medium text-white/60 transition-colors hover:text-white">About</button>
                <button onClick={() => { setMobileMenuOpen(false); onShowPrivacy?.(); }} className="py-1 text-left text-lg font-medium text-white/60 transition-colors hover:text-white">Privacy</button>
                <button onClick={() => { setMobileMenuOpen(false); onShowTerms?.(); }} className="py-1 text-left text-lg font-medium text-white/60 transition-colors hover:text-white">Terms</button>
              </div>
              <button onClick={() => { setMobileMenuOpen(false); onGetStarted(); }} className="flex items-center gap-2 text-left text-xl font-bold text-amber-400 transition-colors hover:text-amber-300">
                <span>Get Started Now</span>
                <MoveRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden md:overflow-visible md:pt-16">
        <div className="relative flex h-full w-full flex-1 flex-col items-center justify-start pt-24 md:justify-center md:pt-0">

          {/* Mobile layout */}
          <div className="flex h-full w-full flex-col overflow-hidden px-4 pb-4 md:hidden">
            <div className="mx-auto flex h-full w-full max-w-md flex-col">
              {/* Mobile tabs */}
              <div className="relative z-20 mb-4 rounded-2xl border border-white/10 bg-black/35 p-2.5 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <div className="grid grid-cols-3 gap-2">
                  {mobileTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`min-h-[62px] rounded-xl border px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 ${
                          activeTab === tab.id
                            ? 'border-white/80 bg-white text-black shadow-[0_6px_20px_rgba(255,255,255,0.18)]'
                            : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/30 hover:bg-white/[0.08]'
                        }`}
                      >
                        <span className="flex flex-col items-center justify-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{tab.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto pr-1"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent, black 40px, black calc(100% - 40px), transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40px, black calc(100% - 40px), transparent)',
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`mobile-${activeTab}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }}
                    className="py-4"
                  >
                    {renderMobileContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Desktop layout  -  no scroll, content fits viewport */}
          <div className="hidden h-full min-h-0 w-full flex-1 flex-col items-center justify-center md:flex">
            <AnimatePresence mode="wait" custom={getDirection()}>
              <motion.div
                key={activeTab}
                custom={getDirection()}
                variants={desktopVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className={`flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 ${activeTab === 'home' ? 'overflow-y-auto pt-20 pb-16' : 'pt-12 pb-24'}`}
              >
                {renderDesktopContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer  -  hidden on Home tab */}
          <footer className={`z-50 w-full border-t border-white/5 bg-black px-6 py-4 md:absolute md:bottom-0 md:left-0 md:right-0 md:bg-black/80 md:py-5 md:backdrop-blur-xl ${activeTab === 'home' ? 'hidden' : ''}`}>
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row md:gap-3">
              <div className="flex items-center gap-4 text-[9px] font-medium uppercase tracking-wider text-white/30 md:text-[10px]">
                <span>&copy; {new Date().getFullYear()} Pustakam Injin</span>
                <span className="hidden md:inline">&bull;</span>
                <span>Pustakam Project</span>
              </div>
              <div className="flex items-center gap-4 md:gap-5">
                <button onClick={onShowAbout}   className="text-[9px] font-medium uppercase tracking-wider text-white/30 transition-colors hover:text-white md:text-[10px]">About</button>
                <button onClick={onShowPrivacy} className="text-[9px] font-medium uppercase tracking-wider text-white/30 transition-colors hover:text-white md:text-[10px]">Privacy</button>
                <button onClick={onShowTerms}   className="text-[9px] font-medium uppercase tracking-wider text-white/30 transition-colors hover:text-white md:text-[10px]">Terms</button>
                <button 
                  onClick={() => alert("The GitHub repository link will be available here shortly!")} 
                  className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider text-white/30 transition-colors hover:text-white md:text-[10px]"
                >
                  <Github className="h-3 w-3" />
                  Source
                </button>
                <span className="hidden items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-white/25 md:inline-flex md:text-[10px]">
                  <Shield className="h-3 w-3" />
                  Secure Proxy
                </span>
              </div>
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
};

export default LandingPage;
