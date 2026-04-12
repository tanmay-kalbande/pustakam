// src/services/quotaService.ts
// ============================================================================
// Quota Service - Tracks free usage limits via Supabase
// ============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { byokStorage } from '../utils/byokStorage';
import type { QuotaStatus } from '../types/providers';
import { storageUtils } from '../utils/storage';

let cachedFreeLimit: number | null = null;
let freeLimitCacheTimestamp = 0;

const FREE_LIMIT_CACHE_TTL_MS = 5 * 60 * 1000;
const QUOTA_STATUS_CACHE_TTL_MS = 30 * 1000;

const quotaStatusCache = new Map<string, { status: QuotaStatus; timestamp: number }>();
const quotaStatusRequests = new Map<string, Promise<QuotaStatus>>();

const getQuotaCacheKey = (userId?: string | null): string => userId || 'anonymous';

// ============================================================================
// Quota Service
// ============================================================================

export const quotaService = {
  /**
   * Get the admin-configurable free book limit from Supabase.
   * Falls back to 2 if Supabase is not configured or the query fails.
   */
  async getFreeLimit(): Promise<number> {
    const now = Date.now();

    if (cachedFreeLimit !== null && now - freeLimitCacheTimestamp < FREE_LIMIT_CACHE_TTL_MS) {
      return cachedFreeLimit;
    }

    if (!supabase || !isSupabaseConfigured()) {
      cachedFreeLimit = 2;
      freeLimitCacheTimestamp = now;
      return 2;
    }

    try {
      const { data, error } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'free_book_limit')
        .single();

      if (error || !data) {
        console.warn('[Quota] Could not fetch free_book_limit from platform_config, using default 2');
        cachedFreeLimit = 2;
      } else {
        const raw = data.value;
        const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        cachedFreeLimit = Number.isNaN(parsed) ? 2 : parsed;
      }
    } catch (err) {
      console.error('[Quota] Exception fetching free limit:', err);
      cachedFreeLimit = 2;
    }

    freeLimitCacheTimestamp = now;
    return cachedFreeLimit!;
  },

  /**
   * Get the number of books the user has created.
   * Reads from profiles.books_created if Supabase is configured,
   * otherwise counts locally persisted completed books.
   */
  async getBooksUsed(userId?: string | null): Promise<number> {
    if (!supabase || !isSupabaseConfigured() || !userId) {
      try {
        const books = await storageUtils.getBooks(userId);
        return books.filter(book => book.status === 'completed').length;
      } catch {
        return 0;
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('books_created')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.warn('[Quota] Could not fetch books_created for user, returning 0');
        return 0;
      }

      return data.books_created || 0;
    } catch (err) {
      console.error('[Quota] Exception fetching books used:', err);
      return 0;
    }
  },

  /**
   * Get the full quota status for a user.
   * Dedupe in-flight reads so rapid UI refreshes do not fan out into multiple requests.
   */
  async getQuotaStatus(
    userId?: string | null,
    options: { forceRefresh?: boolean } = {}
  ): Promise<QuotaStatus> {
    const cacheKey = getQuotaCacheKey(userId);
    const now = Date.now();

    if (!options.forceRefresh) {
      const cached = quotaStatusCache.get(cacheKey);
      if (cached && now - cached.timestamp < QUOTA_STATUS_CACHE_TTL_MS) {
        return cached.status;
      }

      const inFlight = quotaStatusRequests.get(cacheKey);
      if (inFlight) {
        return inFlight;
      }
    }

    const request = (async () => {
      const [freeLimit, booksUsed] = await Promise.all([
        this.getFreeLimit(),
        this.getBooksUsed(userId),
      ]);

      const remaining = Math.max(0, freeLimit - booksUsed);
      const hasFreeQuota = remaining > 0;

      byokStorage.setNamespace(userId || null);
      const hasBYOK = byokStorage.hasAnyKey();

      let mode: QuotaStatus['mode'];
      if (hasFreeQuota) {
        mode = 'proxy';
      } else if (hasBYOK) {
        mode = 'byok';
      } else {
        mode = 'blocked';
      }

      const status: QuotaStatus = {
        freeLimit,
        booksUsed,
        remaining,
        hasFreeQuota,
        hasBYOK,
        canGenerate: hasFreeQuota || hasBYOK,
        mode,
      };

      quotaStatusCache.set(cacheKey, { status, timestamp: Date.now() });
      return status;
    })().finally(() => {
      quotaStatusRequests.delete(cacheKey);
    });

    quotaStatusRequests.set(cacheKey, request);
    return request;
  },

  /**
   * Force-refresh the cached free limit and quota status.
   */
  invalidateCache(userId?: string | null): void {
    cachedFreeLimit = null;
    freeLimitCacheTimestamp = 0;

    if (typeof userId === 'undefined') {
      quotaStatusCache.clear();
      quotaStatusRequests.clear();
      return;
    }

    const cacheKey = getQuotaCacheKey(userId);
    quotaStatusCache.delete(cacheKey);
    quotaStatusRequests.delete(cacheKey);
  },
};

export default quotaService;
