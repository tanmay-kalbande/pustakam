// src/types.ts
export type ModelProvider = 'zhipu' | 'google' | 'mistral' | 'xai' | 'groq' | 'openrouter' | 'cohere';

export type ModelID =
  // Zhipu GLM Models
  | 'glm-5'
  | 'glm-5-turbo'
  | 'glm-4.7'
  | 'glm-4.7-flashx'
  // Google Gemini Models
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-flash'
  | 'gemma-3-27b-it'
  // xAI Grok Models
  | 'grok-4.1'
  | 'grok-4.1-fast'
  | 'grok-4-fast'
  // Mistral Models
  | 'mistral-small-latest'
  | 'mistral-medium-latest'
  | 'mistral-large-latest'
  // Groq Models
  | 'llama-3.3-70b-versatile'
  | 'moonshotai/kimi-k2-instruct-0905'
  | 'groq/compound'
  | 'openai/gpt-oss-20b'
  // OpenRouter Models
  | 'arcee-ai/trinity-large-preview:free'
  | 'arcee-ai/trinity-mini:free'
  | 'tngtech/deepseek-r1t2-chimera:free'
  | 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
  // Cohere Models
  | 'command-a-03-2025'
  | 'command-r-plus-08-2024';

export interface APISettings {
  googleApiKey: string;
  mistralApiKey: string;
  groqApiKey: string;
  xaiApiKey: string;
  openRouterApiKey: string;
  cohereApiKey: string;
  selectedModel: ModelID;
  selectedProvider: ModelProvider;
  defaultGenerationMode: 'stellar' | 'blackhole';
  defaultLanguage: 'en' | 'hi' | 'mr';
}

export * from './types/book';

