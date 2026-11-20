-- =============================================================================
-- Migration: 004_grant_content_tables
-- Run once in Supabase → SQL Editor.
--
-- Tables created in 003 weren't granted to the API roles, so the server
-- (service_role) got "permission denied" on every read/write. This grants
-- server-only access. anon/authenticated stay locked out (RLS + no grant).
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE
  ON news, announcements, company_profiles, fundamentals
  TO service_role;
