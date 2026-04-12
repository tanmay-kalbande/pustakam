// src/types/providers.ts
// Unified provider type system for BYOK (Bring Your Own API Key)

// ============================================================================
// Provider IDs — all supported AI providers
// ============================================================================

export type ProviderID =
  // Platform providers (proxy-supported for free tier)
  | 'zhipu'
  | 'mistral'
  // BYOK providers (user brings their own key)
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'cerebras'
  | 'xai'
  | 'cohere'
  | 'deepseek'
  | 'together'
  | 'openrouter'
  | 'perplexity';

// ============================================================================
// Model Config
// ============================================================================

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
}

// ============================================================================
// SSE response parsers — different providers use different streaming formats
// ============================================================================

/**
 * 'openai'     → data: {"choices":[{"delta":{"content":"..."}}]}
 * 'anthropic'  → event: content_block_delta, data: {"delta":{"text":"..."}}
 * 'google'     → data: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}
 */
export type ResponseParserType = 'openai' | 'anthropic' | 'google';

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  id: ProviderID;
  name: string;                // Display name: "OpenAI", "Anthropic (Claude)"
  badge: string;               // Short badge for compact UI: "GPT", "CLD"
  tagline: string;             // One-liner for provider cards
  endpoint: string;            // API base URL for chat completions
  supportsProxy: boolean;      // Can use platform proxy (free tier)
  supportsBYOK: boolean;       // Can accept user's own API key
  models: ModelConfig[];       // Available models for this provider
  defaultModel: string;        // Default model ID
  responseParser: ResponseParserType;
  // How to construct headers (each provider has slightly different auth)
  headerBuilder: (apiKey: string) => Record<string, string>;
  // How to construct request body
  bodyBuilder: (model: string, prompt: string, maxTokens?: number) => Record<string, unknown>;
}

// ============================================================================
// Quota Status — tracks free usage + BYOK availability
// ============================================================================

export interface QuotaStatus {
  freeLimit: number;           // Admin-configurable via Supabase (default: 2)
  booksUsed: number;           // From profiles.books_created
  remaining: number;           // freeLimit - booksUsed (clamped to 0)
  hasFreeQuota: boolean;       // remaining > 0
  hasBYOK: boolean;            // User has at least one BYOK key configured
  canGenerate: boolean;        // hasFreeQuota || hasBYOK
  mode: 'proxy' | 'byok' | 'blocked';
}

// ============================================================================
// BYOK Key Entry
// ============================================================================

export interface BYOKKeyEntry {
  provider: ProviderID;
  key: string;                 // The actual API key (stored locally)
  addedAt: string;             // ISO date string
}
