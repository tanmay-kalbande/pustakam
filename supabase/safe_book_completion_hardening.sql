-- ============================================================================
-- SAFE BOOK COMPLETION HARDENING
-- Purpose:
-- 1. Remove duplicate completion rows without resetting the app database
-- 2. Add uniqueness protection for (user_id, book_id)
-- 3. Re-sync profile counters from current data
-- 4. Replace record_book_completed() with an idempotent implementation
--
-- This script is SAFE for a live project.
-- It does NOT drop tables, recreate schemas, or remove user accounts.
-- Run this in the Supabase SQL Editor for the current app database.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DEDUPE COMPLETED BOOK ROWS
-- Keep the earliest row per (user_id, book_id) and remove later duplicates.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.book_history') IS NOT NULL THEN
    DELETE FROM public.book_history a
    USING public.book_history b
    WHERE a.user_id = b.user_id
      AND a.book_id = b.book_id
      AND (
        a.created_at > b.created_at
        OR (a.created_at = b.created_at AND a.id > b.id)
      );
  END IF;

  IF to_regclass('public.book_generations') IS NOT NULL THEN
    DELETE FROM public.book_generations a
    USING public.book_generations b
    WHERE a.user_id = b.user_id
      AND a.book_id = b.book_id
      AND (
        a.created_at > b.created_at
        OR (a.created_at = b.created_at AND a.id > b.id)
      );
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ADD UNIQUENESS PROTECTION
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.book_history') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_book_history_user_book_unique'
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX idx_book_history_user_book_unique ON public.book_history(user_id, book_id)';
    END IF;
  END IF;

  IF to_regclass('public.book_generations') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'idx_book_generations_user_book_unique'
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX idx_book_generations_user_book_unique ON public.book_generations(user_id, book_id)';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: RE-SYNC PROFILE COUNTERS
-- books_created is recalculated from the deduped completion table.
-- total_words_generated is recalculated when that column exists.
-- ============================================================================

DO $$
DECLARE
  has_profiles BOOLEAN := to_regclass('public.profiles') IS NOT NULL;
  has_total_words_generated BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'total_words_generated'
  );
BEGIN
  IF NOT has_profiles THEN
    RETURN;
  END IF;

  IF to_regclass('public.book_history') IS NOT NULL THEN
    IF has_total_words_generated THEN
      EXECUTE $sql$
        UPDATE public.profiles p
        SET books_created = COALESCE(stats.book_count, 0),
            total_words_generated = COALESCE(stats.word_count, 0),
            updated_at = NOW()
        FROM (
          SELECT user_id, COUNT(*)::INTEGER AS book_count, COALESCE(SUM(word_count), 0)::INTEGER AS word_count
          FROM public.book_history
          GROUP BY user_id
        ) stats
        WHERE p.id = stats.user_id
      $sql$;

      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = 0,
            total_words_generated = 0,
            updated_at = NOW()
        WHERE id NOT IN (SELECT DISTINCT user_id FROM public.book_history)
      $sql$;
    ELSE
      EXECUTE $sql$
        UPDATE public.profiles p
        SET books_created = COALESCE(stats.book_count, 0),
            updated_at = NOW()
        FROM (
          SELECT user_id, COUNT(*)::INTEGER AS book_count
          FROM public.book_history
          GROUP BY user_id
        ) stats
        WHERE p.id = stats.user_id
      $sql$;

      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = 0,
            updated_at = NOW()
        WHERE id NOT IN (SELECT DISTINCT user_id FROM public.book_history)
      $sql$;
    END IF;
  ELSIF to_regclass('public.book_generations') IS NOT NULL THEN
    IF has_total_words_generated THEN
      EXECUTE $sql$
        UPDATE public.profiles p
        SET books_created = COALESCE(stats.book_count, 0),
            total_words_generated = COALESCE(stats.word_count, 0),
            updated_at = NOW()
        FROM (
          SELECT user_id, COUNT(*)::INTEGER AS book_count, COALESCE(SUM(word_count), 0)::INTEGER AS word_count
          FROM public.book_generations
          GROUP BY user_id
        ) stats
        WHERE p.id = stats.user_id
      $sql$;

      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = 0,
            total_words_generated = 0,
            updated_at = NOW()
        WHERE id NOT IN (SELECT DISTINCT user_id FROM public.book_generations)
      $sql$;
    ELSE
      EXECUTE $sql$
        UPDATE public.profiles p
        SET books_created = COALESCE(stats.book_count, 0),
            updated_at = NOW()
        FROM (
          SELECT user_id, COUNT(*)::INTEGER AS book_count
          FROM public.book_generations
          GROUP BY user_id
        ) stats
        WHERE p.id = stats.user_id
      $sql$;

      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = 0,
            updated_at = NOW()
        WHERE id NOT IN (SELECT DISTINCT user_id FROM public.book_generations)
      $sql$;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: REPLACE record_book_completed() WITH AN IDEMPOTENT VERSION
-- This keeps current app flow the same, but retries no longer double-count.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_book_completed(
  p_book_id TEXT,
  p_title TEXT,
  p_goal TEXT,
  p_generation_mode TEXT,
  p_modules_count INTEGER,
  p_word_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_rows_inserted INTEGER := 0;
  has_book_history BOOLEAN := to_regclass('public.book_history') IS NOT NULL;
  has_book_generations BOOLEAN := to_regclass('public.book_generations') IS NOT NULL;
  has_app_activity BOOLEAN := to_regclass('public.app_activity') IS NOT NULL;
  has_total_words_generated BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'total_words_generated'
  );
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF has_book_history THEN
    EXECUTE $sql$
      INSERT INTO public.book_history (
        user_id, book_id, title, goal, generation_mode, modules_count, word_count
      )
      VALUES ($1, $2, $3, $4, COALESCE($5, 'stellar'), COALESCE($6, 0), COALESCE($7, 0))
      ON CONFLICT (user_id, book_id) DO NOTHING
    $sql$
    USING v_user_id, p_book_id, p_title, p_goal, p_generation_mode, p_modules_count, p_word_count;
  ELSIF has_book_generations THEN
    EXECUTE $sql$
      INSERT INTO public.book_generations (
        user_id, book_id, title, goal, generation_mode, modules_count, word_count
      )
      VALUES ($1, $2, $3, $4, COALESCE($5, 'stellar'), COALESCE($6, 0), COALESCE($7, 0))
      ON CONFLICT (user_id, book_id) DO NOTHING
    $sql$
    USING v_user_id, p_book_id, p_title, p_goal, p_generation_mode, p_modules_count, p_word_count;
  ELSE
    RETURN FALSE;
  END IF;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  IF v_rows_inserted = 0 THEN
    RETURN TRUE;
  END IF;

  IF has_book_history THEN
    IF has_total_words_generated THEN
      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = (
              SELECT COUNT(*)::INTEGER
              FROM public.book_history
              WHERE user_id = $1
            ),
            total_words_generated = (
              SELECT COALESCE(SUM(word_count), 0)::INTEGER
              FROM public.book_history
              WHERE user_id = $1
            ),
            updated_at = NOW()
        WHERE id = $1
      $sql$
      USING v_user_id;
    ELSE
      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = (
              SELECT COUNT(*)::INTEGER
              FROM public.book_history
              WHERE user_id = $1
            ),
            updated_at = NOW()
        WHERE id = $1
      $sql$
      USING v_user_id;
    END IF;
  ELSE
    IF has_total_words_generated THEN
      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = (
              SELECT COUNT(*)::INTEGER
              FROM public.book_generations
              WHERE user_id = $1
            ),
            total_words_generated = (
              SELECT COALESCE(SUM(word_count), 0)::INTEGER
              FROM public.book_generations
              WHERE user_id = $1
            ),
            updated_at = NOW()
        WHERE id = $1
      $sql$
      USING v_user_id;
    ELSE
      EXECUTE $sql$
        UPDATE public.profiles
        SET books_created = (
              SELECT COUNT(*)::INTEGER
              FROM public.book_generations
              WHERE user_id = $1
            ),
            updated_at = NOW()
        WHERE id = $1
      $sql$
      USING v_user_id;
    END IF;
  END IF;

  IF has_app_activity THEN
    EXECUTE $sql$
      INSERT INTO public.app_activity (user_id, activity_type, metadata)
      VALUES (
        $1,
        'book_completed',
        jsonb_build_object(
          'book_id', $2,
          'title', $3,
          'mode', COALESCE($4, 'stellar'),
          'modules', COALESCE($5, 0),
          'words', COALESCE($6, 0)
        )
      )
    $sql$
    USING v_user_id, p_book_id, p_title, p_generation_mode, p_modules_count, p_word_count;
  END IF;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_book_completed(text, text, text, text, integer, integer) TO authenticated;

COMMIT;

-- ============================================================================
-- OPTIONAL CHECKS AFTER RUNNING:
-- SELECT COUNT(*) FROM public.book_history;
-- SELECT COUNT(*) FROM public.book_generations;
-- SELECT id, books_created, total_words_generated FROM public.profiles LIMIT 20;
-- ============================================================================
