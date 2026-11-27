-- =============================================================================
-- Migration: 009_news_items_scope_key
-- Run once in Supabase → SQL Editor (before deploying the matching code).
--
-- Problem: news_items used `link` alone as the primary key, so an article that
-- appears in BOTH the general feed and the market feed was stored only for the
-- first scope that saw it. The Market tab's "Today"/"This Week" views then
-- missed it (e.g. a story stored as 'general' never showed under 'market').
--
-- Fix: make (link, scope) the key, so the same article can be kept once per feed.
-- Existing rows are unaffected; missing market copies are filled in by the next
-- hourly sync (/api/sync/live-content) or the next News page load.
-- =============================================================================

ALTER TABLE public.news_items DROP CONSTRAINT IF EXISTS news_items_pkey;
ALTER TABLE public.news_items ADD PRIMARY KEY (link, scope);
