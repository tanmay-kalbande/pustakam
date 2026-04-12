// src/services/providerService.ts
// ============================================================================
// Unified Provider Service — The single abstraction for all AI providers.
//
// Usage:
//   import { generateText } from './providerService';
//   const result = await generateText('openai', 'gpt-4o-mini', apiKey, prompt);
//
// This function is fully provider-agnostic. It looks up the provider config
// from the registry, builds the request, sends it, and parses the SSE stream.
// ============================================================================

import { ProviderID, ResponseParserType } from '../types/providers';
import { getProviderConfig, getEndpointUrl } from './providerRegistry';

const dbg = (...args: unknown[]) => console.log('[ProviderService]', ...args);
const err = (...args: unknown[]) => console.error('[ProviderService]', ...args);

// ============================================================================
// SSE Stream Parsers — handle different provider response formats
// ============================================================================

/**
 * Parse an SSE data line based on the provider's response format.
 * Returns the text content extracted from the line, or empty string.
 */
function parseSSEData(data: string, parserType: ResponseParserType): string {
  try {
    const parsed = JSON.parse(data);

    switch (parserType) {
      case 'openai': {
        // Standard OpenAI format: choices[0].delta.content
        // Also used by: Groq, Cerebras, xAI, DeepSeek, Together, OpenRouter, Mistral, Perplexity, Cohere
        return parsed?.choices?.[0]?.delta?.content || '';
      }

      case 'anthropic': {
        // Anthropic format: event types with different delta shapes
        // content_block_delta → delta.text
        if (parsed?.type === 'content_block_delta') {
          return parsed?.delta?.text || '';
        }
        return '';
      }

      case 'google': {
        // Google Gemini format: candidates[0].content.parts[0].text
        return parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      default:
        return '';
    }
  } catch {
    // Ignore JSON parse errors on partial frames
    return '';
  }
}

// ============================================================================
// Core Stream Reader
// ============================================================================

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  parserType: ResponseParserType,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines, comments, and [DONE] markers
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') continue;

      // Handle Anthropic's event-based format
      if (trimmed.startsWith('event:')) continue; // Skip event line, data follows

      // Extract data payload
      if (trimmed.startsWith('data: ') || trimmed.startsWith('data:')) {
        const dataStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed.slice(5);
        if (dataStr === '[DONE]') continue;

        const text = parseSSEData(dataStr, parserType);
        if (text) {
          fullContent += text;
          onChunk?.(text);
        }
      }
    }
  }

  // Process remaining buffer
  const remaining = decoder.decode();
  if (remaining) {
    buffer += remaining;
    for (const line of buffer.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6);
        if (dataStr !== '[DONE]') {
          const text = parseSSEData(dataStr, parserType);
          if (text) {
            fullContent += text;
            onChunk?.(text);
          }
        }
      }
    }
  }

  return fullContent;
}

// ============================================================================
// Main API — generateText()
// ============================================================================

export interface GenerateTextOptions {
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  taskType?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Generate text from any supported AI provider.
 *
 * @param provider  - Provider ID (e.g., 'openai', 'anthropic', 'groq')
 * @param model     - Model ID (e.g., 'gpt-4o-mini', 'claude-sonnet-4-20250514')
 * @param apiKey    - The user's API key for this provider
 * @param prompt    - The text prompt to send
 * @param options   - Optional: abort signal, streaming callback, timeout
 * @returns         - The full generated text
 */
export async function generateText(
  provider: ProviderID,
  model: string,
  apiKey: string,
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  const config = getProviderConfig(provider);
  const { signal, onChunk, maxTokens = 8192, timeoutMs = 300000 } = options;

  dbg(`Generating via ${config.name} (${model})`, { taskType: options.taskType });

  // Build the request
  const url = getEndpointUrl(provider, model, apiKey);
  const headers = config.headerBuilder(apiKey);
  const body = config.bodyBuilder(model, prompt, maxTokens);

  // For Google, streaming is achieved via the URL (alt=sse), not the body
  // The body doesn't need a "stream" field

  // Set up abort controller with timeout
  const abortController = new AbortController();
  const mergedSignal = signal || abortController.signal;

  const timeoutId = setTimeout(() => {
    abortController.abort();
    err(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: mergedSignal,
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorBody = await response.text();
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed?.error?.message || parsed?.error?.type || parsed?.message || errorMsg;
      } catch {
        // Could not parse error body
      }

      // Classify the error
      if (response.status === 429) {
        throw new Error(`RATE_LIMIT: ${config.name} rate limit exceeded. ${errorMsg}`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(`AUTH_ERROR: Invalid API key for ${config.name}. ${errorMsg}`);
      }
      if (response.status === 402) {
        throw new Error(`BILLING_ERROR: ${config.name} billing/quota issue. ${errorMsg}`);
      }

      throw new Error(`${config.name} API error (${response.status}): ${errorMsg}`);
    }

    if (!response.body) {
      throw new Error(`${config.name} returned an empty response body`);
    }

    // Read and parse the SSE stream
    const fullContent = await readSSEStream(response.body, config.responseParser, onChunk);

    if (!fullContent) {
      throw new Error(`${config.name} returned empty content`);
    }

    dbg(`Generated ${fullContent.length} chars via ${config.name}`);
    return fullContent;

  } catch (fetchErr) {
    if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
      throw fetchErr; // Let caller handle abort
    }
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    err(`${config.name} error:`, msg);
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Quick validation: make a tiny request to verify an API key works.
 * Returns true if the key is valid, false otherwise.
 */
export async function validateApiKey(
  provider: ProviderID,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const config = getProviderConfig(provider);
    const model = config.defaultModel;

    // For validation, we use a minimal non-streaming request
    const url = provider === 'google'
      ? `${config.endpoint}/${model}:generateContent?key=${apiKey}`
      : config.endpoint;

    const headers = config.headerBuilder(apiKey);

    // Build a tiny validation body
    let body: Record<string, unknown>;
    if (provider === 'google') {
      body = { contents: [{ parts: [{ text: 'Say "ok"' }] }], generationConfig: { maxOutputTokens: 5 } };
    } else if (provider === 'anthropic') {
      body = { model, messages: [{ role: 'user', content: 'Say "ok"' }], max_tokens: 5 };
    } else {
      body = { model, messages: [{ role: 'user', content: 'Say "ok"' }], max_tokens: 5 };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 10s timeout for validation
    });

    if (response.ok) {
      return { valid: true };
    }

    let errorMsg = `HTTP ${response.status}`;
    try {
      const errBody = await response.text();
      const parsed = JSON.parse(errBody);
      errorMsg = parsed?.error?.message || parsed?.message || errorMsg;
    } catch { /* ignore */ }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    return { valid: false, error: errorMsg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: msg };
  }
}
