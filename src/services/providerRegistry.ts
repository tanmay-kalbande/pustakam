// src/services/providerRegistry.ts
// ============================================================================
// PROVIDER REGISTRY — Plug-and-play configuration for all AI providers.
// To add a new provider: add ONE entry to PROVIDER_REGISTRY below.
// That's it. No other file changes needed.
// ============================================================================

import { ProviderConfig, ProviderID } from '../types/providers';

// ── Shared body builders ────────────────────────────────────────────────────

/** Standard OpenAI-compatible request body (used by most providers) */
const openAIBody = (model: string, prompt: string, maxTokens = 8192) => ({
  model,
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.7,
  max_tokens: maxTokens,
  stream: true,
});

/** Anthropic uses a different body format */
const anthropicBody = (model: string, prompt: string, maxTokens = 8192) => ({
  model,
  messages: [{ role: 'user', content: prompt }],
  max_tokens: maxTokens,
  stream: true,
});

/** Google Gemini (AI Studio) body format */
const googleBody = (model: string, prompt: string, maxTokens = 8192) => ({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    maxOutputTokens: maxTokens,
    temperature: 0.7,
  },
});

// ── Shared header builders ──────────────────────────────────────────────────

const bearerAuth = (key: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${key}`,
});

const anthropicAuth = (key: string) => ({
  'Content-Type': 'application/json',
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
});

// No auth header needed for Google — API key goes in URL query param
const googleAuth = (_key: string) => ({
  'Content-Type': 'application/json',
});

// ============================================================================
// THE REGISTRY — One object per provider. This is the only place to edit.
// ============================================================================

export const PROVIDER_REGISTRY: Record<ProviderID, ProviderConfig> = {

  // ── Platform Providers (proxy-supported for free tier) ──────────────────

  zhipu: {
    id: 'zhipu',
    name: 'Z AI',
    badge: 'GLM',
    tagline: 'Zhipu GLM — deep long-form generation',
    endpoint: 'https://api.z.ai/api/paas/v4/chat/completions',
    supportsProxy: true,
    supportsBYOK: false,  // Zhipu is proxy-only
    models: [
      { id: 'glm-5', name: 'GLM-5', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'glm-5-turbo', name: 'GLM-5 Turbo', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'glm-4.7-flashx', name: 'GLM-4.7 FlashX', contextWindow: 128000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'glm-5',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    badge: 'MST',
    tagline: 'Mistral — faster first response',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    supportsProxy: true,
    supportsBYOK: true,
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32000, maxOutputTokens: 8192 },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', contextWindow: 32000, maxOutputTokens: 8192 },
      { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'labs-mistral-small-creative', name: 'Mistral Creative', contextWindow: 32000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'mistral-medium-latest',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  // ── BYOK Providers ─────────────────────────────────────────────────────

  openai: {
    id: 'openai',
    name: 'OpenAI',
    badge: 'GPT',
    tagline: 'GPT-4o — versatile and fast',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1047576, maxOutputTokens: 32768 },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', contextWindow: 1047576, maxOutputTokens: 32768 },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', contextWindow: 1047576, maxOutputTokens: 32768 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxOutputTokens: 16384 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, maxOutputTokens: 16384 },
      { id: 'o3-mini', name: 'o3-mini', contextWindow: 200000, maxOutputTokens: 100000 },
    ],
    defaultModel: 'gpt-4o-mini',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    badge: 'CLD',
    tagline: 'Claude — nuanced, long-form writing',
    endpoint: 'https://api.anthropic.com/v1/messages',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, maxOutputTokens: 16000 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, maxOutputTokens: 8192 },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    responseParser: 'anthropic',
    headerBuilder: anthropicAuth,
    bodyBuilder: anthropicBody,
  },

  google: {
    id: 'google',
    name: 'Google',
    badge: 'GEM',
    tagline: 'Gemini — multimodal intelligence',
    // Note: Google AI Studio uses streaming with ?alt=sse&key=API_KEY in URL
    // The endpoint below is a template — actual URL is built dynamically with model + key
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', contextWindow: 1048576, maxOutputTokens: 65536 },
      { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', contextWindow: 1048576, maxOutputTokens: 65536 },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576, maxOutputTokens: 8192 },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', contextWindow: 1048576, maxOutputTokens: 8192 },
    ],
    defaultModel: 'gemini-2.0-flash',
    responseParser: 'google',
    headerBuilder: googleAuth,
    bodyBuilder: googleBody,
  },

  groq: {
    id: 'groq',
    name: 'Groq',
    badge: 'GRQ',
    tagline: 'Groq — ultra-fast LPU inference',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 128000, maxOutputTokens: 32768 },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', contextWindow: 131072, maxOutputTokens: 8192 },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', contextWindow: 128000, maxOutputTokens: 16384 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, maxOutputTokens: 8192 },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192, maxOutputTokens: 8192 },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    badge: 'CBR',
    tagline: 'Cerebras — wafer-scale speed',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', contextWindow: 131072, maxOutputTokens: 16384 },
      { id: 'llama3.3-70b', name: 'Llama 3.3 70B', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'qwen-3-32b', name: 'Qwen 3 32B', contextWindow: 32000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'llama3.3-70b',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  xai: {
    id: 'xai',
    name: 'xAI (Grok)',
    badge: 'XAI',
    tagline: 'Grok — direct and unfiltered',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'grok-3', name: 'Grok 3', contextWindow: 131072, maxOutputTokens: 16384 },
      { id: 'grok-3-fast', name: 'Grok 3 Fast', contextWindow: 131072, maxOutputTokens: 16384 },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', contextWindow: 131072, maxOutputTokens: 16384 },
      { id: 'grok-3-mini-fast', name: 'Grok 3 Mini Fast', contextWindow: 131072, maxOutputTokens: 16384 },
    ],
    defaultModel: 'grok-3-mini-fast',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  cohere: {
    id: 'cohere',
    name: 'Cohere',
    badge: 'COH',
    tagline: 'Command R — enterprise-grade RAG',
    endpoint: 'https://api.cohere.com/v2/chat',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'command-r-plus-08-2024', name: 'Command R+', contextWindow: 128000, maxOutputTokens: 4096 },
      { id: 'command-r-08-2024', name: 'Command R', contextWindow: 128000, maxOutputTokens: 4096 },
      { id: 'command-a-03-2025', name: 'Command A', contextWindow: 256000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'command-r-08-2024',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'DSK',
    tagline: 'DeepSeek — cost-effective reasoning',
    endpoint: 'https://api.deepseek.com/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', contextWindow: 64000, maxOutputTokens: 8192 },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextWindow: 64000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'deepseek-chat',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  together: {
    id: 'together',
    name: 'Together AI',
    badge: 'TGR',
    tagline: 'Together — open-source models at scale',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', name: 'Llama 4 Maverick', contextWindow: 1048576, maxOutputTokens: 32768 },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', contextWindow: 64000, maxOutputTokens: 8192 },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', contextWindow: 65536, maxOutputTokens: 8192 },
    ],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'ORT',
    tagline: 'OpenRouter — unified gateway to all models',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OR)', contextWindow: 128000, maxOutputTokens: 16384 },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (via OR)', contextWindow: 200000, maxOutputTokens: 16000 },
      { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash (via OR)', contextWindow: 1048576, maxOutputTokens: 65536 },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (via OR)', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 (via OR)', contextWindow: 64000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'openai/gpt-4o',
    responseParser: 'openai',
    headerBuilder: (key: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://pustakamai.tanmaysk.in',
      'X-Title': 'Pustakam AI',
    }),
    bodyBuilder: openAIBody,
  },

  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    badge: 'PPX',
    tagline: 'Perplexity — search-augmented generation',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    supportsProxy: false,
    supportsBYOK: true,
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro', contextWindow: 200000, maxOutputTokens: 8192 },
      { id: 'sonar', name: 'Sonar', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', contextWindow: 128000, maxOutputTokens: 8192 },
      { id: 'sonar-reasoning', name: 'Sonar Reasoning', contextWindow: 128000, maxOutputTokens: 8192 },
    ],
    defaultModel: 'sonar',
    responseParser: 'openai',
    headerBuilder: bearerAuth,
    bodyBuilder: openAIBody,
  },
};

// ============================================================================
// Helpers
// ============================================================================

/** Get list of all provider IDs */
export function getAllProviderIds(): ProviderID[] {
  return Object.keys(PROVIDER_REGISTRY) as ProviderID[];
}

/** Get config for a specific provider */
export function getProviderConfig(id: ProviderID): ProviderConfig {
  const config = PROVIDER_REGISTRY[id];
  if (!config) throw new Error(`Unknown provider: ${id}`);
  return config;
}

/** Get all providers that support BYOK */
export function getBYOKProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY).filter(p => p.supportsBYOK);
}

/** Get all providers that support the platform proxy (free tier) */
export function getProxyProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY).filter(p => p.supportsProxy);
}

/** Get models for a provider */
export function getModelsForProvider(id: ProviderID): ProviderConfig['models'] {
  return getProviderConfig(id).models;
}

/** Get default model for a provider */
export function getDefaultModel(id: ProviderID): string {
  return getProviderConfig(id).defaultModel;
}

/** Check if a model ID is valid for a provider */
export function isValidModel(providerId: ProviderID, modelId: string): boolean {
  return getProviderConfig(providerId).models.some(m => m.id === modelId);
}

/** Get the full endpoint URL for a provider + model (special handling for Google) */
export function getEndpointUrl(providerId: ProviderID, modelId: string, apiKey?: string): string {
  const config = getProviderConfig(providerId);

  // Google AI Studio has a unique URL pattern with model in path and key in query
  if (providerId === 'google' && apiKey) {
    return `${config.endpoint}/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;
  }

  return config.endpoint;
}
