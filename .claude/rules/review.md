---
paths:
  - "src/**"
  - "__tests__/**"
---

# MoneyApp defect checklist

Five classes the 2026-07-29 audit proved recur in this codebase. **The implementer checks these while writing and again during self-review (ship phase 6); the quality lens answers every one explicitly against the diff (ship phase 7, charter B step 1); the plan reviewer checks the plan against them (phase 5).** Catching them before a reviewer is dispatched is the point of this file living in `.claude/rules/` rather than in a reviewer's prompt.

1. **Silent async failure** — every async write path sets an error field the UI renders. No comment-only `catch {}`, no `void handler()` swallowing a rejection (H14/M42). The most repeated defect in this codebase.
2. **Focus-reload churn** — `useFocusEffect` loaders have a staleness gate, nothing invalidates on blur, one coherent publication per load (M13/M32/L26).
3. **Money display drift** — anything displayed derives from the same domain function that performs the write, never an inline recomputation (H6/M18; the pay sheet was 2500× wrong on one currency pair).
   - **Decimals come from `CURRENCY_CONFIG`** (`src/constants/currency.ts` — EGP 0, USD 2), for amounts, not rates. A screen overrides only by passing a named constant to a formatter's own `decimals` parameter (`formatAmount` or `formatCurrencyAmount`), recorded in an ADR — e.g. `N4_HERO_AMOUNT_DECIMALS` — never a bare literal (M22).
   - **Never construct an `Intl.NumberFormat`** outside `src/utils/format_amount.ts` (M1).
   - **A ≤1 EGP gap between two aggregation paths is rounding order, not drift** — persisted EGP is 2dp (`roundMoney`), displayed EGP defaults to 0dp. Worked cases in `docs/adr/2026-08-19-dashboard-net-worth-refusal.md`. Confirm by rounding both totals to 2dp before display truncation — rounding order differs by piastres there, a real defect by pounds.
4. **Index-defeating SQL** — no function-wrapped indexed columns, no `(:p IS NULL OR col = :p)` chains, half-open date ranges (L2/L34). This class asks whether a query *can* use an index. **How many times it runs and over how many rows is the quality lens's** (ship phase 7) — so a clean bill here is not a clean bill on cost.
5. **Derived state stored as durable state** — no time-relative value stamped into a column that also holds user actions (H1/H2).

Audit IDs resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](../../docs/superpowers/reviews/2026-07-29-full-technical-audit.md).

## Gates

Not audit-ID defect classes — process rules MA-016's own review found itself reproducing, over specs, task files, and jest invocations rather than over `src/`. That is why this section, and this file's path list, cover `__tests__/**` too. The same discipline applies to `ship`'s `spec.md`/`task.md`, which live under `~/.ship/MoneyApp/` and so can't be path-matched here — `phase-2-spec.md` item 8 and `phase-5-plan-review.md` item 7 point back at this section instead, and that citation is the only thing carrying these two rules to the people who publish acceptance commands. Cut it there and they reach nobody.

- **A gate that cannot fail is not a gate.** Every acceptance command published in a spec or task must be demonstrated to produce a different result at base than at head — a command that passes in both states asserts nothing (the fifth recurrence of this exact defect across two tickets). Rule 1 subsumes rule 2 below, and both are kept: every one of MA-016's five failed gates would have been caught by this rule alone, applied at the point the command was published.
- **Jest treats a path argument as a regex.** A path that matches nothing is a silent skip at exit 0, not a failure. `test -f` every jest path argument before it is published in a spec or task — a concrete recipe for the general rule above, worth keeping on its own because this exact failure mode (a renamed or moved suite, still cited by its old path) recurs independently of whether anyone thought to demonstrate the gate at base vs head.

## Reporting a defect

Lead with defects, then suggestions, then nits. Every defect carries a `file:line`, the failing scenario in concrete terms, and the smallest responsible fix. "This could be cleaner" is not a defect.
