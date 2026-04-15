import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, Loader2, MessageSquareMore, Smile, Square } from 'lucide-react';
import { LandingChatMessage, streamLandingChatReply } from '../services/landingChatService';

interface LandingChatPanelProps {
  compact?: boolean;
}

interface ChatMessage extends LandingChatMessage {
  id: string;
}

const TAGLINES = [
  'Your Book Architect',
  'Your Research Partner',
  'Your Writing Companion',
  'Ask Pustakam AI Anything',
];

const MAX_CONTEXT_MESSAGES = 8;

const markdownComponents = {
  p: ({ children }: any) => <p className="m-0 whitespace-pre-wrap">{children}</p>,
  ul: ({ children }: any) => <ul className="m-0 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }: any) => <ol className="m-0 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }: any) => <li className="pl-1">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[#FECD8C] underline decoration-[#FECD8C]/40 underline-offset-4 transition-colors hover:text-[#FFD9A0]"
    >
      {children}
    </a>
  ),
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[0.95em] text-[#FECD8C]">
        {children}
      </code>
    ) : (
      <pre className="my-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/35 p-3 text-[12px] text-white/82">
        <code>{children}</code>
      </pre>
    ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 border-l-2 border-white/12 pl-4 text-white/72">{children}</blockquote>
  ),
};

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return { id, role, content };
}

function buildConversationPayload(messages: ChatMessage[]): LandingChatMessage[] {
  return messages
    .filter(message => message.content.trim().length > 0)
    .slice(-MAX_CONTEXT_MESSAGES)
    .map(({ role, content }) => ({ role, content }));
}

function PendingReply() {
  return (
    <div className="flex items-center gap-2 text-white/46">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Thinking...</span>
    </div>
  );
}

export default function LandingChatPanel({ compact = false }: LandingChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', 'Expert Guide'),
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [taglineIdx, setTaglineIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const isIntroState = messages.length === 1;
  const visibleMessages = useMemo(
    () => (isIntroState ? [] : messages.slice(1)),
    [isIntroState, messages],
  );

  useEffect(() => {
    if (!isIntroState) return;
    const interval = setInterval(() => {
      setTaglineIdx(prev => (prev + 1) % TAGLINES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isIntroState]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollOptions: ScrollToOptions = {
      top: container.scrollHeight,
      behavior: isSending ? 'auto' : 'smooth',
    };

    requestAnimationFrame(() => {
      container.scrollTo(scrollOptions);
    });
  }, [visibleMessages, isSending]);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;

    textArea.style.height = '0px';
    textArea.style.height = `${Math.min(textArea.scrollHeight, 144)}px`;
  }, [input]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
  };

  const handleSend = async (draft?: string) => {
    const nextInput = (draft ?? input).trim();
    if (!nextInput || isSending) return;

    const userMessage = createMessage('user', nextInput);
    const assistantMessage = createMessage('assistant', '');
    const nextMessages = [...messages, userMessage, assistantMessage];

    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamLandingChatReply(
        buildConversationPayload(nextMessages),
        controller.signal,
        chunk => {
          setMessages(current =>
            current.map(message =>
              message.id === assistantMessage.id
                ? { ...message, content: `${message.content}${chunk}` }
                : message,
            ),
          );
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The assistant is unavailable right now.';
      const fallback =
        message.toLowerCase().includes('abort')
          ? 'Stopped.'
          : 'I could not reach the assistant just now. Please try again in a moment.';

      setMessages(current =>
        current.map(item =>
          item.id === assistantMessage.id
            ? { ...item, content: item.content.trim() ? item.content : fallback }
            : item,
        ),
      );
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  };

  return (
    <section
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0c]/96 shadow-[0_30px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl ${
        compact ? 'h-[420px]' : 'h-[clamp(520px,78vh,740px)]'
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
              <img src="/white-logo.png" className="h-5 w-5 opacity-90" alt="Pustakam AI" />
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-[15px] font-medium tracking-[-0.02em] text-white/92"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              >
                Pustakam AI
              </p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isIntroState ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.12, delayChildren: 0.1 },
                },
              }}
              className="flex min-h-full flex-col justify-center"
            >
              <div className="mx-auto flex w-full max-w-[320px] flex-col items-center text-center">
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 15, scale: 0.8 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                  className="relative mb-8"
                >
                  <motion.div
                    animate={{
                      opacity: [0.15, 0.35, 0.15],
                      scale: [1, 1.25, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 -m-8 scale-150 rounded-full bg-white/10 blur-[40px]"
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] shadow-2xl backdrop-blur-md">
                    <img src="/white-logo.png" className="h-8 w-8 opacity-90" alt="Pustakam AI" />
                  </div>
                </motion.div>

                <motion.h3
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="text-[26px] font-bold tracking-[-0.035em] text-white"
                  style={{ fontFamily: "'Rubik', sans-serif" }}
                >
                  Pustakam AI
                </motion.h3>

                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="mt-2.5 h-6 overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={taglineIdx}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ duration: 0.45, ease: 'easeInOut' }}
                      className="text-[14.5px] font-medium leading-relaxed tracking-tight text-white/35"
                      style={{ fontFamily: "'Rubik', sans-serif" }}
                    >
                      {TAGLINES[taglineIdx]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-5">
              {visibleMessages.map(message => (
                <div
                  key={message.id}
                  className="flex justify-start"
                >
                  {message.role === 'user' ? (
                    <div className="flex max-w-[88%] items-start">
                      <div className="flex items-start gap-2.5 rounded-lg border border-white/[0.05] bg-[#1a1a1b] px-3.5 py-2.5 text-[14px] font-semibold leading-relaxed text-white/90" style={{ fontFamily: "'Rubik', sans-serif" }}>
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/30">
                          <Smile size={12} />
                        </div>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-1.5 px-1 py-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20" style={{ fontFamily: "'Rubik', sans-serif" }}>Pustakam AI</p>
                      <div
                        className="text-[15px] font-semibold leading-[1.6] text-white/85"
                        style={{ fontFamily: "'Rubik', sans-serif" }}
                      >
                        {message.content.trim() ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <PendingReply />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="px-4 pb-5 pt-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-4">
            <div className="flex items-center gap-2">
              <textarea
                ref={textAreaRef}
                autoFocus
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                placeholder="Message Pustakam AI..."
                className="max-h-36 min-h-[38px] flex-1 resize-none bg-transparent py-2 text-[13px] font-semibold leading-relaxed text-white outline-none placeholder:text-white/20"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              />

              {isSending ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/60 transition-all hover:bg-white/[0.1] hover:text-white"
                  title="Stop response"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FECD8C] text-black transition-all hover:bg-[#FFD9A0] disabled:cursor-not-allowed disabled:opacity-45"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
