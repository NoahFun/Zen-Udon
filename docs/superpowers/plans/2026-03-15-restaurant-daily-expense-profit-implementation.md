# Restaurant Daily Expense & Profit Web App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first web app to manage a permanent expense item master list, capture daily revenue and quantities, auto-calculate expenses/profit, and provide dashboard/report exports.

**Architecture:** A static SPA with modular vanilla JavaScript. UI is split into Daily Entry, Master List, and Dashboard views; domain logic is isolated in calculation, validation, and storage modules. Persistence uses browser localStorage with JSON backup/restore and CSV/XLSX report export.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), localStorage, Vitest, @testing-library/dom, SheetJS (`xlsx`), Vite

---

## Chunk 1: Project Setup and Test Harness

### File Structure and Responsibilities

- Create: `package.json` - scripts and dependencies
- Create: `vite.config.js` - build/test config
- Create: `index.html` - app shell root and navigation containers
- Create: `src/main.js` - app bootstrap and view mounting
- Create: `src/styles.css` - base visual styling and layout
- Create: `src/state/store.js` - in-memory app state and change notifications
- Create: `tests/setup.js` - test environment setup

### Task 1: Initialize project and test tooling

**Files:**
- Create: `package.json`, `vite.config.js`, `tests/setup.js`

- [ ] **Step 1: Write failing smoke test for app bootstrap**

```js
import { describe, it, expect } from "vitest";
import { initApp } from "../src/main.js";

describe("app bootstrap", () => {
  it("renders app root content", () => {
    document.body.innerHTML = '<div id="app"></div>';
    initApp();
    expect(document.querySelector("[data-view='daily-entry']")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/app-bootstrap.test.js`  
Expected: FAIL due missing files/functions

- [ ] **Step 3: Add minimal bootstrap implementation and test config**

Create minimal `initApp()` and Vite/Vitest config to run DOM tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/app-bootstrap.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js index.html src/main.js src/styles.css tests/setup.js tests/app-bootstrap.test.js
git commit -m "chore: scaffold app and test harness"
```

---

## Chunk 2: Domain Models, Calculations, and Validation (TDD)

### File Structure and Responsibilities

- Create: `src/domain/calculations.js` - amount/totals/profit/period aggregation
- Create: `src/domain/validation.js` - input and master-list validation rules
- Create: `src/domain/types.js` - constructors/default factories
- Create: `tests/domain/calculations.test.js` - calculation behavior tests
- Create: `tests/domain/validation.test.js` - validation behavior tests

### Task 2: Implement calculation engine

**Files:**
- Create: `src/domain/calculations.js`
- Test: `tests/domain/calculations.test.js`

- [ ] **Step 1: Write failing tests for row amount, totals, and profit**

Cover:
- `calcRowAmount(unitCost, quantity)`
- `calcTotalExpenses(rows)`
- `calcProfit(revenue, totalExpenses)`
- weekly/monthly aggregate reducers

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- tests/domain/calculations.test.js`  
Expected: FAIL with missing exports/assertions

- [ ] **Step 3: Implement minimal pure functions**

Implement only enough for tests to pass.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- tests/domain/calculations.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/calculations.js tests/domain/calculations.test.js
git commit -m "feat: add profit and expense calculation engine"
```

### Task 3: Implement validation rules

**Files:**
- Create: `src/domain/validation.js`
- Test: `tests/domain/validation.test.js`

- [ ] **Step 1: Write failing validation tests**

Cover:
- required `date` and `revenue`
- non-negative numeric constraints
- decimal quantity allowed
- max 2 decimals for unit cost
- item name trim/non-blank
- duplicate name in same category blocked

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- tests/domain/validation.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement validator functions**

Return structured error objects keyed by field for UI rendering.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- tests/domain/validation.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/validation.js tests/domain/validation.test.js
git commit -m "feat: add data validation rules"
```

---

## Chunk 3: Persistence, Drafts, and Backup/Restore

### File Structure and Responsibilities

- Create: `src/data/storage.js` - localStorage read/write and schema migration
- Create: `src/data/backup.js` - JSON export/import
- Create: `tests/data/storage.test.js` - persistence tests
- Create: `tests/data/backup.test.js` - backup/restore tests

### Task 4: Implement local data persistence

**Files:**
- Create: `src/data/storage.js`
- Test: `tests/data/storage.test.js`

- [ ] **Step 1: Write failing tests for master list + daily records persistence**
- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -- tests/data/storage.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement storage API**

Implement:
- `loadAppData()`
- `saveMasterItems(items)`
- `saveDailyRecord(record)`
- `loadDailyRecord(date)`
- draft autosave helpers

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm run test -- tests/data/storage.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/storage.js tests/data/storage.test.js
git commit -m "feat: add local storage persistence and drafts"
```

### Task 5: Implement JSON backup/restore

**Files:**
- Create: `src/data/backup.js`
- Test: `tests/data/backup.test.js`

- [ ] **Step 1: Write failing tests for JSON export/import round-trip**
- [ ] **Step 2: Run tests and confirm failure**

Run: `npm run test -- tests/data/backup.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement backup functions**

Implement:
- `createJsonBackup(data)`
- `restoreFromJson(text)`
- schema/version checks with clear errors

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm run test -- tests/data/backup.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/backup.js tests/data/backup.test.js
git commit -m "feat: add JSON backup and restore"
```

---

## Chunk 4: Master List and Daily Entry UI

### File Structure and Responsibilities

- Create: `src/ui/master-list-view.js` - manage permanent item list
- Create: `src/ui/daily-entry-view.js` - render fixed rows and quantity inputs
- Create: `src/ui/components/table-row.js` - reusable row renderer
- Create: `src/ui/notifications.js` - inline/banner messaging
- Create: `tests/ui/master-list-view.test.js`
- Create: `tests/ui/daily-entry-view.test.js`

### Task 6: Build Master List UI with validations

**Files:**
- Create: `src/ui/master-list-view.js`
- Test: `tests/ui/master-list-view.test.js`

- [ ] **Step 1: Write failing UI tests for add/edit/delete and validation feedback**
- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- tests/ui/master-list-view.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement minimal UI and handlers**

Include delete confirmation and trimmed input behavior.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- tests/ui/master-list-view.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/master-list-view.js tests/ui/master-list-view.test.js
git commit -m "feat: add editable master list management UI"
```

### Task 7: Build Daily Entry UI with auto-calculation

**Files:**
- Create: `src/ui/daily-entry-view.js`
- Test: `tests/ui/daily-entry-view.test.js`

- [ ] **Step 1: Write failing UI tests for fixed rows, quantity entry, totals, profit**
- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- tests/ui/daily-entry-view.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement daily entry table**

Requirements:
- list all master items
- read-only unit cost
- editable quantity
- auto row amount and totals
- save-day flow with overwrite confirm

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- tests/ui/daily-entry-view.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/daily-entry-view.js src/ui/components/table-row.js tests/ui/daily-entry-view.test.js
git commit -m "feat: add daily entry workflow with auto-calculated totals"
```

---

## Chunk 5: Dashboard, History, and Report Exports

### File Structure and Responsibilities

- Create: `src/ui/dashboard-view.js` - daily/weekly/monthly cards + charts
- Create: `src/ui/history-view.js` - list and open saved days
- Create: `src/reports/export-csv.js` - CSV generation
- Create: `src/reports/export-xlsx.js` - XLSX generation via SheetJS
- Create: `tests/ui/dashboard-view.test.js`
- Create: `tests/reports/exporters.test.js`

### Task 8: Implement dashboard and history

**Files:**
- Create: `src/ui/dashboard-view.js`, `src/ui/history-view.js`
- Test: `tests/ui/dashboard-view.test.js`

- [ ] **Step 1: Write failing tests for period summaries and history rendering**
- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- tests/ui/dashboard-view.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement dashboard and history views**

Include:
- daily/weekly/monthly totals
- profit trend chart
- expense-by-category chart

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- tests/ui/dashboard-view.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/dashboard-view.js src/ui/history-view.js tests/ui/dashboard-view.test.js
git commit -m "feat: add dashboard summaries charts and history view"
```

### Task 9: Implement CSV/XLSX export

**Files:**
- Create: `src/reports/export-csv.js`, `src/reports/export-xlsx.js`
- Test: `tests/reports/exporters.test.js`

- [ ] **Step 1: Write failing tests for CSV and XLSX report generation**
- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- tests/reports/exporters.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement export functions and UI triggers**

Include named files with date stamps and selected period filters.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- tests/reports/exporters.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/reports/export-csv.js src/reports/export-xlsx.js tests/reports/exporters.test.js
git commit -m "feat: add CSV and XLSX reporting exports"
```

---

## Chunk 6: App Integration, UX Safeguards, and Final Verification

### File Structure and Responsibilities

- Modify: `src/main.js` - route/tab switching and module integration
- Modify: `src/styles.css` - responsive layout and readability polish
- Create: `tests/e2e/app-flow.test.js` - end-to-end critical path in jsdom
- Create: `README.md` - usage and backup instructions

### Task 10: Integrate all views and safety warnings

**Files:**
- Modify: `src/main.js`, `src/styles.css`
- Test: `tests/e2e/app-flow.test.js`

- [ ] **Step 1: Write failing integration test for full daily flow**

Flow:
- manage master item
- enter daily revenue/quantity
- save day
- view dashboard totals
- export backup

- [ ] **Step 2: Run integration test to verify failure**

Run: `npm run test -- tests/e2e/app-flow.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement integration wiring**

Include:
- unsaved changes warning
- clear inline and global error messaging
- navigation between tabs/views

- [ ] **Step 4: Run integration test to verify pass**

Run: `npm run test -- tests/e2e/app-flow.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/styles.css tests/e2e/app-flow.test.js README.md
git commit -m "feat: integrate views with safety guards and documentation"
```

### Task 11: Full verification before completion

**Files:**
- Modify: `README.md` (if needed)

- [ ] **Step 1: Run full automated test suite**

Run: `npm run test`  
Expected: all tests PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`  
Expected: build completes with no errors

- [ ] **Step 3: Manual acceptance checklist**

Verify in browser:
- add/edit/delete master item
- daily quantity entry and auto amount
- save and reopen date
- dashboard daily/weekly/monthly totals
- JSON export/import restore
- CSV/XLSX export download

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: finalize restaurant daily expense and profit app"
```

