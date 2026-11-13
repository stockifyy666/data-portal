-- Stock content: announcements and news per symbol.
-- Synced nightly by /api/sync/content. Served from DB — no CS call per user.

CREATE TABLE IF NOT EXISTS stock_content (
  symbol      TEXT        NOT NULL,
  content_type TEXT       NOT NULL,  -- 'announcements' | 'news'
  data        JSONB       NOT NULL,  -- raw array from CS UAT
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, content_type)
);

ALTER TABLE stock_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON stock_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS stock_content_fetched_at_idx ON stock_content (fetched_at);
