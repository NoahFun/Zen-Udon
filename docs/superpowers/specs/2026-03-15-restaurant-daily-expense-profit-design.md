# Restaurant Daily Expenses and Profit Design

## Overview

Build a local-first web app for a restaurant owner to record daily revenue and expenses, then view profit summaries by day, week, and month.

## Goals

- Fast daily entry with minimal typing
- Fixed master item list for expenses
- Accurate automatic calculations
- Local data ownership with reliable backup/restore
- Reporting for daily, weekly, and monthly performance

## Non-Goals (V1)

- Multi-user accounts or authentication
- Cloud sync
- POS integration
- Advanced accounting features

## Architecture

- Single-page web app using `index.html`, `styles.css`, and `app.js`
- No backend server
- Browser `localStorage` for persistence
- Local reporting and chart rendering in-browser

## Core Data Model

### Master List Item (permanent, editable)

- `id` (string)
- `category` (string; defaults include `food`, `utility`, `salary`)
- `itemName` (string)
- `unitCost` (number, 2 decimal max)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

### Daily Record

- `date` (`YYYY-MM-DD`)
- `revenue` (number)
- `rows` (array of expense rows)
- `totalExpenses` (number, derived)
- `profit` (number, derived)
- `notes` (optional string)
- `updatedAt` (ISO datetime)

### Daily Expense Row

- `itemId` (references master list item)
- `category` (copied for reporting convenience)
- `itemName` (copied for historical readability)
- `unitCost` (copied from master list at save time)
- `quantity` (number, decimals allowed)
- `amount` (derived: `unitCost * quantity`)

## UX Design

### Daily Entry Screen

- Date picker and revenue input at top
- Fixed table generated from full master list:
  - Category
  - Item
  - Unit Cost (read-only)
  - Quantity (editable)
  - Amount (auto-calculated)
- Zero/empty quantity means row amount `0`
- Summary area:
  - Total Daily Expenses
  - Daily Profit (`revenue - totalExpenses`)
- `Save Day` button for explicit save
- Auto-save draft while editing

### Master List Management

- Editable permanent list for items
- Add/edit/delete item operations
- Categories can use defaults and allow custom values
- All master list items display in daily entry flow

### Dashboard and Reports

- Daily metrics card: revenue, expenses, profit
- Weekly summary (Mon-Sun): totals for revenue, expenses, profit
- Monthly summary (calendar month): totals for revenue, expenses, profit
- Charts:
  - Daily profit trend line
  - Expense by category chart
- History table with quick open/edit per date

## Calculation Rules

- Row amount: `amount = quantity * unitCost`
- Daily expenses: sum of all row amounts
- Daily profit: `revenue - totalDailyExpenses`
- Weekly and monthly totals aggregate daily saved records

## Validation Rules

- Required before save: `date`, `revenue`
- `revenue`, `quantity`, `unitCost` must be valid non-negative numbers
- `quantity` allows decimals
- `unitCost` precision limited to 2 decimals
- Item names:
  - no blank/whitespace-only values
  - trim extra spaces
  - no duplicate item names within same category
- Confirmations:
  - confirm before deleting a master list item
  - confirm before overwriting an already saved date
- Unsaved protection:
  - warn user before leaving with unsaved changes

## Data Safety and Portability

- Primary backup format: JSON export/import for full-fidelity restore
- Reporting/share export: CSV/XLSX export
- Keep unsaved inputs visible on validation errors

## Error Handling

- Inline field-level validation messages
- Top-level save/import error banner for actionable issues
- No silent failures; user sees clear reason and next step

## Testing Strategy (V1)

- Unit tests:
  - row amount calculation
  - daily total and profit calculation
  - weekly/monthly aggregations
- Validation tests:
  - required fields
  - numeric constraints and decimal quantity
  - duplicate detection in master list
- UI tests:
  - master list renders into daily table
  - quantity updates amount and totals
  - save/load day record
  - overwrite confirmation behavior
  - backup/export actions are callable

## Acceptance Criteria

- User can maintain a permanent editable master list
- User can enter daily POS revenue once and quantities per item
- App automatically calculates row amounts, daily expenses, and daily profit
- Dashboard shows daily/weekly/monthly summaries and basic charts
- Data persists locally across reloads
- User can export/import JSON backup and export CSV/XLSX reports
