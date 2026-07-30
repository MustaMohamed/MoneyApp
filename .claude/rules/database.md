---
paths:
  - "src/database/**"
  - "src/modules/**/database/**"
  - "src/modules/**/repositories/**"
---

# Database layer rules

## Migrations (`src/database/migrations/`)

- One file per DDL change, `NNN_<description>.ts`, exports `{ version, up }`, `CREATE TABLE IF NOT EXISTS`, append to `migrations/index.ts`. **Never edit a shipped migration.**
- **Every new foreign key requires an explicit `ON DELETE` decision** — CASCADE, SET NULL, or a documented app-level guard. An FK with no `ON DELETE` clause rejects the parent delete at runtime; three audit findings (H5/H8/H9, the category-delete crash family) came from skipping this decision. If the answer is an app-level guard, the pre-delete usage count must cover **every** referencing table, not just `transactions`.
- New CHECK constraints must match `src/constants/enums.ts` values exactly — add a parity assertion to the migration's test.
- Every migration gets a test, and at least one suite must drive the real `runMigrations(db)` runner (not `MIGRATIONS.map(m => m.up).join()` concatenation) — the runner is the code that upgrades every user's database (audit H11). See the `moneyapp-testing` skill for the bridge pattern.

## Entities (`database/entities/`)

Types only — no logic, no cross-imports from `database/`; may import `@/constants/enums`.

## Query files (`database/<domain>.ts`)

- SQL for one table; first param always `db: SQLiteDatabase`. Verbs: `get*` SELECT · `add*` INSERT · `set*` INSERT OR REPLACE/UPDATE · `update*` UPDATE · `delete*` DELETE. Business logic lives in stores/repositories, not queries.
- **Index-friendly predicates** (audit L2/L34 — both hot-path queries were full-scanning):
  - Never wrap an indexed column in a function: `substr(transaction_date, ...)` defeats `idx_transactions_date`. Use half-open ranges instead: `transaction_date >= :start AND transaction_date < :end`.
  - Avoid `(:param IS NULL OR column = :param)` optional-filter chains — SQLite cannot plan them against an index. Build the WHERE clause conditionally in TS with a placeholder list.
- Multi-statement write sequences that must be atomic go through `withTransactionAsync` / `withExclusiveTransactionAsync` — never sequential awaits on the raw connection.
- **Never store derived time-state in a column that also stores durable user actions.** A `status` stamped at insert relative to "today" is stale the next day (audit H1/H2 root cause — commitment payments frozen at `upcoming` forever). Derive time-dependent state at read time, or age it explicitly inside the housekeeping transaction.

## Client (`database/client.ts`)

`getDb()` singleton — WAL + foreign keys on. `runMigrations(db)` runs once at startup from `utils/use_layout_init.hook.ts`.

Account creation defaults: `current_balance = opening_balance`, `is_archived = 0`, `id = uuidv4()`, `created_at = updated_at = new Date().toISOString()`.
