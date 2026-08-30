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

Placement and naming: `__tests__/`, `snake_case`, logic-only `.ts`. New tests follow that; the 43 `.tsx` render suites are a settled exception, not a pending one.

**Render-suite policy (resolves audit M36, decided 2026-08-05): keep the files, don't add to them, prune by reading.** This reverses the earlier "delete them all" stance (recorded at audit M36) on measurement rather than preference — so don't "restore" the older policy. ~105 `fireEvent` interactions live across 25 of those suites, and none of the 25 has a same-named `.test.ts` counterpart; four have partial relatives (`set_budget_sheet.hook`/`.state`, `filter_rail_usage`, `budget_copy_sheet_geometry`) but none of those exercises a render→handler binding. Delete the suites and that wiring coverage goes with nothing inheriting it.

**Keep vs prune, by what the assertion binds to — not by matcher name:**

- **Keep** style assertions bound to a token or named geometry constant (`ms()`, `Type.*`, `TRANSACTION_ROW_HEIGHT`). This is not the brittle part and never was: 62 of the 63 `toHaveStyle` assertions bind to one (the lone exception is a bare literal in `transaction_row.test.tsx`), and the dominant pattern — asserting skeleton and loaded states share a height — is a real regression guard. A token-bound assertion survives the `tv()` extraction that breaks a `className` one.
- **Prune** assertions on `className` strings and on file contents. Both are audit M35, whose definition is *raw source text*, with Tailwind classes only its most visible form. They live in `tabs`, `filter_rail`, `month_filter`, `set_budget_sheet`, `budget_copy_sheet` (`className`, in three shapes: exact string, `expect.stringContaining`, and `.props.className` + `toEqual`) and in `transactions.screen`, `detail_screen_actions` (`readFileSync` + `not.toContain`). The last two are named in M35's own file list.

**Carve-out: reading `global.css` for a token's declared value is not the "file contents" M35 bans.** M35 is about a *component's* source text standing in for its behaviour — a `className` string, a JSX literal `readFileSync` should never have needed to inspect. Under Tailwind v4's CSS-first model there is no `theme.js` object to import instead: `global.css` *is* the token's declaration, the same way `theme_tokens.ts` is. `typography_tokens.test.ts` and `semantic_colour_agreement.test.ts` read it that way — as an export, not an implementation detail — and both suites fail at their own base commit when the value they read drifts, which is the live-guard evidence a brittle mirror wouldn't produce.

Grep undercounts this every time — the three `className` shapes need three different patterns, and a bare `grep -c fireEvent` counts 25 import bindings as calls. Find candidates by grep, then decide by reading. When pruning empties a test, that is a deletion wearing a refactor's clothes: either replace the assertion with a behavioural one, or leave the test and say why. The "assert behavior, not source text" rule above still governs anything new.

The coverage gate (`npm run test:coverage`) currently measures a stale slice of the tree, so green is necessary but not sufficient — see `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md` Item 8.
