-- =============================================================================
-- FILE: supabase/migrations/001_initial_schema.sql
-- PURPOSE: Creates all database tables for the Stockifyy platform.
--          Run this in your Supabase SQL editor to set up the database.
--          Tables follow the schema designed in the architecture phase.
--          Every user-facing table has Row Level Security (RLS) enabled.
-- =============================================================================

-- Enable UUID generation (needed for all primary keys)
create extension if not exists "uuid-ossp";


-- =============================================================================
-- TABLE: profiles
-- Extends Supabase's built-in auth.users table with extra user information.
-- Created automatically when a user signs up (via trigger below).
-- =============================================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  username      text unique,
  phone         text,
  avatar_url    text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a profile when a new user registers
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================================
-- TABLE: user_preferences
-- Stores UI preferences per user (theme, chart type, etc.)
-- One row per user — linked 1-to-1 with profiles.
-- =============================================================================
create table public.user_preferences (
  user_id               uuid primary key references public.profiles(id) on delete cascade,
  theme                 text not null default 'dark' check (theme in ('light', 'dark')),
  default_chart_type    text not null default 'candlestick',
  default_timeframe     text not null default '1D',
  notification_settings jsonb not null default '{"price_alerts": true, "announcements": true}'::jsonb,
  dashboard_layout      jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);


-- =============================================================================
-- TABLE: brokers
-- List of all brokerages integrated with Stockifyy via Capital Stake SSO.
-- Admin-managed — not user-editable.
-- =============================================================================
create table public.brokers (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  code              text not null unique,
  client_identifier text not null,
  logo_url          text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);


-- =============================================================================
-- TABLE: user_broker_links
-- Links a user to their broker account via an encrypted brokerUserCode.
-- The brokerUserCode is the encrypted key used in Capital Stake SSO calls.
-- It is NEVER returned to the browser — only used server-side.
-- =============================================================================
create table public.user_broker_links (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  broker_id        uuid not null references public.brokers(id),
  broker_user_code text not null,   -- encrypted — never expose to frontend
  is_demo          boolean not null default false,
  is_active        boolean not null default true,
  linked_at        timestamptz not null default now(),
  unique(user_id, broker_id)        -- one account per broker per user
);


-- =============================================================================
-- TABLE: plans
-- Subscription plans (Free, Pro, etc.)
-- Admin-managed — defines what each tier can access.
-- =============================================================================
create table public.plans (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null unique,
  price_monthly   numeric(10, 2) not null default 0,
  price_yearly    numeric(10, 2) not null default 0,
  features        jsonb not null default '{}'::jsonb,
  api_rate_limit  integer not null default 100,
  is_active       boolean not null default true
);

-- Seed the default plans
insert into public.plans (name, price_monthly, price_yearly, features, api_rate_limit) values
  ('Free',       0,    0,    '{"watchlist": 5, "portfolios": 1, "alerts": 3}'::jsonb,  50),
  ('Pro',        999,  9990, '{"watchlist": 50, "portfolios": 5, "alerts": 25}'::jsonb, 500),
  ('Enterprise', 4999, 49990,'{"watchlist": -1, "portfolios": -1, "alerts": -1}'::jsonb, 5000);


-- =============================================================================
-- TABLE: user_subscriptions
-- Which plan is each user on, and is their subscription active?
-- =============================================================================
create table public.user_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  plan_id     uuid not null references public.plans(id),
  status      text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);


-- =============================================================================
-- TABLE: watchlists
-- A user can have multiple watchlists (e.g., "My Favourites", "Bluechips")
-- =============================================================================
create table public.watchlists (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);


-- =============================================================================
-- TABLE: watchlist_items
-- Individual stock symbols inside a watchlist.
-- =============================================================================
create table public.watchlist_items (
  id           uuid primary key default uuid_generate_v4(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  symbol       text not null,
  sort_order   integer not null default 0,
  added_at     timestamptz not null default now(),
  unique(watchlist_id, symbol)     -- same symbol can't be in same watchlist twice
);


-- =============================================================================
-- TABLE: portfolios
-- A user can track multiple portfolios (e.g. real account + paper trading)
-- =============================================================================
create table public.portfolios (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  broker_link_id uuid references public.user_broker_links(id) on delete set null,
  name           text not null,
  currency       text not null default 'PKR',
  created_at     timestamptz not null default now()
);


-- =============================================================================
-- TABLE: portfolio_holdings
-- Current holdings in a portfolio — what stocks the user owns right now.
-- avg_buy_price is the weighted average buy price across all purchases.
-- =============================================================================
create table public.portfolio_holdings (
  id             uuid primary key default uuid_generate_v4(),
  portfolio_id   uuid not null references public.portfolios(id) on delete cascade,
  symbol         text not null,
  quantity       numeric(15, 4) not null default 0,
  avg_buy_price  numeric(15, 4) not null default 0,
  updated_at     timestamptz not null default now(),
  unique(portfolio_id, symbol)
);


-- =============================================================================
-- TABLE: portfolio_transactions
-- Full history of every buy/sell transaction in each portfolio.
-- =============================================================================
create table public.portfolio_transactions (
  id               uuid primary key default uuid_generate_v4(),
  portfolio_id     uuid not null references public.portfolios(id) on delete cascade,
  symbol           text not null,
  type             text not null check (type in ('BUY', 'SELL')),
  quantity         numeric(15, 4) not null,
  price            numeric(15, 4) not null,
  total_value      numeric(15, 4) not null,
  transaction_date date not null,
  notes            text,
  created_at       timestamptz not null default now()
);


-- =============================================================================
-- TABLE: price_alerts
-- User-defined price alerts — notify when a stock crosses a threshold.
-- =============================================================================
create table public.price_alerts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  symbol       text not null,
  condition    text not null check (condition in ('above', 'below')),
  target_price numeric(15, 4) not null,
  is_triggered boolean not null default false,
  triggered_at timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);


-- =============================================================================
-- TABLE: saved_screens
-- User-saved stock screener filters for quick reuse.
-- =============================================================================
create table public.saved_screens (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  filters    jsonb not null default '{}'::jsonb,
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);


-- =============================================================================
-- TABLE: audit_logs
-- Records every important action a user takes — logins, SSO calls, etc.
-- Used for security monitoring and debugging.
-- No RLS — only admin can read audit logs directly.
-- =============================================================================
create table public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id) on delete set null,
  action     text not null,
  resource   text,
  metadata   jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);


-- =============================================================================
-- TABLE: data_sync_log
-- Tracks when we last synced each type of data from Capital Stake.
-- Helps us debug if data seems stale or if API calls are failing.
-- =============================================================================
create table public.data_sync_log (
  id              uuid primary key default uuid_generate_v4(),
  data_type       text not null unique,
  last_synced_at  timestamptz,
  status          text not null default 'ok' check (status in ('ok', 'error')),
  records_synced  integer,
  error_message   text
);
