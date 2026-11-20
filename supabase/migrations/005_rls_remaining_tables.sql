-- =============================================================================
-- Migration: 005_rls_remaining_tables
-- Run once in Supabase → SQL Editor.
--
-- Fixes Supabase Security Advisor "rls_disabled_in_public" for the last four
-- public tables that never had Row-Level Security turned on.
--
--   audit_logs, data_sync_log → server-only (no public policies)
--   brokers, plans            → reference data: anyone may READ, nobody may write
--
-- The server (service role) bypasses RLS, so app code keeps working.
-- =============================================================================

ALTER TABLE public.audit_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans         ENABLE ROW LEVEL SECURITY;

-- Read-only access to reference data (broker list, subscription plans)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'brokers' AND policyname = 'public_read') THEN
    CREATE POLICY "public_read" ON public.brokers FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'public_read') THEN
    CREATE POLICY "public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- Server access for the logging tables (service role bypasses RLS, but grant
-- table privileges explicitly so inserts don't fail with "permission denied")
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs, public.data_sync_log TO service_role;

-- ── Check: every public table should now show rowsecurity = true ─────────────
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
