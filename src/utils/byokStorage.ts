// src/utils/byokStorage.ts
// ============================================================================
// BYOK (Bring Your Own API Key) — Local Storage Manager
// Keys are stored ONLY in localStorage, never sent to any server.
// Uses base64 obfuscation to prevent casual snooping in DevTools.
// ============================================================================

import { ProviderID } from '../types/providers';

const BYOK_STORAGE_KEY = 'pustakam-byok-keys';

// Simple obfuscation (NOT encryption — just prevents casual reads in DevTools)
function obfuscate(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return text;
  }
}

function deobfuscate(encoded: string): string {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return encoded;
  }
}

interface StoredKeys {
  [provider: string]: {
    key: string;       // Obfuscated API key
    addedAt: string;   // ISO date
  };
}

function readStore(): StoredKeys {
  try {
    const raw = localStorage.getItem(BYOK_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredKeys;
  } catch (error) {
    console.error('[BYOK] Failed to read stored keys:', error);
    return {};
  }
}

function writeStore(store: StoredKeys): void {
  try {
    localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('[BYOK] Failed to write keys:', error);
  }
}

// ============================================================================
// Public API
// ============================================================================

export const byokStorage = {
  /**
   * Get all stored keys (deobfuscated)
   */
  getKeys(): Record<string, string> {
    const store = readStore();
    const result: Record<string, string> = {};
    for (const [provider, entry] of Object.entries(store)) {
      result[provider] = deobfuscate(entry.key);
    }
    return result;
  },

  /**
   * Store an API key for a provider
   */
  setKey(provider: ProviderID, key: string): void {
    const store = readStore();
    store[provider] = {
      key: obfuscate(key.trim()),
      addedAt: new Date().toISOString(),
    };
    writeStore(store);
    console.log(`[BYOK] Key stored for ${provider}`);
  },

  /**
   * Remove a key for a specific provider
   */
  removeKey(provider: ProviderID): void {
    const store = readStore();
    delete store[provider];
    writeStore(store);
    console.log(`[BYOK] Key removed for ${provider}`);
  },

  /**
   * Check if a key exists for a provider
   */
  hasKey(provider: ProviderID): boolean {
    const store = readStore();
    const entry = store[provider];
    if (!entry) return false;
    const key = deobfuscate(entry.key);
    return key.length > 0;
  },

  /**
   * Get a specific key (deobfuscated). Returns null if not found.
   */
  getKey(provider: ProviderID): string | null {
    const store = readStore();
    const entry = store[provider];
    if (!entry) return null;
    const key = deobfuscate(entry.key);
    return key.length > 0 ? key : null;
  },

  /**
   * Clear all stored BYOK keys
   */
  clearAll(): void {
    localStorage.removeItem(BYOK_STORAGE_KEY);
    console.log('[BYOK] All keys cleared');
  },

  /**
   * Get list of providers that have a key configured
   */
  getConfiguredProviders(): ProviderID[] {
    const store = readStore();
    return Object.keys(store).filter(provider => {
      const entry = store[provider];
      return entry && deobfuscate(entry.key).length > 0;
    }) as ProviderID[];
  },

  /**
   * Check if the user has ANY BYOK key configured
   */
  hasAnyKey(): boolean {
    return this.getConfiguredProviders().length > 0;
  },

  /**
   * Get the date a key was added
   */
  getKeyAddedDate(provider: ProviderID): Date | null {
    const store = readStore();
    const entry = store[provider];
    if (!entry?.addedAt) return null;
    return new Date(entry.addedAt);
  },

  /**
   * Mask a key for display (show first 4 and last 4 chars)
   */
  getMaskedKey(provider: ProviderID): string | null {
    const key = this.getKey(provider);
    if (!key) return null;
    if (key.length <= 12) return '••••••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 24))}${key.slice(-4)}`;
  },
};
