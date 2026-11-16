---
paths:
  - "src/**"
  - "__tests__/**"
---

# MoneyApp defect checklist

Five classes the 2026-07-29 audit proved recur in this codebase. **The implementer checks these while writing and again in the self-review; the review battery checks every one against the diff.** Catching them before a reviewer is dispatched is the point of this file living in `.claude/rules/` rather than in a reviewer's prompt.

1. **Silent async failure** — every async write path sets an error field the UI renders. No comment-only `catch {}`, no `void handler()` swallowing a rejection (H14/M42). The most repeated defect in this codebase.
2. **Focus-reload churn** — `useFocusEffect` loaders have a staleness gate, nothing invalidates on blur, one coherent publication per load (M13/M32/L26).
3. **Money display drift** — anything displayed derives from the same domain function that performs the write, never an inline recomputation (H6/M18; the pay sheet was 2500× wrong on one currency pair).
   - **Decimals come from `CURRENCY_CONFIG`** (`src/constants/currency.ts` — EGP 0, USD 2), for amounts, not rates. A screen overrides only by passing a named constant to a formatter's own `decimals` parameter (`formatAmount` or `formatCurrencyAmount`), recorded in an ADR — e.g. `N4_HERO_AMOUNT_DECIMALS` — never a bare literal (M22).
   - **Never construct an `Intl.NumberFormat`** outside `src/utils/format_amount.ts` (M1).
   - **A ≤1 EGP gap between two aggregation paths is rounding order, not drift** — persisted EGP is 2dp (`roundMoney`), displayed EGP defaults to 0dp. Worked cases in `docs/adr/2026-08-19-dashboard-net-worth-refusal.md`. Confirm by rounding both totals to 2dp before display truncation — rounding order differs by piastres there, a real defect by pounds.
   - **Money colour follows the vocabulary, not the sign.** A magnitude the user owns or owes renders gold (`text-accent`) or neutral (`text-foreground`) — never by sign, never for being a liability. Red/warning are actionable-only (over limit, under 20% headroom, over budget/pace). Polarity in an aggregate is a composed sign (`−` U+2212), not colour. See `docs/adr/2026-08-27-money-colour-vocabulary.md`. Lives here, not in `ui.md`: this file's glob (`src/**`) is the one that reaches the `.ts` resolvers that decide the colour (`theme.ts`, `*.helpers.ts`), not just the `.tsx` screens that render it.
4. **Index-defeating SQL** — no function-wrapped indexed columns, no `(:p IS NULL OR col = :p)` chains, a bare indexed column in a range, half-open or an inclusive bound on a date-only column (L2/L34; `docs/adr/2026-09-24-transactions-month-aggregate.md` §1). This class asks whether a query *can* use an index. **How many times it runs and over how many rows is the quality lens's**, so a clean bill here is not a clean bill on cost.
5. **Derived state stored as durable state** — no time-relative value stamped into a column that also holds user actions (H1/H2).

Audit IDs resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](../../docs/superpowers/reviews/2026-07-29-full-technical-audit.md).

## Gates

These rules cover specs, tickets and jest invocations, not `src/`, so this file's path list includes `__tests__/**`.

- **A gate that cannot fail is not a gate.** Every acceptance command published in a spec or task must be demonstrated to produce a different result at base than at head. A command that passes in both states asserts nothing.
- **Jest treats a path argument as a regex.** A path that matches nothing is a silent skip at exit 0, not a failure. `test -f` every jest path argument before it is published in a spec or task. The usual case is a renamed or moved suite still cited by its old path.

## Reporting a defect

Lead with defects, then suggestions, then nits. Every defect carries a `file:line`, the failing scenario in concrete terms, and the smallest responsible fix. "This could be cleaner" is not a defect.
