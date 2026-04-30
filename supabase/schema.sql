-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LGGM — Lamb of God Global Ministries                            ║
-- ║  Supabase / PostgreSQL schema (Phase 4)                          ║
-- ║                                                                  ║
-- ║  Apply via:                                                      ║
-- ║    Supabase dashboard → SQL Editor → New query → Paste → Run     ║
-- ║  Or via psql:                                                    ║
-- ║    psql "$DATABASE_URL" -f Backend/supabase/schema.sql           ║
-- ║                                                                  ║
-- ║  Idempotent — safe to re-run.                                    ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ── Required extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ╔════════════════════════════════════════════════╗
-- ║  Helper: generic updated_at trigger            ║
-- ╚════════════════════════════════════════════════╝
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ╔════════════════════════════════════════════════╗
-- ║  profiles                                      ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read"   on public.profiles;
drop policy if exists "profiles_self_write"  on public.profiles;

create policy "profiles_self_read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_self_write"
  on public.profiles for all
  using  (id = auth.uid())
  with check (id = auth.uid());

-- ╔════════════════════════════════════════════════╗
-- ║  years                                         ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.years (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  year                int  not null,
  is_active           boolean not null default false,
  tithes_pct          numeric(5,2) not null default 10.00,
  offering_pct        numeric(5,2) not null default 5.00,
  savings_pct         numeric(5,2) not null default 10.00,
  first_fruit_pct     numeric(5,2) not null default 0.00,
  other_expenses_pct  numeric(5,2) not null default 0.00,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, year)
);

drop trigger if exists trg_years_updated_at on public.years;
create trigger trg_years_updated_at
  before update on public.years
  for each row execute function public.set_updated_at();

create index if not exists idx_years_user on public.years(user_id);

alter table public.years enable row level security;

drop policy if exists "years_owner_all" on public.years;
create policy "years_owner_all"
  on public.years for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ╔════════════════════════════════════════════════╗
-- ║  year_month_overrides                          ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.year_month_overrides (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  year_id             uuid not null references public.years(id) on delete cascade,
  month               int  not null check (month between 1 and 12),
  tithes_pct          numeric(5,2),
  offering_pct        numeric(5,2),
  savings_pct         numeric(5,2),
  first_fruit_pct     numeric(5,2),
  other_expenses_pct  numeric(5,2),
  notes               text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (year_id, month)
);

drop trigger if exists trg_ymo_updated_at on public.year_month_overrides;
create trigger trg_ymo_updated_at
  before update on public.year_month_overrides
  for each row execute function public.set_updated_at();

create index if not exists idx_ymo_user on public.year_month_overrides(user_id);
create index if not exists idx_ymo_year on public.year_month_overrides(year_id);

alter table public.year_month_overrides enable row level security;

drop policy if exists "ymo_owner_all" on public.year_month_overrides;
create policy "ymo_owner_all"
  on public.year_month_overrides for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ╔════════════════════════════════════════════════╗
-- ║  categories                                    ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('income','expense')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_categories_user on public.categories(user_id);

alter table public.categories enable row level security;

drop policy if exists "categories_owner_all" on public.categories;
create policy "categories_owner_all"
  on public.categories for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ╔════════════════════════════════════════════════╗
-- ║  money_accounts                                ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.money_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  type                text not null check (type in (
                        'bank_account','cash_on_hand','stc_bank','gcash','e_wallet','other')),
  account_identifier  text default '',
  balance             numeric(14,2) not null default 0,
  is_active           boolean not null default true,
  notes               text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_money_accounts_updated_at on public.money_accounts;
create trigger trg_money_accounts_updated_at
  before update on public.money_accounts
  for each row execute function public.set_updated_at();

create index if not exists idx_money_accounts_user on public.money_accounts(user_id);

alter table public.money_accounts enable row level security;

drop policy if exists "money_accounts_owner_all" on public.money_accounts;
create policy "money_accounts_owner_all"
  on public.money_accounts for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ╔════════════════════════════════════════════════╗
-- ║  transactions                                  ║
-- ║  source-of-truth for income_amount &           ║
-- ║  other_actual on monthly_budget (Option C).    ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  year_id           uuid not null references public.years(id) on delete cascade,
  month             int  not null check (month between 1 and 12),
  transaction_date  date not null,
  description       text not null default '',
  type              text not null check (type in ('income','expense')),
  category_id       uuid references public.categories(id) on delete set null,
  money_account_id  uuid references public.money_accounts(id) on delete set null,
  amount            numeric(14,2) not null check (amount >= 0),
  status            text not null default 'completed',
  notes             text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create index if not exists idx_txn_user             on public.transactions(user_id);
create index if not exists idx_txn_year_month       on public.transactions(year_id, month);
create index if not exists idx_txn_money_account    on public.transactions(money_account_id);
create index if not exists idx_txn_category         on public.transactions(category_id);

alter table public.transactions enable row level security;

drop policy if exists "transactions_owner_all" on public.transactions;
create policy "transactions_owner_all"
  on public.transactions for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Trigger: keep money_accounts.balance in sync with transactions ──
create or replace function public.apply_txn_to_account()
returns trigger
language plpgsql
as $$
declare
  sign_old int;
  sign_new int;
begin
  if (tg_op = 'INSERT') then
    if new.money_account_id is not null then
      sign_new := case when new.type = 'income' then 1 else -1 end;
      update public.money_accounts
        set balance = balance + (sign_new * new.amount),
            updated_at = now()
        where id = new.money_account_id and user_id = new.user_id;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if old.money_account_id is not null then
      sign_old := case when old.type = 'income' then 1 else -1 end;
      update public.money_accounts
        set balance = balance - (sign_old * old.amount),
            updated_at = now()
        where id = old.money_account_id and user_id = old.user_id;
    end if;
    return old;
  elsif (tg_op = 'UPDATE') then
    -- Reverse the old impact, then apply the new.
    if old.money_account_id is not null then
      sign_old := case when old.type = 'income' then 1 else -1 end;
      update public.money_accounts
        set balance = balance - (sign_old * old.amount),
            updated_at = now()
        where id = old.money_account_id and user_id = old.user_id;
    end if;
    if new.money_account_id is not null then
      sign_new := case when new.type = 'income' then 1 else -1 end;
      update public.money_accounts
        set balance = balance + (sign_new * new.amount),
            updated_at = now()
        where id = new.money_account_id and user_id = new.user_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_txn_apply_to_account on public.transactions;
create trigger trg_txn_apply_to_account
  after insert or update or delete on public.transactions
  for each row execute function public.apply_txn_to_account();

-- ╔════════════════════════════════════════════════╗
-- ║  obligations + obligation_entries              ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.obligations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  year_id           uuid not null references public.years(id) on delete cascade,
  kind              text not null check (kind in (
                      'tithes','offering','first_fruit','savings',
                      'fixed_bill','loan','other')),
  description       text not null default '',
  frequency         text not null default 'Monthly'
                      check (frequency in ('Monthly','Quarterly','Annual','One-off')),
  default_amount    numeric(14,2),
  remarks           text default '',
  -- Loan-specific (nullable when kind <> 'loan')
  interest_bearing  boolean,
  interest_pct      numeric(5,2),
  duration          text,
  loan_amount       numeric(14,2),
  interest_amount   numeric(14,2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_obligations_updated_at on public.obligations;
create trigger trg_obligations_updated_at
  before update on public.obligations
  for each row execute function public.set_updated_at();

create index if not exists idx_obl_user      on public.obligations(user_id);
create index if not exists idx_obl_year_kind on public.obligations(year_id, kind);

alter table public.obligations enable row level security;

drop policy if exists "obligations_owner_all" on public.obligations;
create policy "obligations_owner_all"
  on public.obligations for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.obligation_entries (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  obligation_id            uuid not null references public.obligations(id) on delete cascade,
  year_id                  uuid not null references public.years(id) on delete cascade,
  month                    int  not null check (month between 1 and 12),
  planned_amount           numeric(14,2) not null default 0,
  actual_amount            numeric(14,2) not null default 0,
  paid                     boolean not null default false,
  -- Savings-only: actual_amount only counts toward KPI when transferred
  transferred_to_bank      boolean not null default false,
  transferred_at           timestamptz,
  transferred_to_account   uuid references public.money_accounts(id) on delete set null,
  notes                    text default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (obligation_id, month)
);

drop trigger if exists trg_obl_entries_updated_at on public.obligation_entries;
create trigger trg_obl_entries_updated_at
  before update on public.obligation_entries
  for each row execute function public.set_updated_at();

create index if not exists idx_oe_user       on public.obligation_entries(user_id);
create index if not exists idx_oe_obligation on public.obligation_entries(obligation_id);
create index if not exists idx_oe_year_month on public.obligation_entries(year_id, month);

alter table public.obligation_entries enable row level security;

drop policy if exists "obligation_entries_owner_all" on public.obligation_entries;
create policy "obligation_entries_owner_all"
  on public.obligation_entries for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ╔════════════════════════════════════════════════╗
-- ║  monthly_budget                                ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.monthly_budget (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  year_id               uuid not null references public.years(id) on delete cascade,
  month                 int  not null check (month between 1 and 12),
  income_amount         numeric(14,2) not null default 0,
  -- Planned (income × resolved %)
  tithes_planned        numeric(14,2) not null default 0,
  offering_planned      numeric(14,2) not null default 0,
  savings_planned       numeric(14,2) not null default 0,
  first_fruit_planned   numeric(14,2) not null default 0,
  other_planned         numeric(14,2) not null default 0,
  -- Actual (rolled up per source)
  tithes_actual         numeric(14,2) not null default 0,
  offering_actual       numeric(14,2) not null default 0,
  savings_actual        numeric(14,2) not null default 0,
  first_fruit_actual    numeric(14,2) not null default 0,
  loans_actual          numeric(14,2) not null default 0,
  fixed_bills_actual    numeric(14,2) not null default 0,
  other_actual          numeric(14,2) not null default 0,
  status                text not null default 'under_budget'
                          check (status in ('under_budget','at_budget','over_budget')),
  notes                 text default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (year_id, month)
);

drop trigger if exists trg_monthly_budget_updated_at on public.monthly_budget;
create trigger trg_monthly_budget_updated_at
  before update on public.monthly_budget
  for each row execute function public.set_updated_at();

create index if not exists idx_mb_user       on public.monthly_budget(user_id);
create index if not exists idx_mb_year_month on public.monthly_budget(year_id, month);

alter table public.monthly_budget enable row level security;

drop policy if exists "monthly_budget_owner_all" on public.monthly_budget;
create policy "monthly_budget_owner_all"
  on public.monthly_budget for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ╔════════════════════════════════════════════════╗
-- ║  audit_log                                     ║
-- ╚════════════════════════════════════════════════╝
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  table_name  text not null,
  record_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_user  on public.audit_log(user_id);
create index if not exists idx_audit_table on public.audit_log(table_name);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_owner_read" on public.audit_log;
create policy "audit_log_owner_read"
  on public.audit_log for select
  using (user_id = auth.uid());

-- audit_log writes are performed by triggers / service role only.

-- ╔════════════════════════════════════════════════╗
-- ║  Auto-bootstrap on signup                      ║
-- ║  Creates: profile + default categories         ║
-- ╚════════════════════════════════════════════════╝
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Profile
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- Default categories
  insert into public.categories (user_id, name, type)
  values
    (new.id, 'Salary',          'income'),
    (new.id, 'Part Time Job',   'income'),
    (new.id, 'Freelance',       'income'),
    (new.id, 'Gift',            'income'),
    (new.id, 'Other Income',    'income'),
    (new.id, 'Electricity',     'expense'),
    (new.id, 'Water',           'expense'),
    (new.id, 'Internet',        'expense'),
    (new.id, 'Food',            'expense'),
    (new.id, 'Transportation',  'expense'),
    (new.id, 'Rent',            'expense'),
    (new.id, 'Family Support',  'expense'),
    (new.id, 'Medical',         'expense'),
    (new.id, 'Education',       'expense'),
    (new.id, 'Other Expense',   'expense')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ╔════════════════════════════════════════════════╗
-- ║  Done                                          ║
-- ╚════════════════════════════════════════════════╝
-- Verify: every public table should have rowsecurity = true
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--   order by tablename;
