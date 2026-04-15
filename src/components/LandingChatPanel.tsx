import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, MessageSquareMore, Square } from 'lucide-react';
import { LandingChatMessage, streamLandingChatReply } from '../services/landingChatService';

interface LandingChatPanelProps {
  onGetStarted: () => void;
  compact?: boolean;
}

interface ChatMessage extends LandingChatMessage {
  id: string;
}

const STARTER_MESSAGE =
  'Hey, ask anything about Pustakam. I will keep it short, useful, and easy to scan.';

const SUGGESTED_PROMPTS = [
  'Can Pustakam make a book for UPSC prep?',
  'How fast can I generate a book here?',
  'What happens after I type a topic?',
];

const MAX_CONTEXT_MESSAGES = 8;

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

export default function LandingChatPanel({ onGetStarted, compact = false }: LandingChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', STARTER_MESSAGE),
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isSending]);

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
    setError(null);
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
      const message = err instanceof Error ? err.message : 'The chat is unavailable right now.';
      const fallback =
        message.toLowerCase().includes('abort')
          ? 'Stopped. Ask again whenever you want.'
          : 'I hit a connection snag. Try again in a moment.';

      setError(message.toLowerCase().includes('abort') ? null : message);
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
    <section className={`overflow-hidden rounded-[26px] border border-white/10 bg-[#0f1012] ${compact ? 'min-h-[540px]' : 'min-h-[610px]'}`}>
      <div className="relative flex h-full flex-col">
        <div className="border-b border-white/8 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70">
                <MessageSquareMore className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-medium tracking-[0.02em] text-white/86">Pustakam guide</p>
                <h3 className="text-[12px] font-normal text-white/46">Always open for quick product questions</h3>
              </div>
            </div>
            <p className="mt-3 max-w-sm text-[12px] leading-5 text-white/44">
              Short replies, clean guidance, and no extra clicks.
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-[20px] px-4 py-3 text-[13px] leading-6 ${
                  message.role === 'user'
                    ? 'bg-white text-black'
                    : 'border border-white/8 bg-[#17181b] text-white/80'
                }`}
              >
                <div className="mb-1.5 flex items-center gap-2 text-[10px] font-medium tracking-[0.02em] opacity-55">
                  {message.role === 'assistant' ? <MessageSquareMore className="h-3.5 w-3.5" /> : null}
                  <span>{message.role === 'assistant' ? 'Pustakam' : 'You'}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">
                  {message.content || (isSending && message.role === 'assistant' ? 'Thinking...' : '')}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 px-4 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.slice(0, compact ? 2 : SUGGESTED_PROMPTS.length).map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => void handleSend(prompt)}
                disabled={isSending}
                className="rounded-full border border-white/10 bg-[#17181b] px-3 py-2 text-left text-[11px] font-normal text-white/62 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[#17181b] p-2">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={compact ? 2 : 3}
                placeholder="Ask what Pustakam can do for you..."
                className="min-h-[54px] flex-1 resize-none bg-transparent px-3 py-2 text-[13px] leading-6 text-white outline-none placeholder:text-white/24"
              />

              {isSending ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] text-white/72 transition-all hover:bg-white/[0.08] hover:text-white"
                  title="Stop response"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black transition-all hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-2 w-2 rounded-full bg-emerald-400/80" />}
              <span>{isSending ? 'Reply streaming...' : 'Ready for questions'}</span>
            </div>
            <button
              type="button"
              onClick={onGetStarted}
              className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-medium tracking-[0.02em] text-white/76 transition-all hover:border-white/24 hover:text-white"
            >
              Start building
            </button>
          </div>

          {error ? (
            <p className="mt-3 text-[11px] leading-5 text-rose-300/80">{error}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
