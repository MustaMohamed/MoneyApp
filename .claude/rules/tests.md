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

Placement and naming: `__tests__/`, `snake_case`, logic-only `.ts`. The 40 legacy `.tsx` render suites are a known exception pending a policy decision — don't add to them, and don't delete them either.

The coverage gate (`npm run test:coverage`) currently measures a stale slice of the tree, so green is necessary but not sufficient — see `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md` Item 8.
