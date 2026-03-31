import { ModelProvider } from '../types';

export const AI_SUITE_NAME = 'Injin Stack';
export const APP_AI_BRANDLINE = 'Pustakam Injin';

export const ZHIPU_PROVIDER: ModelProvider = 'zhipu';
export const MISTRAL_PROVIDER: ModelProvider = 'mistral';

export const PROVIDERS: Array<{
  id: ModelProvider;
  name: string;
  tagline: string;
  badge: string;
}> = [
  {
    id: 'zhipu',
    name: 'Z AI',
    tagline: 'Zhipu GLM - deep long-form generation',
    badge: 'GLM',
  },
  {
    id: 'mistral',
    name: 'Fast Mistral',
    tagline: 'Mistral AI - faster first response',
    badge: 'MST',
  },
];

// The proxy picks the exact model per task.
export const ORCHESTRATION_MAP = {
  zhipu: {
    enhance: 'glm-5',
    glossary: 'glm-5',
    roadmap: 'glm-5-turbo',
    module: 'glm-5',
    assemble: 'glm-5',
  },
  mistral: {
    enhance: 'labs-mistral-small-creative',
    glossary: 'labs-mistral-small-creative',
    roadmap: 'mistral-large-latest',
    module: 'mistral-medium-latest',
    assemble: 'mistral-large-latest',
  },
} as const;

export const DEFAULT_ZHIPU_MODEL = 'glm-5' as const;
export const DEFAULT_MISTRAL_MODEL = 'mistral-medium-latest' as const;
