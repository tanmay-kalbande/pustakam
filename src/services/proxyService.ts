// src/services/proxyService.ts
import { supabase } from '../lib/supabaseClient';
import { ModelID, ModelProvider } from '../types';

// ── Points to Render proxy instead of Vercel Edge Function ────────────────────
// In development:  set VITE_PROXY_URL=http://localhost:3001 in .env
// In production:   set VITE_PROXY_URL=https://your-proxy.onrender.com in Vercel env vars
function getProxyUrl(): string {
  const rawBase = import.meta.env.VITE_PROXY_URL?.trim();
  if (rawBase) return `${rawBase.replace(/\/+$/, '')}/api/ai`;
  if (import.meta.env.DEV) return '/api/ai';

  throw new Error('Proxy is enabled but VITE_PROXY_URL is missing. Set it to your deployed proxy base URL.');
}

function getStoredAccessToken(): string | null {
  try {
    const directAuth = localStorage.getItem('kitaab-auth');
    if (directAuth) {
      const parsed = JSON.parse(directAuth);
      if (typeof parsed?.access_token === 'string' && parsed.access_token) {
        return parsed.access_token;
      }
    }

    const keys = Object.keys(localStorage);
    const authKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (authKey) {
      const parsed = JSON.parse(localStorage.getItem(authKey) || '{}');
      if (typeof parsed?.access_token === 'string' && parsed.access_token) {
        return parsed.access_token;
      }
    }
  } catch (error) {
    console.warn('[ProxyService] failed to read stored auth token', error);
  }

  return null;
}

async function getAccessToken(): Promise<string | null> {
  const sessionTimeoutMs = 1500;

  try {
    const sessionResult = await Promise.race([
      supabase!.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Session lookup timed out after ${sessionTimeoutMs}ms`)), sessionTimeoutMs)
      ),
    ]);

    const token = sessionResult?.data?.session?.access_token || null;
    if (token) return token;
  } catch (error) {
    console.warn('[ProxyService] getSession fallback triggered', error);
  }

  return getStoredAccessToken();
}

export type TaskType = 'roadmap' | 'module' | 'enhance' | 'assemble' | 'glossary';

export async function generateViaProxy(
  prompt: string,
  taskType: TaskType,
  model?: ModelID,
  signal?: AbortSignal,
  onChunk?: (chunk: string) => void,
  bookId?: string,
  provider: ModelProvider = 'mistral'
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Proxy auth cannot start.');
  }

  const requestStartedAt = Date.now();
  console.log('[ProxyService] starting request', {
    taskType,
    provider,
    hasProxyUrl: Boolean(import.meta.env.VITE_PROXY_URL?.trim()),
  });
  console.log('[ProxyService] waiting for Supabase session');
  const accessToken = await getAccessToken();
  console.log('[ProxyService] session lookup completed in', Date.now() - requestStartedAt, 'ms', {
    hasSession: Boolean(accessToken),
  });

  if (!accessToken) {
    throw new Error('User is not authenticated. Please sign in.');
  }

  const proxyUrl = getProxyUrl();
  console.log('[ProxyService] sending request to proxy', {
    proxyUrl,
    elapsedMs: Date.now() - requestStartedAt,
  });

  let response: Response;
  try {
    response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        task_type: taskType,
        ...(model ? { model } : {}),
        book_id: bookId || null,
        provider,
        stream: true,
      }),
    });
    console.log('[ProxyService] proxy responded in', Date.now() - requestStartedAt, 'ms', {
      status: response.status,
      ok: response.ok,
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error('[ProxyService] fetch failed:', msg);
    throw new Error(`Network error calling proxy: ${msg}`);
  }

  if (!response.ok) {
    let rawBody = '';
    try { rawBody = await response.text(); } catch { rawBody = '(could not read response body)'; }

    console.error(`[ProxyService] ${response.status} response from proxy:\n`, rawBody.slice(0, 2000));

    let errorMsg = rawBody;
    try {
      const parsed = JSON.parse(rawBody);
      errorMsg = parsed?.error || parsed?.message || rawBody;
    } catch {
      errorMsg = rawBody.slice(0, 300);
    }

    if (response.status === 429) throw new Error(`RATE_LIMIT: ${errorMsg}`);
    throw new Error(`Proxy ${response.status}: ${errorMsg}`);
  }

  if (!response.body) throw new Error('Empty response stream from proxy');

  // ── Stream SSE ──────────────────────────────────────────────────────────────
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  const processFrame = (frame: string) => {
    const trimmedFrame = frame.trim();
    if (!trimmedFrame || trimmedFrame.startsWith(':')) return;

    let eventType = 'message';
    const dataParts: string[] = [];

    for (const line of trimmedFrame.split('\n')) {
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

    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(payload); } catch { return; }

    const streamError = typeof parsed?.error === 'string' ? parsed.error : null;
    if (eventType === 'error' || streamError) throw new Error(streamError || 'Proxy stream failed');

    const content = (parsed?.choices as Array<{ delta?: { content?: string } }> | undefined)?.[0]?.delta?.content || '';
    if (content) {
      fullContent += content;
      onChunk?.(content);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';

    for (const frame of frames) processFrame(frame);
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const frame of buffer.split('\n\n')) processFrame(frame);
  }

  if (!fullContent) throw new Error('Proxy returned empty content');
  return fullContent;
}
