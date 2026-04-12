// src/services/planService.ts
// Plan management service for Pustakam - All users have yearly plan

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { PlanType } from '../types/plan';

// ============================================================================
// Types
// ============================================================================

export interface PlanStatus {
    plan: PlanType;
    planName: string;
    isActive: boolean;
    expiresAt: Date | null;
    booksCreated: number;
    booksRemaining: number;
    canCreate: boolean;
}

// ============================================================================
// Plan Service
// ============================================================================

export const planService = {
    /**
     * Get current plan status for the authenticated user
     */
    async getPlanStatus(): Promise<PlanStatus> {
        const defaultStatus: PlanStatus = {
            plan: 'yearly',
            planName: 'Yearly PRO',
            isActive: true,
            expiresAt: null,
            booksCreated: 0,
            booksRemaining: Infinity,
            canCreate: true,
        };

        if (!supabase || !isSupabaseConfigured()) {
            return defaultStatus;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return defaultStatus;
        }

        return defaultStatus;
    },

    /**
     * Increment books created count after successful book creation
     */
    async incrementBooksCreated(): Promise<boolean> {
        console.log('[PLAN] incrementBooksCreated called');

        if (!supabase || !isSupabaseConfigured()) {
            console.log('[PLAN] Supabase not configured, skipping');
            return true;
        }

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            console.log('[PLAN] Session check:', sessionData?.session ? 'Active session found' : 'NO SESSION');

            if (!sessionData?.session) {
                console.warn('[PLAN] No active session - user may need to re-authenticate');
                return false;
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) {
                console.error('[PLAN] getUser error:', userError.message);
                return false;
            }

            if (!user) {
                console.log('[PLAN] No authenticated user despite having session');
                return false;
            }

            console.log('[PLAN] Calling increment_books_created RPC for user:', user.id);

            const { error } = await supabase.rpc('increment_books_created', {
                p_user_id: user.id,
            });

            if (error) {
                console.error('[PLAN] RPC failed:', error.message, error.code, error.details);
                return false;
            }

            console.log('[PLAN] Books count incremented successfully');
            return true;
        } catch (err) {
            console.error('[PLAN] Exception:', err);
            return false;
        }
    },

    /**
     * Check if user can create a book - always allowed for all plans
     */
    async checkCanCreateBook(): Promise<{ allowed: boolean; message?: string }> {
        const status = await this.getPlanStatus();

        if (status.canCreate) {
            return { allowed: true };
        }

        if (!status.isActive) {
            return {
                allowed: false,
                message: 'Your plan has expired. Please renew to continue creating books.',
            };
        }

        return { allowed: true };
    },

    /**
     * Synchronize local books count with Supabase
     */
    async syncBooksCount(count: number): Promise<boolean> {
        if (!supabase || !isSupabaseConfigured()) {
            return false;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('books_created')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.warn('[PLAN] Unable to read profile while syncing books count:', profileError.message);
            return false;
        }

        if (profile && (profile.books_created || 0) < count) {
            const { error } = await supabase
                .from('profiles')
                .update({ books_created: count })
                .eq('id', user.id);

            return !error;
        }

        return false;
    },

    /**
     * Record completed book in Supabase with full details
     */
    async recordBookCompleted(
        bookId: string,
        title: string,
        goal: string,
        generationMode: string,
        modulesCount: number,
        wordCount: number
    ): Promise<boolean> {
        console.log('[PLAN] recordBookCompleted called with:', { bookId, title, generationMode, modulesCount, wordCount });

        if (!supabase || !isSupabaseConfigured()) {
            console.log('[PLAN] Supabase not configured for book tracking');
            return true;
        }

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.error('[PLAN] Session lookup failed while recording completed book:', sessionError.message);
                return false;
            }

            if (!sessionData.session) {
                console.warn('[PLAN] No active session - skipping completed book sync');
                return false;
            }

            const { data, error } = await supabase.rpc('record_book_completed', {
                p_book_id: bookId,
                p_title: title,
                p_goal: goal,
                p_generation_mode: generationMode,
                p_modules_count: modulesCount,
                p_word_count: wordCount,
            });

            if (error) {
                console.error('[PLAN] record_book_completed RPC failed:', error.message, error.code, error.details);
                return false;
            }

            if (!data) {
                console.warn('[PLAN] record_book_completed RPC returned false');
                return false;
            }

            console.log('[PLAN] Completed book synced successfully');
            return true;
        } catch (err) {
            console.error('[PLAN] Critical exception in recordBookCompleted:', err);
            return false;
        }
    },
};

export default planService;
