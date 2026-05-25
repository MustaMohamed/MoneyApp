# Wave 4 · SP-1 — `SelectablePill` (HeroUI `Chip` wrapper) Design

**Date:** 2026-05-25
**Author:** @tariq (synthesis), @marcus (UX), with the team
**Status:** Design — awaiting spec sign-off
**Parent effort:** Wave 4 (Full HeroUI migration) from `docs/superpowers/reviews/2026-05-24-post-ship-heroui-consistency-review.md`, sliced via Approach C (hybrid, wrappers-first, risk-tiered).

---

## Context

The post-ship review found the `border-accent/50 bg-accent/15 rounded-full border` selected/unselected pill ternary copy-pasted across the app — the review called it *"the highest-leverage dedup in the app."* Wave 4 is the full HeroUI primitive migration; it is too large for one spec, so it is decomposed into sub-projects, each its own spec → plan → PR → device-QA cycle:

- **SP-1 — `SelectablePill` (this doc)** — the gold-tint selectable pill. Foundation/highest-leverage.
- **SP-2** — `ConfirmDialog` → HeroUI `Dialog` (1 file).
- **SP-3** — Tier-1 trivial: `Button` consolidation + `ListGroup` rows + trivial Cards.
- **SP-4** — `Tabs` wrapper + adoption (segmented controls, incl. the EGP/USD toggles and the category Expense/Income switcher).
- **SP-5** — Tier-3: filter `Accordion`s + dashboard heavy Cards.

The token-source standardization line-item from the review was **dropped**: `theme_tokens.ts` cannot replace `theme.ts` (it exports no `Spacing`/`Size`/`Type`/`FontFamily`/`Radius` scales, and `SemanticTokens.warning #E8B130` ≠ `Colors.dark.warning #D4830A`, which would be a visual regression). Stray icon hex (`#888` etc.) is cleaned opportunistically inside whichever PR already touches the file.

## Goal

One canonical, accessible selectable-pill component built on HeroUI `Chip`, adopted at every gold-tint pill ternary, with **zero rendered-text regressions**. Visual normalization (sub-pixel padding/opacity unification) is accepted.

## Hard invariant

- **Zero rendered-text changes.** Every label string, in every state, stays byte-identical (all sites already pull from `Strings.*` / entity fields — these are preserved verbatim).
- **Behavior unchanged.** Selection callbacks, single/multi-select semantics, and accessibility (`accessibilityRole="button"`, `accessibilityState={{ selected }}`, label) are preserved.
- Device QA gates the PR.

---

## The component

**File:** `components/ui/chip.tsx` — exports `SelectablePill`. Built on HeroUI `Chip` + `Chip.Label` (a `Pressable`-based capsule that forwards `PressableProps` and accepts `className`).

### Public API

```tsx
export interface SelectablePillProps {
  /** Visible label text. */
  label: string;
  /** Selected (active) state — drives the gold-tint styling. */
  selected: boolean;
  onPress: () => void;
  /** Optional leading color dot (filter pills with a category/account color). */
  dotColor?: string;
  /** Show a trailing gold check when `selected` (multi-select filter pills). */
  checkable?: boolean;
  /** Accessibility label; defaults to `label`. */
  accessibilityLabel?: string;
}
```

Why a tailored API rather than re-exporting HeroUI `Chip`'s compound form: every call-site is a *selectable* pill (`selected` is mandatory), and the leading-dot / trailing-check needs recur. A flat prop API removes the per-site `Pressable` + ternary + `Text` boilerplate entirely. HeroUI `Chip` has no `selected` boolean — selection is expressed by swapping styling, which this wrapper owns.

### Rendering & styling contract

```tsx
<Chip
  onPress={onPress}
  accessibilityRole="button"
  accessibilityState={{ selected }}
  accessibilityLabel={accessibilityLabel ?? label}
  className={cn(
    'rounded-full border',
    dotColor || checkable
      ? 'flex-row items-center gap-1.5 px-2.5 py-1.5'  // pills with leading/trailing content
      : 'px-3 py-1',                                    // plain pills
    selected ? 'border-accent/50 bg-accent/15' : 'border-border bg-default/40',
  )}
>
  {dotColor ? <View style={{ backgroundColor: dotColor }} className="h-2 w-2 rounded-full" /> : null}
  <Chip.Label
    className={cn(
      'font-inter text-[11px]',
      selected ? 'text-accent font-semibold' : 'text-foreground/70 font-medium',
    )}
  >
    {label}
  </Chip.Label>
  {checkable && selected ? (
    <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
  ) : null}
</Chip>
```

Notes:
- `cn` from `heroui-native`; `GoldTokens` from `@/constants/theme_tokens` (sanctioned module-level color-prop use). `Chip.Label` accepts a `className` and forwards `TextProps`.
- If HeroUI `Chip`'s built-in `tv` variants resist the className color overrides during implementation, pass `variant="secondary"`/`color="default"` as the neutral base and keep the explicit className to lock the exact tint. This is an implementation detail resolved under TDD/manual check, not a design change. (Substrate stays HeroUI `Chip` either way — no parallel reimplementation.)

### Accepted visual normalization

| Property | Before (varies) | After (normalized) | Perceptibility |
|---|---|---|---|
| Unselected label opacity | `/65` (chips) vs `/70` (accordions) | `/70` | imperceptible |
| Label size | `11px` (chips) vs `11.5px` (accordions) | `11px` | sub-pixel |
| Plain-pill padding | `px-3 py-1` | `px-3 py-1` | unchanged |
| Dot/check-pill padding | `px-2.5 py-1.5` | `px-2.5 py-1.5` | unchanged |

No other visual change. Selected look (`border-accent/50 bg-accent/15` + `text-accent font-semibold`) is preserved exactly.

---

## Adoption set (grounded against current `main`)

All are the gold-tint `bg-accent/15` pill ternary. Exact line numbers are enumerated in the implementation plan.

| File | Pills | Variant |
|---|---|---|
| `screens/transactions/components/type_chips.tsx` | 5 (All/Income/Expense/Transfer/CC Payment) | plain |
| `screens/commitments/components/status_filter_chips.tsx` | 6 status filters (in horizontal `ScrollView`) | plain |
| `screens/commitments/components/recurrence_picker.tsx` | 4 recurrence presets + 4 duration periods | plain |
| `screens/commitments/components/commitment_form_body.tsx` | 2 amount-type + 2 currency | plain |
| `screens/transactions/filter/components/account_accordion.tsx` | dynamic account pills | `dotColor` + `checkable` |
| `screens/transactions/filter/components/category_accordion.tsx` | dynamic category pills | `dotColor` + `checkable` |

**Opportunistic, in the two accordion files only:** route the chevron `color="#888"` and the dot-fallback `?? '#888'` through a muted token (`CoreTokens.text3`) since we are editing those lines anyway. The accordion **count badge** (`bg-accent/15 … px-1.5`) is a static badge, not a selectable pill — left untouched.

### Explicitly excluded

- `components/account_type_pill.tsx` — a larger animated icon-box type selector, not a chip.
- `screens/settings/categories/components/add_edit_category_sheet.tsx` type pills + `screens/settings/categories/index.tsx` Expense/Income switcher — **solid-gold segmented** style (`backgroundColor: cairoGold`, midnight-blue text) → SP-4 (`Tabs`), not a gold-tint pill.
- All EGP/USD **segmented** currency toggles (`amount_accordion`, add-account) → SP-4.

---

## Architecture & data flow

`SelectablePill` is **purely presentational**: props in, `onPress` out. It owns no state, no store, no effects. Selection state continues to live where it already does (parent hooks/stores/RHF). Parents keep their `.map()` loops and layout containers (`flex-wrap`, horizontal `ScrollView`); only the inner `Pressable`+ternary+`Text` collapses to `<SelectablePill … />`.

This keeps the boundary clean: the component is understandable in isolation (what it does = render a selectable pill; how to use it = the 6-prop API; what it depends on = HeroUI `Chip`, `cn`, `GoldTokens`, MCI icon).

## Error handling

None applicable — no async, no I/O, no user input parsing. `dotColor` undefined → no dot; `checkable` false or unselected → no check. `accessibilityLabel` undefined → falls back to `label`.

## Testing

Per the project's **logic-only test policy** (no `.tsx` render tests), a purely presentational component gets **no unit test**. Verification:

1. **CI parity (6 jobs):** format, lint, typecheck, jest, expo-doctor, android prebuild. The adopting screens' existing hook/state tests must stay green — proving behavior (selection callbacks, filter logic) is unchanged.
2. **Device QA gate (user):** visually confirm each adopting surface renders and toggles identically — transaction type chips, commitment recurrence/duration/amount-type/currency pills, status filter chips, and the filter sheet's account/category dot+check pills (incl. multi-select check + dynamic dot colors).

## Scope & sequencing

One PR: 1 new component + 6 edited files. Touches transactions, commitments, settings(filter) slices. Branch `feat/wave4-sp1-selectable-pill` (already created from `origin/main`). Subsequent SPs (2–5) are separate cycles.

## Out of scope

- Token-source migration (dropped — see Context).
- Tabs/Dialog/Card/ListGroup/Button/Accordion migrations (SP-2…SP-5).
- The solid-gold segmented selectors and currency toggles (SP-4).
