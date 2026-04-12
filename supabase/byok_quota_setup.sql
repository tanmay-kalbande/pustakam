-- ============================================================================
-- BYOK & QUOTA SETUP — Run in Supabase SQL Editor
-- Creates the platform_config table for admin-editable settings.
-- ============================================================================

-- Platform configuration table (admin-editable key-value store)
CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default free book limit (2 free books per user)
INSERT INTO public.platform_config (key, value, description)
VALUES (
  'free_book_limit',
  '2'::jsonb,
  'Number of free books each user can generate using the platform proxy. Set to 0 to disable free tier.'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- RLS: Anyone can read config, only admins can write
-- ============================================================================

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users and anon can read config values
CREATE POLICY "Anyone can read platform config" ON public.platform_config
  FOR SELECT USING (true);

-- Only admins can update config
CREATE POLICY "Admins can update platform config" ON public.platform_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can insert config
CREATE POLICY "Admins can insert platform config" ON public.platform_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT ON public.platform_config TO authenticated;
GRANT SELECT ON public.platform_config TO anon;

-- ============================================================================
-- Convenience function to get the free book limit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_free_book_limit()
RETURNS INTEGER AS $$
  SELECT COALESCE((value#>>'{}')::INTEGER, 2)
  FROM public.platform_config
  WHERE key = 'free_book_limit';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_free_book_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_free_book_limit() TO anon;

-- ============================================================================
-- USAGE EXAMPLES (for admins):
--
-- Change free limit to 5:
--   UPDATE platform_config SET value = '5', updated_at = NOW() WHERE key = 'free_book_limit';
--
-- Disable free tier entirely:
--   UPDATE platform_config SET value = '0', updated_at = NOW() WHERE key = 'free_book_limit';
--
-- Check current limit:
--   SELECT * FROM platform_config WHERE key = 'free_book_limit';
-- ============================================================================
