// src/types.ts
export type ModelProvider = 'zhipu' | 'mistral';

export type ModelID =
  // Zhipu GLM — orchestrated by server
  | 'glm-5'
  | 'glm-5-turbo'
  | 'glm-4.7-flashx'
  // Mistral — orchestrated by server
  | 'mistral-small-latest'
  | 'mistral-medium-latest'
  | 'mistral-large-latest'
  | 'labs-mistral-small-creative';

export interface APISettings {
  googleApiKey: string;
  mistralApiKey: string;
  groqApiKey: string;
  xaiApiKey: string;
  openRouterApiKey: string;
  cohereApiKey: string;
  /** Which provider the user chose ('zhipu' or 'mistral'). Model is auto-selected by the server. */
  selectedProvider: ModelProvider;
  /** Kept for type compatibility — server ignores this and picks via orchestration map. */
  selectedModel: ModelID;
  defaultGenerationMode: 'stellar' | 'blackhole';
  defaultLanguage: 'en' | 'hi' | 'mr';
}

export * from './types/book';
