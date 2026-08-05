---
paths:
  - "__tests__/**"
  - "src/test_helpers/**"
---

# Test rules

**Load the `moneyapp-testing` skill before writing or changing a test** — it carries the better-sqlite3 bridge pattern, the fixture helpers, and the mock boundary table. This file is only the non-negotiables.

- **A test that mocks the thing it claims to verify is vacuous.** Atomicity tests must map `withTransactionAsync` to real BEGIN/COMMIT, never a pass-through mock — a pass-through still passes with the rollback deleted (audit M33).
- **SQL is tested against a real engine.** Bridge better-sqlite3 `:memory:` into the mocked expo-sqlite surface via `@/test_helpers/sqlite`; never hand-stub query results for repository or query tests.
- **Assert behavior, not source text.** Returned values, thrown error *types*, and database row state after the operation — not exact Tailwind classes or file contents (audit M35: 12 suites broke on no-op refactors and passed on real bugs).
- **Time is an input, never `new Date()`.** Fixed ISO strings; month-end (day 31 in a 30-day month) and leap-year cases are required for any date arithmetic.
- Migration suites: at least one must drive the real `runMigrations(db)`, not `MIGRATIONS.map(m => m.up).join()` (audit H11).

Placement and naming: `__tests__/`, `snake_case`, logic-only `.ts`. New tests follow that; the 40 `.tsx` render suites are a settled exception, not a pending one.

**Render-suite policy (resolved 2026-08-05): keep the files, don't add to them, prune by reading.** This reverses the 2026-05-23 "delete them all" stance, on measurement rather than preference — so don't "restore" the older policy. 130 `fireEvent` calls live across 25 of those suites, and **none of the 25 has a `.test.ts` counterpart anywhere in the tree**, so deleting them drops that wiring coverage on the floor with nothing inheriting it.

The prunable part is smaller than a grep suggests, which is the trap: `toHaveStyle` appears 63 times but is mostly deliberate skeleton/layout-parity guards worth keeping, while only 4 assertions are the audit M35 brittleness class (asserting exact Tailwind class strings). Judge each one by what it would catch, never by matcher name — and note that removing the last style assertion from a test empties it, which is a deletion wearing a refactor's clothes. The "assert behavior, not source text" rule above still governs anything new.

The coverage gate (`npm run test:coverage`) currently measures a stale slice of the tree, so green is necessary but not sufficient — see `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md` Item 8.
