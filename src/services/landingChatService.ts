export interface LandingChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getLandingChatUrl(): string {
  const rawBase = import.meta.env.VITE_PROXY_URL?.trim();
  if (rawBase) return `${rawBase.replace(/\/+$/, '')}/api/landing-chat`;
  if (import.meta.env.DEV) return '/api/landing-chat';

  throw new Error('Landing chat is enabled but VITE_PROXY_URL is missing. Point it to the proxy base URL.');
}

function extractTextContent(value: unknown): string {
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return value
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const textPart = (part as { text?: unknown }).text;
          if (typeof textPart === 'string') return textPart;
        }
        return '';
      })
      .join('');
  }

  return '';
}

function extractStreamContent(payload: Record<string, unknown>): string {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== 'object') return '';

  const delta = (firstChoice as { delta?: { content?: unknown } }).delta;
  const message = (firstChoice as { message?: { content?: unknown } }).message;

  return extractTextContent(delta?.content) || extractTextContent(message?.content);
}

function splitSseFrames(buffer: string): { frames: string[]; remainder: string } {
  const frames = buffer.split(/\r?\n\r?\n/);
  return {
    frames: frames.slice(0, -1),
    remainder: frames.at(-1) ?? '',
  };
}

export async function streamLandingChatReply(
  messages: LandingChatMessage[],
  signal?: AbortSignal,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const response = await fetch(getLandingChatUrl(), {
    method: 'POST',
    headers: {
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unable to read landing chat error.');
    let errorMessage = errorText;

    try {
      const parsed = JSON.parse(errorText) as { error?: string; message?: string };
      errorMessage = parsed.error || parsed.message || errorText;
    } catch {
      errorMessage = errorText || 'Landing chat failed.';
    }

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error('Landing chat returned an empty response stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  const processFrame = (frame: string) => {
    const trimmedFrame = frame.trim();
    if (!trimmedFrame || trimmedFrame.startsWith(':')) return;

    let eventType = 'message';
    const dataParts: string[] = [];

    for (const line of trimmedFrame.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(':')) continue;
      if (trimmedLine.startsWith('event:')) {
        eventType = trimmedLine.slice(6).trim() || 'message';
        continue;
      }
      if (trimmedLine.startsWith('data:')) {
        dataParts.push(trimmedLine.slice(5).trimStart());
      }
    }

    if (dataParts.length === 0) return;

    const payload = dataParts.join('\n');
    if (payload === '[DONE]') return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return;
    }

    const streamError = typeof parsed.error === 'string' ? parsed.error : null;
    if (eventType === 'error' || streamError) {
      throw new Error(streamError || 'Landing chat stream failed.');
    }

    const content = extractStreamContent(parsed);
    if (!content) return;

    fullContent += content;
    onChunk?.(content);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const split = splitSseFrames(buffer);
    const frames = split.frames;
    buffer = split.remainder;

    for (const frame of frames) processFrame(frame);
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const frame of buffer.split(/\r?\n\r?\n/)) processFrame(frame);
  }

  if (!fullContent.trim()) {
    throw new Error('Landing chat came back empty. Please try again.');
  }

  return fullContent.trim();
}
