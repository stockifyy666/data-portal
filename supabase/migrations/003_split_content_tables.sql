-- =============================================================================
-- Migration: 003_split_content_tables
-- Run once in Supabase → SQL Editor.
--
-- Splits the mixed tables into one table per kind of data:
--   news              general + sector news         (was stock_content)
--   announcements     per-symbol announcements      (was stock_content)
--   company_profiles  overview / detail / shareholders
--                     (was stock_content + financial_statements 'shareholders')
--   fundamentals      per-symbol fundamentals       (was financial_statements 'fundamentals')
--   financial_statements  now only income / balance / cashflow
--
-- Existing rows are copied over. stock_content is left in place (unused by the
-- app after this) — drop it at the bottom once you've checked the new tables.
-- All tables: RLS on, server (service role) access only.
-- =============================================================================

-- ── news ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  scope      TEXT        NOT NULL,              -- 'general' | 'sector'
  key        TEXT        NOT NULL,              -- 'MARKET' for general, sector code for sector
  data       JSONB       NOT NULL,              -- raw CS news array
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key)
);

-- ── announcements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  symbol     TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── company_profiles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_profiles (
  symbol     TEXT        NOT NULL,
  kind       TEXT        NOT NULL,              -- 'overview' | 'detail' | 'shareholders'
  data       JSONB       NOT NULL,
  raw_data   JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, kind)
);

-- ── fundamentals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fundamentals (
  symbol     TEXT        NOT NULL,
  interval   TEXT        NOT NULL DEFAULT 'annual',
  data       JSONB       NOT NULL,              -- transformed StatementData
  raw_data   JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, interval)
);

-- ── Copy existing data ───────────────────────────────────────────────────────
INSERT INTO news (scope, key, data, fetched_at)
  SELECT 'general', symbol, data, fetched_at FROM stock_content WHERE content_type = 'general_news'
  ON CONFLICT (scope, key) DO NOTHING;

INSERT INTO news (scope, key, data, fetched_at)
  SELECT 'sector', regexp_replace(symbol, '^SECTOR_', ''), data, fetched_at
  FROM stock_content WHERE content_type = 'sector_news'
  ON CONFLICT (scope, key) DO NOTHING;

INSERT INTO announcements (symbol, data, fetched_at)
  SELECT symbol, data, fetched_at FROM stock_content WHERE content_type = 'announcements'
  ON CONFLICT (symbol) DO NOTHING;

INSERT INTO company_profiles (symbol, kind, data, fetched_at)
  SELECT symbol, CASE content_type WHEN 'profile_overview' THEN 'overview' ELSE 'detail' END, data, fetched_at
  FROM stock_content WHERE content_type IN ('profile_overview', 'profile_detail')
  ON CONFLICT (symbol, kind) DO NOTHING;

INSERT INTO company_profiles (symbol, kind, data, raw_data, fetched_at)
  SELECT symbol, 'shareholders', data, raw_data, fetched_at
  FROM financial_statements WHERE stmt_type = 'shareholders' AND interval = 'annual'
  ON CONFLICT (symbol, kind) DO NOTHING;

INSERT INTO fundamentals (symbol, interval, data, raw_data, fetched_at)
  SELECT symbol, interval, data, raw_data, fetched_at
  FROM financial_statements WHERE stmt_type = 'fundamentals'
  ON CONFLICT (symbol, interval) DO NOTHING;

-- financial_statements keeps only income / balance / cashflow
DELETE FROM financial_statements WHERE stmt_type IN ('fundamentals', 'shareholders');

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_news_fetched          ON news (fetched_at);
CREATE INDEX IF NOT EXISTS idx_announcements_fetched ON announcements (fetched_at);
CREATE INDEX IF NOT EXISTS idx_profiles_fetched      ON company_profiles (fetched_at);
CREATE INDEX IF NOT EXISTS idx_fundamentals_fetched  ON fundamentals (fetched_at);

-- ── Row-level security: server-side (service role) only ──────────────────────
ALTER TABLE news                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamentals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;  -- was showing UNRESTRICTED
ALTER TABLE stock_content        ENABLE ROW LEVEL SECURITY;  -- was showing UNRESTRICTED

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['news','announcements','company_profiles','fundamentals'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_all') THEN
      EXECUTE format('CREATE POLICY "service_role_all" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;

-- ── Optional cleanup once verified ───────────────────────────────────────────
-- DROP TABLE stock_content;
