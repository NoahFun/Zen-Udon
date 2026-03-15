# Restaurant Daily Expense and Profit App

Restaurant daily revenue/expense tracker with Supabase auth and online persistence.

## Run

```bash
npm install
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Run SQL from `docs/supabase/schema.sql` in Supabase SQL Editor.
3. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart dev server.

If env vars are not set, the app falls back to local mode for development/testing.

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Core Workflow

1. Manage fixed items in `Master List` (category, item, unit cost).
2. In `Daily Entry`, enter revenue and quantity for each item.
3. App auto-calculates amount per row, daily expenses, and daily profit.
4. Use `Dashboard` for daily/weekly/monthly summaries and charts.

## Export

- Daily/Weekly/Monthly `Export XLSX` from dashboard cards.
- Rows are grouped by `Category + Item + Unit Cost`, with `Revenue`, `Total Expenses`, and `Profit` footer lines.
