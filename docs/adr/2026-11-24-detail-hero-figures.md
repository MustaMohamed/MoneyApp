# ADR: the shared detail hero formats no money and draws each figure whole

- **Date:** 2026-11-24
- **Status:** accepted
- **Ticket:** MA-325, plan step 6
- **Decided by:** the ticket's Acceptance and Rules. Composes with `.claude/rules/review.md` item 3 (money display drift) and `docs/adr/2026-08-27-money-colour-vocabulary.md`.
- **Applies to:** `DetailHero` in `src/components/ui/detail_hero.tsx`: its amount, its figures row and its info line.

## 1. Strings in, strings out

The hero computes, rounds and formats no money. Its amount, each figure value and each info span arrive as strings its caller has formatted through `src/utils/format_amount.ts`. The hero adds no rounding point and constructs no `Intl.NumberFormat`.

## 2. A figure value is whole

A figure value draws on one line through `resolveFitAmountTextProps`, which shrinks it to fit above font scale 1 with no floor. An amount never ends in `…`; a long amount at a large font scale draws smaller instead.

## 3. Colour

Figure values take the foreground colour. Any money colour on the amount is the caller's, through `amountColor`.
