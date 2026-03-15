# Restaurant Supabase Auth + Online Data Design

## Overview

Migrate the app from browser-local persistence to Supabase-backed online storage with account-based access.

## Goals

- Email/password authentication with separate data per account.
- Remember Me on both Sign Up and Login (default checked).
- Online-only persistence (Supabase Postgres), no JSON/CSV import/export UI.
- Preserve existing Daily/Master/Dashboard workflows and XLSX exports.

## Non-Goals

- Shared team/restaurant workspaces.
- Offline sync.
- Admin panel.

## Architecture

- Frontend: Vite SPA (existing app).
- Backend: Supabase Auth + Postgres + Row Level Security.
- Data access: thin data-layer module used by `src/main.js`.

## Auth UX

- Unauthenticated users see auth card with tabs:
  - Sign Up (email, password, remember me)
  - Login (email, password, remember me)
- Remember Me default: checked.
- Logout action available after login.
- If remember me unchecked, session is treated as non-persistent for browser restarts.

## Data Model

### `profiles`
- `id uuid primary key` (matches `auth.users.id`)
- `created_at timestamptz default now()`

### `master_items`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `category text not null`
- `item_name text not null`
- `unit_cost numeric not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- unique `(user_id, category, item_name)`

### `daily_records`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
- `date date not null`
- `revenue numeric not null`
- `total_expenses numeric not null`
- `profit numeric not null`
- `notes text`
- `updated_at timestamptz default now()`
- unique `(user_id, date)`

### `daily_record_rows`
- `id uuid primary key default gen_random_uuid()`
- `daily_record_id uuid not null`
- `user_id uuid not null`
- `item_id uuid`
- `category text not null`
- `item_name text not null`
- `unit_cost numeric not null`
- `quantity numeric not null`
- `amount numeric not null`

## Security (RLS)

All user tables enforce `user_id = auth.uid()` for select/insert/update/delete.

## Migration Notes

- Keep current UI behavior and calculations.
- Replace local storage read/write with Supabase CRUD.
- Continue XLSX report generation from in-memory loaded data.
- Remove any remaining local backup/import surface from UI.

## Acceptance Criteria

- New user can sign up and immediately use app.
- Existing user can log in and only see their own data.
- Saving master items and daily records persists to Supabase.
- Daily/weekly/monthly XLSX exports still work with grouped item rows and Revenue/Total Expenses/Profit footer.
- Logout returns to auth screen.
