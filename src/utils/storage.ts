// src/utils/storage.ts
import { APISettings, BookProject } from '../types';
import type { ProviderID } from '../types/providers';
import { ZHIPU_PROVIDER } from '../constants/ai';
import { getAllProviderIds, getProviderConfig, isValidModel } from '../services/providerRegistry';
import { persistence } from './persistence';

const SETTINGS_KEY = 'pustakam-settings';
const BOOKS_KEY = 'pustakam-books';
const BOOK_INDEX_KEY = 'pustakam-book-module-counts';

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

const reviveBooks = (books: BookProject[]): BookProject[] => books.map((book: BookProject) => ({
  ...book,
  createdAt: new Date(book.createdAt),
  updatedAt: new Date(book.updatedAt),
}));

const buildBookIndex = (books: BookProject[]) => Object.fromEntries(
  books.map(book => [book.id, Array.isArray(book.modules) ? book.modules.length : 0])
);

const saveBookIndex = (bookIndex: Record<string, number>) => {
  try {
    localStorage.setItem(BOOK_INDEX_KEY, JSON.stringify(bookIndex));
  } catch (error) {
    console.warn('Error saving book index:', error);
  }
};

const readLegacyBooks = (userId?: string | null): BookProject[] => {
  try {
    const key = getUserBooksKey(userId);
    const stored = localStorage.getItem(key);

    if (!stored && userId) {
      const oldBooks = localStorage.getItem(BOOKS_KEY);
      if (oldBooks) {
        console.log('Migrated books from generic key to user-specific key');
        localStorage.removeItem(BOOKS_KEY);
        const books = reviveBooks(JSON.parse(oldBooks));
        saveBookIndex(buildBookIndex(books));
        return books;
      }
    }

    if (!stored) return [];
    const books = reviveBooks(JSON.parse(stored));
    saveBookIndex(buildBookIndex(books));
    return books;
  } catch (error) {
    console.error('Error loading legacy books:', error);
    return [];
  }
};

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

  async getBooks(userId?: string | null): Promise<BookProject[]> {
    const key = getUserBooksKey(userId);

    try {
      const record = await persistence.getBooks(key);
      if (record?.books && Array.isArray(record.books)) {
        saveBookIndex(record.bookIndex || {});
        return reviveBooks(record.books as BookProject[]);
      }
    } catch (error) {
      console.warn('IndexedDB books load failed, falling back to localStorage:', error);
    }

    const legacyBooks = readLegacyBooks(userId);
    if (legacyBooks.length > 0) {
      void this.saveBooks(legacyBooks, userId);
    }
    return legacyBooks;
  },

  async saveBooks(books: BookProject[], userId?: string | null): Promise<void> {
    const key = getUserBooksKey(userId);
    const bookIndex = buildBookIndex(books);
    saveBookIndex(bookIndex);

    try {
      await persistence.saveBooks(key, books, bookIndex);

      // Remove the large legacy payload once IndexedDB becomes the source of truth.
      localStorage.removeItem(key);
      if (userId) {
        localStorage.removeItem(BOOKS_KEY);
      }
    } catch (error) {
      console.error('Error saving books to IndexedDB, falling back to localStorage:', error);
      localStorage.setItem(key, JSON.stringify(books));
    }
  },

  getBookModuleCounts(): Record<string, number> {
    try {
      const stored = localStorage.getItem(BOOK_INDEX_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Error loading book index:', error);
      return {};
    }
  },

  async clearBooks(userId?: string | null): Promise<void> {
    const key = getUserBooksKey(userId);
    localStorage.removeItem(key);
    saveBookIndex({});
    try {
      await persistence.deleteBooks(key);
    } catch (error) {
      console.warn('Error clearing books from IndexedDB:', error);
    }
  },

  async clearAll(userId?: string | null): Promise<void> {
    localStorage.removeItem(SETTINGS_KEY);
    await this.clearBooks(userId);
  },
};
