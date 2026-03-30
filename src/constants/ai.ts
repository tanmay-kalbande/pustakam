import { ModelProvider } from '../types';

export const AI_SUITE_NAME = 'Injin Stack';
export const APP_AI_BRANDLINE = 'Pustakam Injin';

export const ZHIPU_PROVIDER: ModelProvider = 'zhipu';
export const MISTRAL_PROVIDER: ModelProvider = 'mistral';

// ── Provider list shown in the UI ─────────────────────────────────────────────
export const PROVIDERS: Array<{
  id: ModelProvider;
  name: string;
  tagline: string;
  badge: string;
}> = [
  {
    id: 'zhipu',
    name: 'Z AI',
    tagline: 'Zhipu GLM — smart orchestration',
    badge: 'GLM',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    tagline: 'Mistral AI — smart orchestration',
    badge: 'MST',
  },
];

// ── Smart orchestration map ───────────────────────────────────────────────────
// The server reads task_type + provider and picks the right model tier.
// These constants are kept here as documentation of what the server does.
//
//  Task          | ZhipuAI               | Mistral
//  --------------|---------------------- |---------------------------
//  enhance       | glm-4.7-flashx        | labs-mistral-small-creative
//  glossary      | glm-4.7-flashx        | labs-mistral-small-creative
//  roadmap       | glm-5-turbo           | mistral-large-latest
//  module        | glm-5                 | mistral-medium-latest
//  assemble      | glm-5                 | mistral-large-latest
//
export const ORCHESTRATION_MAP = {
  zhipu: {
    enhance:  'glm-4.7-flashx',
    glossary: 'glm-4.7-flashx',
    roadmap:  'glm-5-turbo',
    module:   'glm-5',
    assemble: 'glm-5',
  },
  mistral: {
    enhance:  'labs-mistral-small-creative',
    glossary: 'labs-mistral-small-creative',
    roadmap:  'mistral-large-latest',
    module:   'mistral-medium-latest',
    assemble: 'mistral-large-latest',
  },
} as const;

// Default model per provider (used as fallback in settings/storage)
export const DEFAULT_ZHIPU_MODEL  = 'glm-5' as const;
export const DEFAULT_MISTRAL_MODEL = 'mistral-medium-latest' as const;