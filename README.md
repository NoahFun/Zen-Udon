# Restaurant Daily Expense and Profit App

Local-first web app for restaurant daily revenue and expense tracking.

## Run

```bash
npm install
npm run dev
```

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

## Backup and Export

- `Export JSON`: full backup for restore
- `Import JSON`: restore complete data
- `Export CSV` and `Export XLSX`: report files for sharing
