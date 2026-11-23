-- 008: remove tables for features that are not part of the current release
-- (portfolios, price alerts, brokers, subscriptions, saved screens, preferences)
-- plus unused/legacy tables. Their RLS policies are removed with them.
--
-- Kept: profiles, watchlists, watchlist_items, news, news_items, announcements,
--       company_profiles, fundamentals, financial_statements.
--
-- To bring a feature back later, re-create its table(s) in a new migration.

drop table if exists public.portfolio_transactions cascade;
drop table if exists public.portfolio_holdings     cascade;
drop table if exists public.portfolios             cascade;
drop table if exists public.price_alerts           cascade;
drop table if exists public.user_broker_links      cascade;
drop table if exists public.brokers                cascade;
drop table if exists public.user_subscriptions     cascade;
drop table if exists public.plans                  cascade;
drop table if exists public.saved_screens          cascade;
drop table if exists public.user_preferences       cascade;
drop table if exists public.audit_logs             cascade;
drop table if exists public.data_sync_log          cascade;
drop table if exists public.stock_content          cascade;  -- legacy, replaced by split tables (003)
