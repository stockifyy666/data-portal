-- =============================================================================
-- Migration: 009_insider_transactions
-- Run once in Supabase → SQL Editor.
--
-- Insider transactions (directors, executives, substantial shareholders).
--   • filled by /api/sync/insider — Mon–Fri at 5:00 PM PKT (12:00 UTC)
--   • the Insider page and the stock "Insider Trades" tab read ONLY from here
-- Server-only: RLS on, no public policies; the service role is granted access.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insider_transactions (
  id            TEXT          PRIMARY KEY,             -- Capital Stake row id
  symbol        TEXT          NOT NULL,
  company_name  TEXT          NOT NULL DEFAULT '',
  txn_date      DATE,
  type          TEXT          NOT NULL DEFAULT '',     -- buy | sell | esos | gift-out | …
  notice_id     TEXT          NOT NULL DEFAULT '',
  notice_date   DATE,
  name          TEXT          NOT NULL DEFAULT '',
  description   TEXT          NOT NULL DEFAULT '',     -- role, e.g. Executive Director
  price         NUMERIC(18,4) NOT NULL DEFAULT 0,
  shares        BIGINT        NOT NULL DEFAULT 0,
  share_type    TEXT          NOT NULL DEFAULT '',
  market        TEXT          NOT NULL DEFAULT '',
  stored_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insider_notice        ON public.insider_transactions (notice_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_insider_symbol_notice ON public.insider_transactions (symbol, notice_date DESC);

ALTER TABLE public.insider_transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insider_transactions TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'insider_transactions' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON public.insider_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
