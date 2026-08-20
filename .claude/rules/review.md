---
paths:
  - "src/**"
---

# MoneyApp defect checklist

Five classes the 2026-07-29 audit proved recur in this codebase. **@dev checks these while writing and again during the step 6 self-review; @impl-reviewer checks every one against the diff at step 7.** Catching them before a reviewer is dispatched is the point of this file living in `.claude/rules/` rather than in a reviewer's prompt.

1. **Silent async failure** — every async write path sets an error field the UI renders. No comment-only `catch {}`, no `void handler()` swallowing a rejection (H14/M42). The most repeated defect in this codebase.
2. **Focus-reload churn** — `useFocusEffect` loaders have a staleness gate, nothing invalidates on blur, one coherent publication per load (M13/M32/L26).
3. **Money display drift** — anything displayed derives from the same domain function that performs the write, never an inline recomputation (H6/M18; the pay sheet was 2500× wrong on one currency pair).
   - **Decimals come from `CURRENCY_CONFIG`** (`src/constants/currency.ts` — EGP 0, USD 2), for amounts, not rates. A screen overrides only through `formatCurrencyAmount`'s `decimals` parameter, passing a named constant recorded in an ADR (`N4_HERO_AMOUNT_DECIMALS`) — never a bare literal (M22).
   - **Never construct an `Intl.NumberFormat`** outside `src/utils/format_amount.ts` (M1).
   - **A ≤ 1 EGP gap between two aggregation paths is rounding order, not drift** — persisted EGP is 2dp (`roundMoney`), displayed EGP defaults to 0dp (#249). Do not report it as this defect class, and do not paper over it.
4. **Index-defeating SQL** — no function-wrapped indexed columns, no `(:p IS NULL OR col = :p)` chains, half-open date ranges (L2/L34). This class asks whether a query *can* use an index. **How many times it runs and over how many rows is step 9's**, `@quality-reviewer` — so a clean bill here is not a clean bill on cost.
5. **Derived state stored as durable state** — no time-relative value stamped into a column that also holds user actions (H1/H2).

Audit IDs resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](../../docs/superpowers/reviews/2026-07-29-full-technical-audit.md).

## Reporting a defect

Lead with defects, then suggestions, then nits. Every defect carries a `file:line`, the failing scenario in concrete terms, and the smallest responsible fix. "This could be cleaner" is not a defect.
