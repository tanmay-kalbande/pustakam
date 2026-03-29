import { ModelProvider } from '../types';

export const AI_SUITE_NAME = 'Injin Stack';
export const APP_AI_BRANDLINE = 'Pustakam Injin';

export const ZHIPU_PROVIDER: ModelProvider = 'zhipu';

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

export const ALL_MODELS = [...ZHIPU_MODELS];

export const DEFAULT_ZHIPU_MODEL = ZHIPU_MODELS[0].model;