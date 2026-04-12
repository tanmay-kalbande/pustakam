// src/utils/storage.ts
import { APISettings, BookProject } from '../types';
import type { ProviderID } from '../types/providers';
import { ZHIPU_PROVIDER } from '../constants/ai';
import { getAllProviderIds, getProviderConfig, isValidModel } from '../services/providerRegistry';

const SETTINGS_KEY = 'pustakam-settings';
const BOOKS_KEY = 'pustakam-books';

// Get user-scoped books key
const getUserBooksKey = (userId?: string | null): string => {
  if (userId) {
    return `pustakam-books-${userId}`;
  }
  return BOOKS_KEY;
};

const defaultSettings: APISettings = {
  selectedProvider: ZHIPU_PROVIDER,
  selectedModel: 'glm-5',
  defaultGenerationMode: 'stellar',
  defaultLanguage: 'en',
};

// Valid providers are derived from the registry (no more hardcoding)
const validProviders: ProviderID[] = getAllProviderIds();

export const storageUtils = {
  getSettings(): APISettings {
    try {
      const useProxy = import.meta.env.VITE_USE_PROXY === 'true';
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return defaultSettings;

      const parsed = JSON.parse(stored);

      const settings: APISettings = {
        ...defaultSettings,
        ...parsed,
      };

      // Strip out legacy API key fields that may exist in old storage
      // (they've been moved to byokStorage)
      delete (settings as any).googleApiKey;
      delete (settings as any).mistralApiKey;
      delete (settings as any).groqApiKey;
      delete (settings as any).xaiApiKey;
      delete (settings as any).openRouterApiKey;
      delete (settings as any).cohereApiKey;

      // Validate provider
      if (!settings.selectedProvider || !validProviders.includes(settings.selectedProvider)) {
        console.warn('Invalid selectedProvider found in storage:', settings.selectedProvider);
        settings.selectedProvider = defaultSettings.selectedProvider;
      }

      if (useProxy && !settings.selectedProvider) {
        settings.selectedProvider = ZHIPU_PROVIDER;
      }

      // Validate model against the provider's model list
      if (!isValidModel(settings.selectedProvider, settings.selectedModel)) {
        const defaultModel = getProviderConfig(settings.selectedProvider).defaultModel;
        console.warn(`Invalid model ${settings.selectedModel} for provider ${settings.selectedProvider}, falling back to ${defaultModel}`);
        settings.selectedModel = defaultModel;
      }

      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      localStorage.removeItem(SETTINGS_KEY);
      return defaultSettings;
    }
  },

  saveSettings(settings: APISettings): void {
    try {
      if (!settings.selectedProvider || !validProviders.includes(settings.selectedProvider)) {
        console.error('Attempted to save invalid selectedProvider:', settings.selectedProvider);
        settings.selectedProvider = defaultSettings.selectedProvider;
      }

      const useProxy = import.meta.env.VITE_USE_PROXY === 'true';
      if (useProxy && !settings.selectedProvider) {
        settings.selectedProvider = ZHIPU_PROVIDER;
      }

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      // Silently fail - the app will use defaults
    }
  },

  getBooks(userId?: string | null): BookProject[] {
    try {
      const key = getUserBooksKey(userId);
      const stored = localStorage.getItem(key);

      // Migration: If user-specific key is empty and user is logged in,
      // check if there are books in the old generic key and migrate them
      if (!stored && userId) {
        const oldBooks = localStorage.getItem(BOOKS_KEY);
        if (oldBooks) {
          // Migrate old books to user-specific key
          localStorage.setItem(key, oldBooks);
          // Clear old generic key to prevent duplicate loading
          localStorage.removeItem(BOOKS_KEY);
          console.log('Migrated books from generic key to user-specific key');
          const books = JSON.parse(oldBooks);
          return books.map((book: BookProject) => ({
            ...book,
            createdAt: new Date(book.createdAt),
            updatedAt: new Date(book.updatedAt),
          }));
        }
      }

      if (!stored) return [];
      const books = JSON.parse(stored);
      return books.map((book: BookProject) => ({
        ...book,
        createdAt: new Date(book.createdAt),
        updatedAt: new Date(book.updatedAt),
      }));
    } catch (error) {
      console.error('Error loading books:', error);
      return [];
    }
  },

  saveBooks(books: BookProject[], userId?: string | null): void {
    try {
      const key = getUserBooksKey(userId);
      localStorage.setItem(key, JSON.stringify(books));
    } catch (error) {
      console.error('Error saving books:', error);
      // Silently fail - books are also saved in state
    }
  },

  clearBooks(userId?: string | null): void {
    const key = getUserBooksKey(userId);
    localStorage.removeItem(key);
  },

  clearAll(userId?: string | null): void {
    localStorage.removeItem(SETTINGS_KEY);
    const key = getUserBooksKey(userId);
    localStorage.removeItem(key);
  },
};
