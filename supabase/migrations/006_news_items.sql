-- =============================================================================
-- Migration: 006_news_items
-- Run once in Supabase → SQL Editor.
--
-- Rolling news archive for the News page:
--   • every market / general article the app receives is stored once (by link)
--   • "Today" and "This Week" tabs read from here
--   • rows older than 14 days are purged by the hourly sync (/api/sync/live-content)
-- Server-only: RLS on, no public policies; the service role is granted access.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.news_items (
  link          TEXT        PRIMARY KEY,               -- article URL (dedupe key)
  scope         TEXT        NOT NULL,                  -- 'market' | 'general'
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  image         TEXT        NOT NULL DEFAULT '',
  source        TEXT        NOT NULL DEFAULT '',
  published_at  TIMESTAMPTZ NOT NULL,
  stored_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_items_scope_pub ON public.news_items (scope, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_pub       ON public.news_items (published_at);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_items TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'news_items' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON public.news_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
