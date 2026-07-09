# Named Monthly Budgets Design

## Summary

The Budget screen will support multiple named budgets inside the same expense category for the selected month.

Example:

- Food & Dining
  - Monthly Food - 5,000
  - Alexandria Trip Food - 1,500
  - Birthday Dinner - 2,000

The user-facing term is **Budget**. Internally, these are budget rows with their own `id`, `name`, category, month, and amount.

## Product Rules

- A budget belongs to exactly one month.
- There are no repeat rules.
- Reusing budgets in another month happens through Copy.
- A category may have multiple budgets in the same month.
- A category cannot have two budgets with the same name in the same month.
- Existing one-budget-per-category data migrates into one named budget per category/month using the category name as the budget name.
- Spending remains tracked by transaction category in this phase.
- The category total shows spent/left using the sum of the category's budgets and the category's transactions.
- Individual budgets show their planned amount. Exact per-budget spent/left is out of scope until transactions can optionally assign to a specific budget.

## Budget Screen

The Categories tab groups budgets under their category:

- Category header: category name, number of budgets, total budgeted, total spent, total left, progress.
- Budget rows: budget name and planned amount.
- Pressing a category can continue to open the category detail view.
- Editing/removing actions target a budget row, not the category.

The tool rail label changes from `Category` to `Budget`.

## Add/Edit Budget Sheet

Add mode includes:

- Category selector
- Budget name
- Monthly amount
- Budget group selector, still category-level for this phase

Edit mode includes:

- Locked category display
- Editable budget name
- Editable monthly amount
- Budget group hidden, because group remains category-level and is only changed during add for now

The sheet does not include repeat controls.

## Copy Budgets

Copy works at the named budget level.

- Source month is selectable.
- Rows show category name, budget name, and amount.
- User can select individual budgets to copy.
- Copying to the target month inserts missing budgets.
- If a target month already has a budget with the same category and name, copying replaces that existing amount instead of creating a duplicate.

## Data Model

The `budgets` table needs a `name` column and a new uniqueness rule:

- `id TEXT PRIMARY KEY`
- `category_id TEXT NOT NULL REFERENCES categories(id)`
- `name TEXT NOT NULL COLLATE NOCASE`
- `limit_amount REAL NOT NULL`
- `effective_from TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `UNIQUE(category_id, effective_from, name)`

The old `UNIQUE(category_id, effective_from)` rule is removed by rebuilding the table in a new migration.

## Out Of Scope

- Repeating budgets
- Transaction-to-budget assignment
- Per-budget spent/left calculations
- Budget groups per budget
- Budget detail screens for individual named budgets
