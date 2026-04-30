# Supabase schema

This folder contains the database schema for LGGM (Phase 4).

## Apply

### Option A — Supabase dashboard (recommended)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of [`schema.sql`](./schema.sql).
3. Click **Run**.

The script is **idempotent** — safe to re-run after edits.

### Option B — psql

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f Backend/supabase/schema.sql
```

## What it creates

| Table | Purpose |
| --- | --- |
| `profiles` | App-level user data (extends `auth.users`) |
| `years` | Per-year distribution % defaults |
| `year_month_overrides` | Per-month % overrides (null → fall back to year default) |
| `categories` | User-managed transaction categories |
| `money_accounts` | Bank/wallet/cash accounts; balances kept in sync by trigger |
| `transactions` | Daily income/expense entries |
| `obligations` | Tithes, offering, first fruit, savings, bills, loans, other |
| `obligation_entries` | One row per (obligation, month) with planned/actual |
| `monthly_budget` | Per-month rollup (planned vs actual) |
| `audit_log` | Mutation history (read-only via RLS for owners) |

## Built-in triggers

- `set_updated_at` — keeps `updated_at` current on every update.
- `apply_txn_to_account` — when a transaction is inserted/updated/deleted,
  the linked `money_accounts.balance` is adjusted automatically
  (`+amount` for income, `-amount` for expense).
- `handle_new_user` — fires on `auth.users` insert; creates a `profiles`
  row and seeds 15 default categories for the new user.

## Row-Level Security

Every table has RLS **enabled** with a single policy:

```sql
using  (user_id = auth.uid())
with check (user_id = auth.uid())
```

Users physically cannot read or write another user's rows.

## Verifying

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

All `public.*` tables should report `rowsecurity = true`.
