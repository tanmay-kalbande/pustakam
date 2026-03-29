import { ModelProvider } from '../types';

export const AI_SUITE_NAME = 'Injin Stack';
export const APP_AI_BRANDLINE = 'Pustakam Injin';

export const ZHIPU_PROVIDER: ModelProvider = 'zhipu';
export const MISTRAL_PROVIDER: ModelProvider = 'mistral';

export const ZHIPU_MODELS: Array<{
  provider: ModelProvider;
  model: 'glm-5' | 'glm-5-turbo' | 'glm-4.7-flashx';
  name: string;
  tagline: string;
}> = [
    {
      provider: ZHIPU_PROVIDER,
      model: 'glm-5',
      name: 'GLM-5',
      tagline: 'Flagship model — used for chapter writing',
    },
    {
      provider: ZHIPU_PROVIDER,
      model: 'glm-5-turbo',
      name: 'GLM-5 Turbo',
      tagline: 'Fast premium — used for roadmap and assembly',
    },
    {
      provider: ZHIPU_PROVIDER,
      model: 'glm-4.7-flashx',
      name: 'GLM-4.7 FlashX',
      tagline: 'Lightning speed — used for quick tasks',
    },
  ];

export const MISTRAL_MODELS: Array<{
  provider: ModelProvider;
  model: 'mistral-small-latest' | 'mistral-large-latest';
  name: string;
  tagline: string;
}> = [
    {
      provider: MISTRAL_PROVIDER,
      model: 'mistral-small-latest',
      name: 'Mistral Small',
      tagline: 'Fast and efficient — great for all tasks',
    },
    {
      provider: MISTRAL_PROVIDER,
      model: 'mistral-large-latest',
      name: 'Mistral Large',
      tagline: 'Most capable — best for deep content',
    },
  ];

export const ALL_MODELS = [...ZHIPU_MODELS, ...MISTRAL_MODELS];

export const DEFAULT_ZHIPU_MODEL = ZHIPU_MODELS[0].model;