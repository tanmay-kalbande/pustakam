import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, MessageSquareMore, Sparkles, Square } from 'lucide-react';
import config from '../config';
import { LandingChatMessage, streamLandingChatReply } from '../services/landingChatService';

interface LandingChatPanelProps {
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

export default function LandingChatPanel({ compact = false }: LandingChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', STARTER_MESSAGE),
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const modelLabel = useMemo(
    () => config.ai.landingChatModel || 'Cerebras / Qwen 3 32B',
    [],
  );

  const isIntroState = messages.length === 1;

  useEffect(() => {
    const endNode = endRef.current;
    if (!scrollRef.current || !endNode) return;

    requestAnimationFrame(() => {
      endNode.scrollIntoView({ block: 'end' });
    });
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
    <section
      className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0a0a0b]/94 shadow-[0_30px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl ${
        compact ? 'min-h-[470px]' : 'min-h-[580px]'
      }`}
    >

      <div className="relative flex h-full flex-col">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/8 px-5 py-4">
          <div />
          <div className="flex items-center gap-2 justify-self-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#FECD8C]/16 bg-[#FECD8C]/8 text-[#FECD8C]">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-[18px] font-medium tracking-[-0.02em] text-white">Pustakam</p>
          </div>
          <div className="justify-self-end rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium text-white/56">
            {modelLabel}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {isIntroState ? (
            <div className="flex min-h-full flex-col justify-center px-2 py-4">
              <div className="mx-auto flex w-full max-w-[360px] flex-col">
                <div className="mb-8 inline-flex w-fit items-center gap-4 rounded-[28px] bg-white/[0.12] px-5 py-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4efe6] text-[#2b2b2b]">
                    <MessageSquareMore className="h-7 w-7" />
                  </span>
                  <span className="text-[24px] font-medium tracking-[-0.03em] text-white">Hello</span>
                </div>

                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/42">
                  {modelLabel}
                </p>
                <p className="mt-4 text-[26px] font-normal leading-[1.45] tracking-[-0.03em] text-white/92">
                  {messages[0]?.content}
                </p>

                <div className="mt-8 flex w-full flex-col gap-2">
                  {SUGGESTED_PROMPTS.slice(0, compact ? 2 : SUGGESTED_PROMPTS.length).map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      disabled={isSending}
                      className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-[12px] text-white/68 transition-all hover:border-[#FECD8C]/24 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'user' ? (
                    <div className="max-w-[86%] rounded-[24px] bg-white/[0.12] px-4 py-3 text-[14px] leading-6 text-white">
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-[92%] px-1 py-2">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/42">
                        {modelLabel}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-[25px] font-normal leading-[1.5] tracking-[-0.03em] text-white/92">
                        {message.content || (isSending ? 'Thinking...' : '')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="border-t border-white/8 px-4 py-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-2">
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
                placeholder="Type your question..."
                className="min-h-[52px] flex-1 resize-none bg-transparent px-3 py-2 text-[13px] leading-6 text-white outline-none placeholder:text-white/28"
              />

              {isSending ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-white/72 transition-all hover:bg-white/[0.1] hover:text-white"
                  title="Stop response"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FECD8C] text-black transition-all hover:bg-[#FFD9A0] disabled:cursor-not-allowed disabled:opacity-45"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-[11px] leading-5 text-rose-300/85">{error}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
