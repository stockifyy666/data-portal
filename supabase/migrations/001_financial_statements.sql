-- =============================================================================
-- Migration: 001_financial_statements
-- Run this once in Supabase → SQL Editor
--
-- Creates one table that stores all financial data fetched from Capital Stake:
--   income / balance / cashflow / fundamentals / shareholders
--   annual + quarterly
--
-- Primary key: (symbol, stmt_type, interval)
-- Data is stored as JSONB in the same StatementData shape the app already uses.
-- =============================================================================

CREATE TABLE IF NOT EXISTS financial_statements (
  symbol      TEXT         NOT NULL,
  stmt_type   TEXT         NOT NULL,  -- 'income' | 'balance' | 'cashflow' | 'fundamentals' | 'shareholders'
  interval    TEXT         NOT NULL,  -- 'annual' | 'quarterly'
  data        JSONB        NOT NULL,  -- transformed StatementData: { periods, fields }
  raw_data    JSONB,                  -- raw Capital Stake response (kept for re-use in peers route)
  fetched_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, stmt_type, interval)
);

-- Index for fast symbol lookups
CREATE INDEX IF NOT EXISTS idx_fs_symbol    ON financial_statements (symbol);
-- Index for finding stale rows in the nightly sync
CREATE INDEX IF NOT EXISTS idx_fs_fetched   ON financial_statements (fetched_at);
-- Index for the sync route to find which symbols need refreshing
CREATE INDEX IF NOT EXISTS idx_fs_sym_type  ON financial_statements (symbol, stmt_type);

-- Row-level security: only service role can read/write (server-side only)
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;

-- Allow the service role full access (used by Next.js server)
CREATE POLICY "service_role_all" ON financial_statements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
