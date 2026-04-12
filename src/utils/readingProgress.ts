import { ReadingBookmark } from '../types/book';
import { storageUtils } from './storage';

const BOOKMARK_KEY = 'pustakam-reading-bookmarks';

type ReadingMode = 'module' | 'full_book';

interface ModuleProgressEntry {
  scrollPosition: number;
  percentComplete: number;
  lastReadAt: Date;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const reviveModuleProgress = (
  moduleProgress?: ReadingBookmark['moduleProgress']
): Record<string, ModuleProgressEntry> => {
  if (!moduleProgress) return {};

  return Object.fromEntries(
    Object.entries(moduleProgress).map(([key, value]) => [
      key,
      {
        scrollPosition: value.scrollPosition,
        percentComplete: value.percentComplete,
        lastReadAt: new Date(value.lastReadAt),
      },
    ])
  );
};

const reviveBookmark = (bookmark: ReadingBookmark): ReadingBookmark => ({
  ...bookmark,
  lastReadAt: new Date(bookmark.lastReadAt),
  mode: bookmark.mode || 'module',
  moduleProgress: reviveModuleProgress(bookmark.moduleProgress),
  fullBookProgress: bookmark.fullBookProgress
    ? {
        ...bookmark.fullBookProgress,
        lastReadAt: new Date(bookmark.fullBookProgress.lastReadAt),
      }
    : undefined,
});

export const readingProgressUtils = {
  saveBookmark(
    bookId: string,
    moduleIndex: number,
    scrollPosition: number,
    percentComplete?: number,
    mode: ReadingMode = 'module'
  ): void {
    try {
      const bookmarks = this.getAllBookmarks();
      const existing = bookmarks[bookId];
      const moduleProgress = reviveModuleProgress(existing?.moduleProgress);
      const resolvedPercent =
        typeof percentComplete === 'number'
          ? clampPercent(percentComplete)
          : 0;

      if (mode === 'module') {
        moduleProgress[String(moduleIndex)] = {
          scrollPosition,
          percentComplete: resolvedPercent,
          lastReadAt: new Date(),
        };
      }

      bookmarks[bookId] = {
        bookId,
        moduleIndex,
        scrollPosition,
        lastReadAt: new Date(),
        percentComplete: resolvedPercent,
        mode,
        moduleProgress,
        fullBookProgress:
          mode === 'full_book'
            ? {
                scrollPosition,
                percentComplete: resolvedPercent,
                lastReadAt: new Date(),
              }
            : existing?.fullBookProgress,
      };

      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
  },

  getBookmark(bookId: string): ReadingBookmark | null {
    try {
      const bookmarks = this.getAllBookmarks();
      const bookmark = bookmarks[bookId];
      return bookmark ? reviveBookmark(bookmark) : null;
    } catch (error) {
      console.error('Failed to get bookmark:', error);
      return null;
    }
  },

  getAllBookmarks(): Record<string, ReadingBookmark> {
    try {
      const stored = localStorage.getItem(BOOKMARK_KEY);
      if (!stored) return {};
      const parsed = JSON.parse(stored) as Record<string, ReadingBookmark>;
      return Object.fromEntries(
        Object.entries(parsed).map(([bookId, bookmark]) => [bookId, reviveBookmark(bookmark)])
      );
    } catch (error) {
      console.error('Failed to get bookmarks:', error);
      return {};
    }
  },

  getModuleProgress(bookId: string, moduleIndex: number): ModuleProgressEntry | null {
    const bookmark = this.getBookmark(bookId);
    if (!bookmark?.moduleProgress) return null;
    return bookmark.moduleProgress[String(moduleIndex)] || null;
  },

  getFullBookProgress(bookId: string): ModuleProgressEntry | null {
    const bookmark = this.getBookmark(bookId);
    if (!bookmark?.fullBookProgress) return null;

    return {
      ...bookmark.fullBookProgress,
      lastReadAt: new Date(bookmark.fullBookProgress.lastReadAt),
    };
  },

  getResumeState(bookId: string): { mode: ReadingMode; moduleIndex: number; scrollPosition: number } | null {
    const bookmark = this.getBookmark(bookId);
    if (!bookmark) return null;

    if (bookmark.mode === 'full_book' && bookmark.fullBookProgress) {
      return {
        mode: 'full_book',
        moduleIndex: bookmark.moduleIndex,
        scrollPosition: bookmark.fullBookProgress.scrollPosition,
      };
    }

    const moduleProgress = this.getModuleProgress(bookId, bookmark.moduleIndex);
    return {
      mode: 'module',
      moduleIndex: bookmark.moduleIndex,
      scrollPosition: moduleProgress?.scrollPosition || bookmark.scrollPosition,
    };
  },

  deleteBookmark(bookId: string): void {
    try {
      const bookmarks = this.getAllBookmarks();
      delete bookmarks[bookId];
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  },

  hasBookmark(bookId: string): boolean {
    return this.getBookmark(bookId) !== null;
  },

  updateScrollPosition(
    bookId: string,
    scrollPosition: number,
    moduleIndex?: number,
    mode: ReadingMode = 'module'
  ): void {
    try {
      const bookmark = this.getBookmark(bookId);
      if (!bookmark) return;

      this.saveBookmark(
        bookId,
        typeof moduleIndex === 'number' ? moduleIndex : bookmark.moduleIndex,
        scrollPosition,
        bookmark.percentComplete,
        mode
      );
    } catch (error) {
      console.error('Failed to update scroll position:', error);
    }
  },

  getBookmarkStats(bookId: string): {
    hasBookmark: boolean;
    percentComplete: number;
    lastReadDate: Date | null;
    daysAgo: number;
  } {
    const bookmark = this.getBookmark(bookId);

    if (!bookmark) {
      return {
        hasBookmark: false,
        percentComplete: 0,
        lastReadDate: null,
        daysAgo: 0,
      };
    }

    const now = new Date();
    const lastRead = new Date(bookmark.lastReadAt);
    const diffMs = now.getTime() - lastRead.getTime();
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      hasBookmark: true,
      percentComplete: bookmark.percentComplete,
      lastReadDate: lastRead,
      daysAgo,
    };
  },

  getBookModuleCount(bookId: string): number {
    try {
      return storageUtils.getBookModuleCounts()[bookId] || 0;
    } catch {
      return 0;
    }
  },

  formatLastRead(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  },

  clearOldBookmarks(daysOld: number = 30): number {
    try {
      const bookmarks = this.getAllBookmarks();
      const now = new Date();
      let removedCount = 0;

      Object.keys(bookmarks).forEach(bookId => {
        const bookmark = bookmarks[bookId];
        const lastRead = new Date(bookmark.lastReadAt);
        const daysSinceRead = Math.floor((now.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceRead > daysOld) {
          delete bookmarks[bookId];
          removedCount++;
        }
      });

      if (removedCount > 0) {
        localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
      }

      return removedCount;
    } catch (error) {
      console.error('Failed to clear old bookmarks:', error);
      return 0;
    }
  },

  exportBookmarks(): string {
    try {
      const bookmarks = this.getAllBookmarks();
      return JSON.stringify(
        {
          bookmarks,
          exportDate: new Date().toISOString(),
          version: '2.0',
        },
        null,
        2
      );
    } catch (error) {
      console.error('Failed to export bookmarks:', error);
      return '{}';
    }
  },

  importBookmarks(jsonData: string): { success: boolean; count: number; error?: string } {
    try {
      const data = JSON.parse(jsonData);

      if (!data.bookmarks || typeof data.bookmarks !== 'object') {
        return { success: false, count: 0, error: 'Invalid bookmark data format' };
      }

      const existingBookmarks = this.getAllBookmarks();
      const mergedBookmarks = { ...existingBookmarks, ...data.bookmarks };

      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(mergedBookmarks));

      return {
        success: true,
        count: Object.keys(data.bookmarks).length,
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
