# ADR — The money-colour vocabulary

- **Date:** 2026-08-27
- **Status:** accepted (W2F P1 gate)
- **Ticket:** #265 (with #264, #253)
- **Applies to:** src/constants/theme.ts · src/constants/theme_tokens.ts · global.css · src/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.tsx · src/modules/dashboard/screens/dashboard/components/stat_cards.tsx · src/modules/accounts/constants/account_balance_color.ts

## Decision

1. **A monetary magnitude the user owns or owes renders gold (`text-accent`) or neutral (`text-foreground`)** per the #249/MA-014 contract — never coloured by sign, never coloured for being a liability.
2. **Red and warning are reserved for actionable states**: over limit, under 20% headroom, over budget or pace. "This row is a debt" is not actionable and takes no colour.
3. **Polarity is carried by a composed sign in aggregates** (net positions, deltas), not by colour. The canonical sign glyph is `−` (U+2212). Existing non-compliant sign sites are tracked by a filed sweep — its first target is the stat card's net-worth amount, which renders Intl's ASCII hyphen today; new or changed sites must comply.
4. **One warning value: `#E8B130`**, in all three sources (`theme.ts`, `theme_tokens.ts`, `global.css`), with `warningBg` derived from it. The `#D4830A` fork was accidental (two independent introductions, 2026-05-11 vs 05-17, never reconciled) and produced a live defect: the same account's credit colour differed between the dashboard and its detail screen.

## Why

Four surfaces answered the money-colour question four ways (N4 gold-always; breakdown total gold beside red rows; stat cards sign-coloured; account surfaces per #249). The gold-everywhere proposal withdrawn at MA-014's gate (PR #266, "Why cream and not gold") is resolved here in both directions: red loses its non-actionable "is a liability" meaning, and gold/neutral does not expand to signal polarity — the sign glyph does that.

## Consequences

- Breakdown-sheet liability rows render neutral with their composed `−`; a negative net worth on the stat card renders like a positive one, sign in the glyph. Rate-needed warning states stay warning (actionable).
- `Colors.light.warning` (`#B86E08`) remains an orphaned, unconsumed value — a light theme, if ever shipped, must re-derive its warning family from this rule rather than inherit the orphan.
- Filed, not done here: the sign-glyph unification sweep (four live conventions today), the 21 non-gold alpha-concat sites, the app-wide adoption audit.
