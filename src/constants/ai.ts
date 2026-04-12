// src/constants/ai.ts
// ============================================================================
// AI Constants — Branding + provider display list for the UI
// The actual provider configs (endpoints, models, etc.) live in providerRegistry.ts
// ============================================================================

import type { ProviderID } from '../types/providers';
import { getAllProviderIds, getProviderConfig } from '../services/providerRegistry';

export const AI_SUITE_NAME = 'Injin Stack';
export const APP_AI_BRANDLINE = 'Pustakam Injin';

export const ZHIPU_PROVIDER: ProviderID = 'zhipu';
export const MISTRAL_PROVIDER: ProviderID = 'mistral';

// ============================================================================
// Provider display list for the UI (TopHeader, Settings, etc.)
// Grouped: platform (proxy) providers first, then BYOK providers
// ============================================================================

export interface ProviderDisplayInfo {
  id: ProviderID;
  name: string;
  tagline: string;
  badge: string;
  isProxy: boolean;       // Can use platform proxy (free tier)
  supportsBYOK: boolean;  // Accepts user's own API key
}

/**
 * Build the full provider display list from the registry.
 * Platform (proxy) providers appear first, then BYOK-only providers.
 */
function buildProviderDisplayList(): ProviderDisplayInfo[] {
  const allIds = getAllProviderIds();
  const list: ProviderDisplayInfo[] = allIds.map(id => {
    const config = getProviderConfig(id);
    return {
      id: config.id,
      name: config.name,
      tagline: config.tagline,
      badge: config.badge,
      isProxy: config.supportsProxy,
      supportsBYOK: config.supportsBYOK,
    };
  });

  // Sort: proxy providers first, then alphabetically by name
  return list.sort((a, b) => {
    if (a.isProxy && !b.isProxy) return -1;
    if (!a.isProxy && b.isProxy) return 1;
    return a.name.localeCompare(b.name);
  });
}

export const PROVIDERS: ProviderDisplayInfo[] = buildProviderDisplayList();

/** Get only the proxy-supported providers (for showing in free tier selector) */
export const PROXY_PROVIDERS = PROVIDERS.filter(p => p.isProxy);

/** Get only the BYOK providers (for showing in API key settings) */
export const BYOK_PROVIDERS = PROVIDERS.filter(p => p.supportsBYOK);

// ============================================================================
// Orchestration map — used by the proxy for server-side model selection
// Only relevant when using the platform proxy (free tier)
// ============================================================================

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
