# Restaurant Supabase Auth + Online Data Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the app to Supabase Auth + online database persistence with per-user isolation and Remember Me (default checked).

**Architecture:** Keep current single-page UI and business calculations while replacing local persistence with Supabase-backed CRUD through a focused data module. Add an auth gate in `src/main.js` so app content is shown only for authenticated users. Use RLS-enforced tables for strict data separation.

**Tech Stack:** Vite, vanilla JS, Supabase JS client, PostgreSQL (Supabase), Vitest.

---

## Chunk 1: Backend Contract + Client Wiring

### Task 1: Add Supabase client dependency and env contract

**Files:**
- Modify: `.worktrees/restaurant-expense-app/package.json`
- Create: `.worktrees/restaurant-expense-app/.env.example`

- [ ] **Step 1: Write failing test expectation (config guard path)**
- [ ] **Step 2: Add `@supabase/supabase-js` dependency**
- [ ] **Step 3: Add `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`**
- [ ] **Step 4: Run `npm install` and verify dependency lock update**
- [ ] **Step 5: Commit**

### Task 2: Add SQL schema + RLS script

**Files:**
- Create: `.worktrees/restaurant-expense-app/docs/supabase/schema.sql`

- [ ] **Step 1: Write SQL for `profiles`, `master_items`, `daily_records`, `daily_record_rows`**
- [ ] **Step 2: Add RLS policies (`user_id = auth.uid()`)**
- [ ] **Step 3: Add trigger/helper notes for profile bootstrap**
- [ ] **Step 4: Review SQL for FK cascade integrity**
- [ ] **Step 5: Commit**

## Chunk 2: Data Layer Migration

### Task 3: Implement Supabase data module

**Files:**
- Create: `.worktrees/restaurant-expense-app/src/data/cloud-storage.js`
- Modify: `.worktrees/restaurant-expense-app/src/data/storage.js` (optional compatibility shim)
- Test: `.worktrees/restaurant-expense-app/tests/data/cloud-storage.test.js`

- [ ] **Step 1: Write failing tests for mapping and grouped fetch/save behavior**
- [ ] **Step 2: Implement auth/session helpers (signUp, signIn, signOut, getSession)**
- [ ] **Step 3: Implement app-data load (master items + daily records + rows)**
- [ ] **Step 4: Implement master item CRUD**
- [ ] **Step 5: Implement daily record upsert with row replace**
- [ ] **Step 6: Run tests and fix until green**
- [ ] **Step 7: Commit**

## Chunk 3: Auth UI + App Gate

### Task 4: Add auth gate and Remember Me (default checked)

**Files:**
- Modify: `.worktrees/restaurant-expense-app/src/main.js`
- Test: `.worktrees/restaurant-expense-app/tests/ui/auth-flow.test.js`

- [ ] **Step 1: Write failing UI tests for auth screen visibility and remember checkbox default**
- [ ] **Step 2: Render auth form when no session**
- [ ] **Step 3: Wire sign-up/login handlers using cloud module**
- [ ] **Step 4: Add logout control and session refresh flow**
- [ ] **Step 5: Run targeted UI tests to green**
- [ ] **Step 6: Commit**

### Task 5: Replace local save/load calls in app interactions

**Files:**
- Modify: `.worktrees/restaurant-expense-app/src/main.js`
- Test: `.worktrees/restaurant-expense-app/tests/ui/daily-category-filter.test.js`
- Test: `.worktrees/restaurant-expense-app/tests/ui/clear-after-save.test.js`

- [ ] **Step 1: Write failing tests for save/load under cloud-backed mode (mocked data layer)**
- [ ] **Step 2: Refactor `loadDate`, `upsertItem`, `deleteItem`, `saveDay` to async cloud CRUD**
- [ ] **Step 3: Keep current totals/profit and filtered export behavior unchanged**
- [ ] **Step 4: Run related UI tests and fix regressions**
- [ ] **Step 5: Commit**

## Chunk 4: Verification and Handoff

### Task 6: End-to-end verification

**Files:**
- Modify: `.worktrees/restaurant-expense-app/README.md`

- [ ] **Step 1: Add Supabase setup instructions in README**
- [ ] **Step 2: Run `npm run test -- tests/reports/exporters.test.js tests/ui/*.test.js`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Document manual QA checklist (signup/login/save/export/logout/login restore)**
- [ ] **Step 5: Commit**
