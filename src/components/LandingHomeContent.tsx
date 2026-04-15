import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoveRight } from 'lucide-react';
import LandingChatPanel from './LandingChatPanel';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

interface LandingHomeContentProps {
  onGetStarted: () => void;
  onOpenDemo: () => void;
  currentTestimonialIdx: number;
  testimonials: Testimonial[];
}

export default function LandingHomeContent({
  onGetStarted,
  onOpenDemo,
  currentTestimonialIdx,
  testimonials,
}: LandingHomeContentProps) {
  const activeTestimonial = testimonials[currentTestimonialIdx];

  return (
    <div className="flex w-full max-w-[1240px] flex-col justify-center px-6 py-6 text-center md:px-8 md:py-0 md:text-left">
      <div className="grid w-full items-start gap-6 xl:grid-cols-[minmax(0,1.02fr)_420px]">
        <div className="flex flex-col items-center md:items-start">
          <div className="max-w-[820px]">
            <motion.h1
              className="mx-auto mb-2 max-w-[760px] text-[42px] font-extrabold leading-[0.94] tracking-[-0.035em] text-white md:mx-0 md:text-[50px] lg:text-[58px]"
              style={{ fontFamily: "'Rubik', sans-serif" }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.06, ease: 'easeOut' }}
            >
              Build Better
              <span className="block text-white/55">Learning Books</span>
            </motion.h1>

            <motion.p
              className="mx-auto mb-6 max-w-[650px] px-4 text-[14px] leading-[1.65] text-white/52 md:mx-0 md:px-0 md:text-[15px]"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: 'easeOut' }}
            >
              Type a topic. Get a structured, comprehensive book in minutes. And if someone has a question first, the chat is already open.
            </motion.p>
          </div>

          <div className="mb-4 grid w-full max-w-[920px] grid-cols-1 gap-2.5 md:grid-cols-4">
            {[
              {
                title: 'Multi-AI Engine',
                desc: '13+ providers including GPT-5.4, Claude, Gemini, Gemma, Grok & more.',
                sub: 'Bring your own key or use shared access',
              },
              {
                title: 'Built-In Guide',
                desc: 'A live landing-page assistant answers product questions without extra clicks.',
                sub: 'Fast, crisp, low-friction onboarding',
              },
              {
                title: 'Clean Output',
                desc: 'Roadmap, chapters, summary, glossary.',
                sub: null,
              },
              {
                title: 'No Setup Needed',
                desc: 'Sign up and start generating instantly. No API key required.',
                sub: null,
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                className={`rounded-[14px] border p-4 text-left backdrop-blur-xl transition-all duration-300 ${
                  idx < 2
                    ? 'border-amber-400/22 bg-black/50 hover:border-amber-400/45 hover:bg-black/60 md:col-span-2'
                    : 'border-white/5 bg-black/40 hover:border-amber-400/20 hover:bg-black/60 md:col-span-1'
                }`}
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/75">{item.title}</p>
                <p className="text-[12px] leading-5 text-white/65">{item.desc}</p>
                {item.sub ? (
                  <p className="mt-1 text-[9px] italic tracking-wide text-white/25">{item.sub}</p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mb-4 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row md:items-start">
            <button
              onClick={onGetStarted}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FECD8C] px-7 py-2.5 text-[12px] font-bold tracking-[0.18em] text-black transition-all hover:bg-[#FFD9A0] sm:w-auto"
            >
              Start Building
              <MoveRight className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenDemo}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/15 px-7 py-2.5 text-[12px] font-medium tracking-wide text-white/60 transition-all hover:border-amber-500/30 hover:text-white sm:w-auto"
            >
              View Sample Book
            </button>
          </div>

          <div className="mt-4 h-[84px] w-full max-w-md md:mx-0">
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
                  "{activeTestimonial.quote}"
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
                  - {activeTestimonial.name}, {activeTestimonial.role}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 md:mx-0">
            <span className="text-amber-400/60">•</span>
            <span>Used by learners across 12 countries</span>
          </div>
        </div>

        <div className="w-full max-w-[520px] justify-self-center xl:justify-self-end">
          <LandingChatPanel onGetStarted={onGetStarted} />
        </div>
      </div>
    </div>
  );
}
