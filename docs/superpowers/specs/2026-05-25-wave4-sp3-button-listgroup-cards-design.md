# Wave 4 · SP-3 — Button Consolidation + ListGroup Rows + Trivial Cards Design

**Date:** 2026-05-25
**Author:** @tariq (synthesis)
**Status:** Design — awaiting spec sign-off
**Parent effort:** Wave 4 (Full HeroUI Native migration), Approach C (wrappers-first, risk-tiered). See `docs/superpowers/plans/2026-05-25-wave4-parallelization.md` (Batch 1).

---

## Context

SP-3 is one of four Batch 1 streams dispatched concurrently. Its scope covers three threads: Button canonicalization, ListGroup row adoption, and trivial (non-dashboard) Card migration. All three threads share the same risk profile: Tier-1 trivial — no new wrappers required for Button or Card, one optional wrapper for ListGroup, zero behavior change, zero rendered-text change.

**SP-4 runs concurrently.** SP-4 touches `screens/settings/categories/index.tsx` (the Expense/Income segmented switcher). SP-3 also touches that file (the bottom CTA button consolidation). The boundary is explicit in this spec and must be respected by the implementer.

---

## Goal

1. **Button thread:** Eliminate the one non-canonical `heroui-native` Button direct import. Identify and defer any bespoke sheet-footer CTA patterns (`SaveCta`, `ReassignCategorySheet` footer, `AddEditCategorySheet` footer) that require design decisions outside Tier-1 trivial scope.
2. **ListGroup thread:** Confirm `screens/settings/index.tsx` already uses HeroUI `ListGroup` directly. Decide wrapper vs. no-wrapper. No behavioral change.
3. **Card thread:** Replace the three `View`-based container cards in `screens/transactions/detail/` with HeroUI `Card` substrate.

---

## Hard invariant (Wave 4)

- **Zero rendered-text changes.** Every label string, in every state, stays byte-identical. All copy already comes from `Strings.*` — preserved verbatim.
- **Behavior unchanged.** Press handlers, disabled states, navigation, accessibility roles and labels are preserved.
- **Accepted visual normalization** gets an explicit table (see per-thread sections).
- Device QA gates the PR.

---

## SP-4 Boundary — Critical

`screens/settings/categories/index.tsx` is touched by BOTH SP-3 and SP-4.

**SP-3 owns:** The bottom-bar `Button` usage at line 135 (`<Button label={Strings.categoriesAddBtn} variant="primary" onPress={openAddSheet} />`). This Button already imports from `@/components/ui/button` (canonical). SP-3 confirms it is canonical and makes no change here unless a lint/import issue is found.

**SP-4 owns:** The `Pressable`-based Expense/Income segmented tab switcher (lines 56–95). This is a solid-gold `backgroundColor: Colors.shared.cairoGold` segmented control. SP-3 must NOT touch any line of that switcher — not the `Pressable`, not the `View` container, not the `Text` children.

**Implementer instruction:** In `screens/settings/categories/index.tsx`, only the `Button` import at the top and the `<Button>` CTA in the bottom bar are in SP-3 scope. If those are already canonical (they are — confirmed by reading the file), this file requires zero edits in SP-3. Do not open any other line in this file.

---

## Thread 1 — Button Consolidation

### Audit findings

The canonical Button wrapper is `components/ui/button.tsx`. It wraps HeroUI `Button` with the gold gradient primary variant and a flat `label: string` API. This is the only path any screen should use.

**Non-canonical imports found (requires fix):**

| File | Non-canonical usage | Fix |
|---|---|---|
| `screens/transactions/transaction_form/components/no_accounts_empty.tsx` | `import { Button } from 'heroui-native'` with raw `<Button>` + inner `<Text>` child | Replace with `import { Button } from '@/components/ui/button'`; use `label={Strings.addTxNoAccountsCta}` prop. |

**Explicitly excluded (complex / deferred):**

| File | Pattern | Reason for deferral |
|---|---|---|
| `screens/transactions/transaction_form/components/save_cta.tsx` | Bespoke `Pressable` + `LinearGradient`-style gold CTA, with `ActivityIndicator` loading state and `midnightBlue` text color. Used in 3 call sites (transaction form ×2, commitment form, pay sheet). | Not trivial. `Button` wrapper's `isLoading` renders `'Loading...'` text — this CTA renders `ActivityIndicator`. Consolidating requires extending `Button`'s loading API. Deferred to a dedicated cleanup SP. |
| `screens/settings/categories/components/add_edit_category_sheet.tsx` | Bespoke `Pressable` CTA footer (`styles.cta` — gold background, `midnightBlue` text, `isLoading` disabled state via opacity). | Same pattern as `SaveCta`. Consolidating requires `Button` wrapper `isLoading` API extension. Deferred. |
| `screens/settings/categories/components/reassign_category_sheet.tsx` | Bespoke `Pressable` CTA footer (`styles.cta` — gold background, `midnightBlue` text, `disabled` by `!selectedId || isLoading`). | Same family. Deferred. |
| `screens/transactions/filter/index.tsx` | `Button` from `@/components/ui/button` (already canonical). No change needed. | Already canonical. |
| `screens/settings/categories/index.tsx` | `Button` from `@/components/ui/button` (already canonical). | Already canonical; SP-4 boundary also applies. |

**Other Pressable patterns reviewed and explicitly left alone:**

The following Pressable uses are *not* CTAs that should route through `Button`. They are interactive list rows, picker cells, icon buttons, color swatches, header actions, or animation-instrumented rows. None map to `Button` semantics:

- `screens/accounts/detail/index.tsx` — header edit/save mini-buttons and color swatch selectors. These are custom icon-buttons with hitSlop, not full-width CTAs. Deferred.
- `screens/commitments/detail/index.tsx` — header "Edit" text link (Pressable, not a CTA button). Deferred.
- `screens/commitments/components/commitment_row.tsx` — list row Pressable. Not a button.
- `screens/transactions/components/transaction_row.tsx` — list row Pressable with press-scale animation. Not a button.
- `screens/transactions/components/month_carousel.tsx` — pill Pressable array (SP-1 scope already handled the gold-tint variant; this carousel uses `bg-accent` solid fill, a distinct pattern. Out of SP-3 scope).
- `screens/transactions/components/search_row.tsx` — icon-button Pressable (filter icon + badge). Not a full CTA.
- `screens/transactions/components/date_range_sheet.tsx` — picker row. Not a button.
- `screens/transactions/transaction_form/components/date_row.tsx` — date picker trigger row. Not a button.
- `screens/transactions/transaction_form/components/account_picker_sheet.tsx` — list row per account. Not a button.
- `screens/transactions/transaction_form/components/category_picker_sheet.tsx` — grid cell per category. Not a button.
- `screens/commitments/detail/components/pay_sheet.tsx` — account picker trigger row and date picker trigger row. Not buttons.
- `screens/settings/categories/components/reassign_category_sheet.tsx` — `BottomSheetFlatList` row per category. Not a CTA (the footer Pressable is the CTA, deferred above).
- `screens/settings/categories/components/category_row.tsx` — icon-button edit/delete action pair. Not a CTA.
- `screens/commitments/edit_commitment/index.tsx`, `screens/onboarding/*/index.tsx` — already import canonical `Button` from `@/components/ui/button` for their primary CTAs. No change needed.

### Adoption set — Button thread

| File | Change |
|---|---|
| `screens/transactions/transaction_form/components/no_accounts_empty.tsx` | Swap `import { Button } from 'heroui-native'` → `import { Button } from '@/components/ui/button'`. Remove inner `<Text>` child; use `label` prop. |

**1 file modified. 0 files created.**

### Accepted visual normalization — Button thread

| Property | Before | After | Perceptibility |
|---|---|---|---|
| Button label rendering | Raw `<Text>` child inside HeroUI `Button` (bypasses wrapper's `HButton.Label`) | `label` prop rendered via wrapper's `HButton.Label` | Sub-pixel font rendering difference; imperceptible |
| Loading state | Not applicable (this CTA has no loading state) | Not applicable | N/A |

---

## Thread 2 — ListGroup Rows

### Audit findings

`screens/settings/index.tsx` already uses HeroUI Native `ListGroup` directly — `import { ListGroup } from 'heroui-native'`. The three rows (Currency, Categories, About) are fully expressed as `ListGroup.Item` with `ListGroup.ItemPrefix`, `ListGroup.ItemContent` (title + description), and `ListGroup.ItemSuffix` (chevron). This is the exact HeroUI-primitive pattern.

**Wrapper decision:** No `components/ui/list_group.tsx` wrapper. The settings screen is the only call-site, and there is no cross-screen pattern to unify. A wrapper adds indirection with no benefit at this scale. If a second call-site is added in a future SP, a wrapper can be introduced then. This decision is recorded here per Team Law 5.

**Opportunistic token cleanup:** `screens/settings/index.tsx` uses `Colors.dark.text2` for all icon colors and the currency value text. These are within the lines SP-3 is already reading. Route to `CoreTokens.text2` to eliminate the raw `Colors.dark.*` reference pattern, consistent with the token cleanup already applied in SP-1's filter accordions. This is a non-breaking token swap — `Colors.dark.text2` and `CoreTokens.text2` map to the same resolved hex.

### Adoption set — ListGroup thread

| File | Change |
|---|---|
| `screens/settings/index.tsx` | Confirm ListGroup usage is canonical (already is). Route `Colors.dark.text2` icon/text colors → `CoreTokens.text2`. Import `CoreTokens` from `@/constants/theme_tokens`; drop `Colors` import if it becomes unused. |

**1 file modified. 0 files created.**

### Accepted visual normalization — ListGroup thread

| Property | Before | After | Perceptibility |
|---|---|---|---|
| Icon/text color token | `Colors.dark.text2` (`#6B7F99`) | `CoreTokens.text2` (`#6B7F99`) | Zero — same resolved hex |

---

## Thread 3 — Trivial Cards

### Audit findings

Three container cards in `screens/transactions/detail/` use raw `View`-based layout with manual `bg-surface border-separator rounded-2xl border` className patterns:

**`detail_rows_card.tsx`** — A pure `View` wrapper: `bg-surface border-separator mx-4 mt-4 overflow-hidden rounded-2xl border`. Children are its slot. No press handler, no gradient, no icon, no header. This is the definition of a trivial HeroUI `Card` substrate.

**`note_card.tsx`** — A `View` card with `bg-surface border-separator mx-4 mt-4 rounded-2xl border p-4`, containing a header row (icon + label) and a body text. No press handler. Trivial substrate.

**`transfer_flow_card.tsx`** — A `View` card with `bg-surface border-accent/18 mx-4 mt-4 flex-row rounded-2xl border p-3.5`. Contains two `Cell` sub-components, each optionally wrapped in a `Pressable` for account navigation. The outer card itself is not pressable. Trivial substrate for the outer shell; the inner `Cell` Pressable structure is preserved as-is.

**Commitments cards already adopted:** `screens/commitments/components/summary_header.tsx`, `screens/commitments/detail/components/current_cycle_card.tsx`, and `screens/commitments/detail/components/payment_history.tsx` already use `Card` from `heroui-native`. SP-3 does not touch them.

**Dashboard cards explicitly excluded:** `screens/dashboard/components/hero_card.tsx`, `commitments_card.tsx`, `account_card.tsx`, `add_card.tsx` — belong to SP-5 (Tier-3, heavy cards). SP-3 does not touch them.

### HeroUI `Card` substrate pattern

```tsx
import { Card } from 'heroui-native';

// Replaces:
// <View className="bg-surface border-separator mx-4 mt-4 overflow-hidden rounded-2xl border">
//   {children}
// </View>

<Card className="mx-4 mt-4 overflow-hidden">
  {children}
</Card>
```

**CORRECTION (post-review):** The Surface base (`node_modules/heroui-native/src/components/surface/surface.styles.ts`) is `p-4 rounded-3xl shadow-surface overflow-hidden` with variant `default` adding only `bg-surface`. HeroUI `Card` does **NOT** supply a border, `border-separator`, or `rounded-2xl` — these must be passed explicitly. It also forces `p-4` and `rounded-3xl` (24 px), and adds `shadow-surface`. All three cards must pass `border border-separator rounded-2xl shadow-none` explicitly; `detail_rows_card` additionally passes `p-0` to suppress the Surface padding so inner `DetailRow` dividers stay edge-to-edge. `className` overrides win via `tv()`/twMerge — no `style={}` fallback needed.

### Adoption set — Cards thread

| File | Change |
|---|---|
| `screens/transactions/detail/components/detail_rows_card.tsx` | Replace outer `View` with `Card` from `heroui-native`. Preserve `overflow-hidden`, `mx-4 mt-4` margin. |
| `screens/transactions/detail/components/note_card.tsx` | Replace outer `View` with `Card` from `heroui-native`. Preserve `mx-4 mt-4 p-4`. `testID="detail-note-card"` forwarded via `testID` prop (confirm HeroUI `Card` forwards `testID` — if not, wrap in a `View` with `testID` inside the `Card`). |
| `screens/transactions/detail/components/transfer_flow_card.tsx` | Replace outer `View` with `Card` from `heroui-native`. Preserve `mx-4 mt-4 flex-row items-center gap-2 p-3.5` and the non-default `border-accent/18` border color. Inner `Cell` / `Pressable` structure unchanged. |

**3 files modified. 0 files created.**

### Accepted visual normalization — Cards thread

| Property | Before | After | Perceptibility |
|---|---|---|---|
| Card background | Manual `bg-surface` className | HeroUI `Card` default (`bg-surface`) | Zero — same token |
| Card border | Manual `border border-separator` className | HeroUI `Card` default (verify on device) | Sub-pixel if Card applies slight radius/shadow variation; confirm at QA |
| `transfer_flow_card` border color | `border-accent/18` className | `border-accent/18` className (explicit override preserved) | Zero |

---

## Architecture

No new files are created. No new wrappers. No state, no store, no navigation, no effect. All three threads are purely presentational substitutions:

- **Button thread:** 1 import swap + 1 API alignment.
- **ListGroup thread:** 0 code changes (already canonical), 1 opportunistic token swap.
- **Card thread:** 3 View → Card substrate swaps, inner structure unchanged.

Data flow, hook logic, store shape, and screen anatomy are completely untouched.

---

## Error handling

None applicable. No async, no I/O, no user input parsing in any of the three modified files.

---

## Testing

Per the project's logic-only test policy (no `.tsx` render tests), purely presentational changes get no new unit tests. Verification:

1. **CI parity (6 jobs):** `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci && npx expo-doctor && npx expo prebuild --no-install --platform android`. The adopting screens' existing hook/state tests must stay green.
2. **Device QA gate (user):** Visually confirm:
   - Transaction form "No Accounts" empty state: CTA button renders correctly, press navigates to add account.
   - Settings screen: all three rows render, icons and text color unchanged.
   - Transaction detail screen: all three card types (`DetailRowsCard`, `NoteCard`, `TransferFlowCard`) render with correct border, background, and padding. Transfer flow card account taps still navigate.

---

## Scope & sequencing

**Branch:** `feat/wave4-sp3-button-listgroup-cards` (Batch 1, concurrent with SP-2, SP-4-wrapper, SP-5-non-contested). Branched from `main`.

**PR footprint:**
- 1 Button fix: `screens/transactions/transaction_form/components/no_accounts_empty.tsx`
- 1 token cleanup: `screens/settings/index.tsx`
- 3 Card migrations: `screens/transactions/detail/components/detail_rows_card.tsx`, `note_card.tsx`, `transfer_flow_card.tsx`

**Total: 5 files modified, 0 files created.**

No file in this set overlaps with SP-2 (`confirm_dialog.tsx`), SP-4-wrapper (`components/ui/tabs.tsx` — new file), or SP-5-non-contested (`filter/account_accordion.tsx`, `filter/category_accordion.tsx`, dashboard card files).

---

## Open questions

None blocking. The following deferred items are recorded for a future cleanup SP:

1. **`SaveCta` consolidation** — `save_cta.tsx` is used in 3 call-sites (transaction form ×2, commitment form, pay sheet). Consolidating into `Button` requires extending the wrapper's loading state to render `ActivityIndicator` instead of `'Loading...'` text. This is a small but non-trivial API extension. Recommend a dedicated "CTA cleanup" SP after Wave 4 completes.
2. **`add_edit_category_sheet.tsx` and `reassign_category_sheet.tsx` footer CTAs** — same family as `SaveCta`. Defer with `SaveCta`.
3. **`month_carousel.tsx` solid-accent pills** — the `bg-accent` (solid, not `/15` tint) pills are a distinct pattern from SP-1's gold-tint pills. Not a `SelectablePill`, not a `Button`. May warrant a dedicated `MonthCarousel` component or adoption into a scrollable `Chip` pattern. Out of scope for Wave 4.

---

## Decisions recorded (Team Law 5)

- **No `list_group.tsx` wrapper.** One call-site (`settings/index.tsx`) already uses HeroUI `ListGroup` directly; no wrapper earns its keep. Recorded here; revisit if a second call-site appears.
- **`SaveCta` deferred.** Loading-state API mismatch with `Button` wrapper makes this non-trivial. Clean boundary: defer the entire family (`SaveCta`, `add_edit_category_sheet` footer, `reassign_category_sheet` footer) to a single dedicated CTA cleanup SP.
- **SP-4 boundary in `categories/index.tsx` is a no-op for SP-3.** The bottom CTA button is already canonical. Zero edits to that file. This is the safest possible resolution of the SP-3 ∩ SP-4 contention point on that file.

---

## Out of scope

- `SaveCta` and all bespoke sheet-footer CTA patterns (deferred, see above).
- `components/account_type_pill.tsx` (not a Button, not a chip — out of Wave 4 SP-3 scope).
- Dashboard heavy cards (`hero_card.tsx`, `commitments_card.tsx`, `account_card.tsx`, `add_card.tsx`) — SP-5.
- Filter accordions (`account_accordion.tsx`, `category_accordion.tsx`) — SP-5.
- `amount_accordion.tsx` EGP/USD toggle — SP-4.
- `settings/categories/index.tsx` Expense/Income tab switcher — SP-4.
- `month_carousel.tsx` solid-accent pills — future SP.
- Token-source migration (`theme.ts` vs `theme_tokens.ts`) — dropped at Wave 4 level (see SP-1 context).
