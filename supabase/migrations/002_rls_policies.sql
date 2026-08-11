-- =============================================================================
-- FILE: supabase/migrations/002_rls_policies.sql
-- PURPOSE: Row Level Security (RLS) policies for every user-facing table.
--          RLS is enforced at the DATABASE level — even if application code
--          has a bug, users can never read or modify another user's data.
--          Run this AFTER 001_initial_schema.sql in Supabase SQL editor.
-- =============================================================================


-- =============================================================================
-- Enable RLS on all user-facing tables
-- =============================================================================
alter table public.profiles             enable row level security;
alter table public.user_preferences     enable row level security;
alter table public.user_broker_links    enable row level security;
alter table public.user_subscriptions   enable row level security;
alter table public.watchlists           enable row level security;
alter table public.watchlist_items      enable row level security;
alter table public.portfolios           enable row level security;
alter table public.portfolio_holdings   enable row level security;
alter table public.portfolio_transactions enable row level security;
alter table public.price_alerts         enable row level security;
alter table public.saved_screens        enable row level security;


-- =============================================================================
-- PROFILES — Users can only see and edit their own profile
-- =============================================================================
create policy "profiles: user can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: user can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- =============================================================================
-- USER PREFERENCES — Users can only access their own preferences
-- =============================================================================
create policy "preferences: user can view own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "preferences: user can insert own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "preferences: user can update own"
  on public.user_preferences for update
  using (auth.uid() = user_id);


-- =============================================================================
-- USER BROKER LINKS — Users can only see their own broker connections
-- broker_user_code is encrypted — even the user should not see it raw
-- =============================================================================
create policy "broker_links: user can view own"
  on public.user_broker_links for select
  using (auth.uid() = user_id);

create policy "broker_links: user can insert own"
  on public.user_broker_links for insert
  with check (auth.uid() = user_id);

create policy "broker_links: user can deactivate own"
  on public.user_broker_links for update
  using (auth.uid() = user_id);


-- =============================================================================
-- USER SUBSCRIPTIONS — Users can only see their own subscription
-- =============================================================================
create policy "subscriptions: user can view own"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);


-- =============================================================================
-- WATCHLISTS — Users can only manage their own watchlists
-- =============================================================================
create policy "watchlists: user can view own"
  on public.watchlists for select
  using (auth.uid() = user_id);

create policy "watchlists: user can create"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

create policy "watchlists: user can update own"
  on public.watchlists for update
  using (auth.uid() = user_id);

create policy "watchlists: user can delete own"
  on public.watchlists for delete
  using (auth.uid() = user_id);


-- =============================================================================
-- WATCHLIST ITEMS — Users can only access items in their own watchlists
-- We join through watchlists table to verify ownership
-- =============================================================================
create policy "watchlist_items: user can view own"
  on public.watchlist_items for select
  using (
    exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );

create policy "watchlist_items: user can insert into own watchlist"
  on public.watchlist_items for insert
  with check (
    exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );

create policy "watchlist_items: user can delete from own watchlist"
  on public.watchlist_items for delete
  using (
    exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid()
    )
  );


-- =============================================================================
-- PORTFOLIOS — Users can only manage their own portfolios
-- =============================================================================
create policy "portfolios: user can view own"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "portfolios: user can create"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "portfolios: user can update own"
  on public.portfolios for update
  using (auth.uid() = user_id);

create policy "portfolios: user can delete own"
  on public.portfolios for delete
  using (auth.uid() = user_id);


-- =============================================================================
-- PORTFOLIO HOLDINGS — Access through portfolio ownership
-- =============================================================================
create policy "holdings: user can view own"
  on public.portfolio_holdings for select
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );

create policy "holdings: user can manage own"
  on public.portfolio_holdings for all
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );


-- =============================================================================
-- PORTFOLIO TRANSACTIONS — Access through portfolio ownership
-- =============================================================================
create policy "transactions: user can view own"
  on public.portfolio_transactions for select
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );

create policy "transactions: user can insert into own portfolio"
  on public.portfolio_transactions for insert
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );


-- =============================================================================
-- PRICE ALERTS — Users can only manage their own alerts
-- =============================================================================
create policy "alerts: user can view own"
  on public.price_alerts for select
  using (auth.uid() = user_id);

create policy "alerts: user can create"
  on public.price_alerts for insert
  with check (auth.uid() = user_id);

create policy "alerts: user can update own"
  on public.price_alerts for update
  using (auth.uid() = user_id);

create policy "alerts: user can delete own"
  on public.price_alerts for delete
  using (auth.uid() = user_id);


-- =============================================================================
-- SAVED SCREENS — Users can see their own + public screens from others
-- =============================================================================
create policy "screens: user can view own and public"
  on public.saved_screens for select
  using (auth.uid() = user_id or is_public = true);

create policy "screens: user can create"
  on public.saved_screens for insert
  with check (auth.uid() = user_id);

create policy "screens: user can update own"
  on public.saved_screens for update
  using (auth.uid() = user_id);

create policy "screens: user can delete own"
  on public.saved_screens for delete
  using (auth.uid() = user_id);
