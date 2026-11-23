-- 007: columns/constraints the app uses that were added by hand on the old
-- database but never captured in a migration. Safe to re-run.

-- 1. Superadmin role (used by admin pages and the role route)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin', 'superadmin'));

-- 2. Watchlist: price when the symbol was added (watchlist P/L)
alter table public.watchlist_items
  add column if not exists added_price numeric(15, 4) not null default 0;

-- 3. Portfolio sell history: owner, original buy price and commission
alter table public.portfolio_transactions
  add column if not exists user_id    uuid references public.profiles(id) on delete cascade,
  add column if not exists buy_price  numeric(15, 4),
  add column if not exists commission numeric(15, 4) not null default 0;

create index if not exists portfolio_transactions_user_idx
  on public.portfolio_transactions (user_id, transaction_date desc);
