// src/types.ts
// Re-export the unified ProviderID from the providers module
export type { ProviderID } from './types/providers';
import type { ProviderID } from './types/providers';

// ModelProvider is now an alias for ProviderID (backward compat)
export type ModelProvider = ProviderID;

// ModelID is now a plain string — models are defined in the provider registry
export type ModelID = string;

export interface APISettings {
  /** Which provider the user selected */
  selectedProvider: ModelProvider;
  /** Which model the user selected (from the provider's model list) */
  selectedModel: string;
  /** Default generation mode */
  defaultGenerationMode: 'stellar' | 'blackhole';
  /** Default language */
  defaultLanguage: 'en' | 'hi' | 'mr';
}

export * from './types/book';
