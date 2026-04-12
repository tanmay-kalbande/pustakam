// src/services/quotaService.ts
// ============================================================================
// Quota Service — Tracks free usage limits via Supabase
// Free limit is admin-configurable from the platform_config table.
// No hardcoding — update the DB and it takes effect immediately.
// ============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { byokStorage } from '../utils/byokStorage';
import type { QuotaStatus } from '../types/providers';

// Cache the free limit to avoid hitting Supabase on every check
let cachedFreeLimit: number | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

    // Return cached value if still fresh
    if (cachedFreeLimit !== null && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedFreeLimit;
    }

    if (!supabase || !isSupabaseConfigured()) {
      cachedFreeLimit = 2;
      cacheTimestamp = now;
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
        // value is stored as JSONB — could be a number directly or a string
        const raw = data.value;
        const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        cachedFreeLimit = isNaN(parsed) ? 2 : parsed;
      }
    } catch (err) {
      console.error('[Quota] Exception fetching free limit:', err);
      cachedFreeLimit = 2;
    }

    cacheTimestamp = now;
    return cachedFreeLimit!;
  },

  /**
   * Get the number of books the user has created.
   * Reads from profiles.books_created if Supabase is configured,
   * otherwise counts localStorage books.
   */
  async getBooksUsed(userId?: string | null): Promise<number> {
    if (!supabase || !isSupabaseConfigured() || !userId) {
      // Fallback: count books in localStorage
      try {
        const key = userId ? `pustakam-books-${userId}` : 'pustakam-books';
        const raw = localStorage.getItem(key);
        if (!raw) return 0;
        const books = JSON.parse(raw);
        return Array.isArray(books) ? books.filter((b: any) => b.status === 'completed').length : 0;
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
   * This is the primary method — call this before every book generation.
   */
  async getQuotaStatus(userId?: string | null): Promise<QuotaStatus> {
    const [freeLimit, booksUsed] = await Promise.all([
      this.getFreeLimit(),
      this.getBooksUsed(userId),
    ]);

    const remaining = Math.max(0, freeLimit - booksUsed);
    const hasFreeQuota = remaining > 0;
    
    // Ensure the namespace matches the user checking quota 
    byokStorage.setNamespace(userId || null);
    const hasBYOK = byokStorage.hasAnyKey();

    let mode: QuotaStatus['mode'];
    if (hasFreeQuota) {
      mode = 'proxy';  // Use platform proxy (free tier)
    } else if (hasBYOK) {
      mode = 'byok';   // Use user's own API key
    } else {
      mode = 'blocked'; // Cannot generate
    }

    return {
      freeLimit,
      booksUsed,
      remaining,
      hasFreeQuota,
      hasBYOK,
      canGenerate: hasFreeQuota || hasBYOK,
      mode,
    };
  },

  /**
   * Force-refresh the cached free limit (e.g., after admin changes it)
   */
  invalidateCache(): void {
    cachedFreeLimit = null;
    cacheTimestamp = 0;
  },
};

export default quotaService;
