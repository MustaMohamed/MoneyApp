# Wave 4 · SP-4-WRAPPER — `SegmentedTabs` (HeroUI `Tabs` wrapper) Design

**Date:** 2026-05-25
**Author:** @tariq (synthesis), @marcus (product direction on month_navigator), with the team
**Status:** Design — awaiting spec sign-off
**Parent effort:** Wave 4 (Full HeroUI migration) from `docs/superpowers/reviews/2026-05-24-post-ship-heroui-consistency-review.md`, Approach C (wrappers-first, risk-tiered).
**Batch:** Batch 1, stream SP-4-WRAPPER (creates `components/ui/tabs.tsx` only — no screen edits).

---

## Context

The post-ship review identified multiple bespoke `Pressable`-row segmented controls scattered across the app. These controls are visually similar but implemented inconsistently:

- `screens/settings/categories/index.tsx` — Expense/Income tab switcher using `Colors.shared.cairoGold` solid-gold selected background.
- `screens/settings/categories/components/add_edit_category_sheet.tsx` — same solid-gold type picker inside the add/edit sheet.
- `screens/transactions/filter/components/amount_accordion.tsx` — EGP/USD currency toggle using `bg-default/40` when selected (lighter style).
- `screens/accounts/add_account/index.tsx` — EGP/USD currency picker using `border-gold-600 bg-[rgba(201,151,58,0.08)]` when selected (a gold-tinted border style).
- `screens/commitments/components/month_navigator.tsx` — prev/next chevron navigator with a centered label (product owner has directed this becomes a scrollable `Tabs` strip in SP-4-adoption).

The dashboard (`screens/dashboard/index.tsx`) already uses HeroUI `Tabs` directly. SP-4 does not touch it; it is the working reference implementation.

A custom `SegmentSwitcher` component was previously retired in favor of HeroUI `Tabs` (SP §5). This wrapper is its sanctioned, canonical replacement.

SP-4 is decomposed into:
- **SP-4-WRAPPER (this doc):** create `components/ui/tabs.tsx`. No screen edits.
- **SP-4-adoption (Batch 2):** adopt the wrapper at all five surfaces listed above.

---

## Goal

One canonical `SegmentedTabs` wrapper built on HeroUI `Tabs`. It handles two visual variants (the default pill/segment look and the solid-gold selected look), two layout modes (fixed full-width and scrollable), and a clean typed segment list API. Adoption sites in SP-4-adoption will replace their `Pressable` rows with this wrapper with zero text regressions.

## Hard invariant

- **Zero rendered-text changes on adoption.** Every label string, in every state, stays byte-identical. All adoption sites pull labels from `Strings.*` or enum values — these are passed through `segments[].label` unchanged.
- **Behavior unchanged on adoption.** Selection callbacks, single-select semantics, and accessibility (`role="tablist"`, `role="tab"`, `aria-selected`, `accessibilityState`) are preserved verbatim (HeroUI Tabs primitive handles them already).
- Device QA gates the SP-4-adoption PR (not this wrapper-only PR).

---

## HeroUI `Tabs` — substrate audit

Source: `node_modules/heroui-native/src/components/tabs/` and `primitives/tabs/`.

### Compound API

```
Tabs (Root)          — value, onValueChange, variant ('primary'|'secondary'), animation
Tabs.List            — container; sets role="tablist"; applies list styles
Tabs.ScrollView      — wraps List content in a horizontal RN ScrollView; scrollAlign prop
Tabs.Trigger         — value, isDisabled; sets role="tab", aria-selected, accessibilityState
Tabs.Label           — text; reads isSelected from TriggerContext; applies text styles
Tabs.Indicator       — animated overlay; width/height/translateX/opacity are Reanimated-animated
Tabs.Separator       — optional separator between triggers; animated opacity
Tabs.Content         — conditionally rendered panel per tab value
```

### Controlled selection

`Tabs` is fully controlled: `value` (current tab value string) + `onValueChange(value: string)` callback. No internal selection state. This maps cleanly to parent owning state — same philosophy as `SelectablePill`.

### Variants

`primary` (default): `Tabs.List` gets `p-[3px] rounded-3xl bg-default`. Indicator gets `rounded-3xl shadow-sm shadow-surface/25 bg-segment`. Label gets `text-segment-foreground` selected, `text-muted` unselected.

`secondary`: `Tabs.List` gets `border-b border-border`. Indicator gets `bottom-0 border-b-2 border-accent`. This is the bottom-border Material-tabs look. Out of scope (used by `type_tabs.tsx` which is explicitly deferred).

### Indicator animation constraints

Per source and JSDoc in `tabs.styles.ts`, the following properties on `Tabs.Indicator` are animated by Reanimated and **cannot be overridden via `className`**: `width`, `height`, `translateX`, `opacity`. Background-color is NOT in the animated-only list. Therefore `className="bg-[...]"` or `style={{ backgroundColor: ... }}` on `Tabs.Indicator` is a safe, supported way to change the indicator fill color.

### ScrollView mode

`Tabs.ScrollView` wraps children in a horizontal RN `ScrollView`. `scrollAlign` (`'center'` default) auto-scrolls to keep the selected trigger centered. `Tabs.List` detects `Tabs.ScrollView` as a child and sets `isScrollView: true`, which shifts the indicator's `top` offset to `top-[3px]`. This is the mechanism for the month-navigator use case.

### Self-start width

`Tabs.List` applies `self-start` — it shrinks to fit its content. For full-width equal segments, each `Tabs.Trigger` must get `flex-1` (as the dashboard does: `<Tabs.Trigger value="overview" className="flex-1">`).

---

## The component

**File:** `components/ui/tabs.tsx` — exports `SegmentedTabs`. Built on HeroUI `Tabs` compound API.

Named `tabs.tsx` after the primitive (parallel to `chip.tsx` → `SelectablePill`). The export name is `SegmentedTabs` rather than the generic `Tabs` to avoid shadowing the HeroUI import inside the file and to communicate intent (this is a segmented control abstraction, not a general tab system).

### Segment descriptor type

```tsx
export interface TabSegment<T extends string = string> {
  /** The value key for this segment — passed to HeroUI Tabs as `value`. */
  value: T;
  /** Visible label text — rendered unchanged via Tabs.Label. */
  label: string;
  /** Optional accessibility label; defaults to `label`. */
  accessibilityLabel?: string;
}
```

Generic `T extends string` allows call sites to bind to their concrete enum/union type (e.g., `TabSegment<Currency>`, `TabSegment<CategoryType>`), giving type-safe `onValueChange` callbacks.

### Visual variant type

```tsx
export type SegmentedTabsVariant =
  | 'default'      // HeroUI primary look: rounded pill container, bg-default, bg-segment indicator
  | 'solid-gold';  // Solid cairoGold indicator fill, midnight-blue selected text
```

The `default` variant passes `variant="primary"` to HeroUI `Tabs`. The `solid-gold` variant also uses `variant="primary"` for the container shape but overrides the indicator fill and selected label color.

### Public API

```tsx
export interface SegmentedTabsProps<T extends string = string> {
  /**
   * Ordered list of segments. Label strings are rendered byte-identical
   * to the strings passed in — no transformation applied.
   */
  segments: TabSegment<T>[];
  /** Currently selected segment value — parent owns state. */
  value: T;
  /** Called when a trigger is pressed with the new value. */
  onValueChange: (value: T) => void;
  /**
   * Visual variant.
   * - 'default': standard HeroUI primary look (used by amount filter EGP/USD toggle).
   * - 'solid-gold': cairoGold indicator fill + midnight-blue selected text
   *   (used by category Expense/Income switcher and add-account currency picker).
   * @default 'default'
   */
  variant?: SegmentedTabsVariant;
  /**
   * Layout mode.
   * - 'fixed': triggers share full width equally (flex-1 per trigger). Use for
   *   2–4 segments in a bounded container.
   * - 'scrollable': triggers use intrinsic width inside a horizontal ScrollView.
   *   The selected trigger is auto-scrolled to center. Use for variable-count
   *   or many-segment use cases (e.g. month navigator strip).
   * @default 'fixed'
   */
  layout?: 'fixed' | 'scrollable';
  /**
   * Scroll alignment for 'scrollable' layout.
   * @default 'center'
   */
  scrollAlign?: 'start' | 'center' | 'end' | 'none';
  /** Additional className forwarded to Tabs.List (e.g. margin, width overrides). */
  listClassName?: string;
  /**
   * Disable animations (forwarded to Tabs `animation` prop).
   * Use 'disable-all' to match prior plain-Pressable surfaces that had no press feedback.
   * @default undefined (animations enabled)
   */
  animation?: 'disable-all';
  /**
   * Accessibility label for the tab list container (the tablist role element).
   * Provide when context is not obvious from surrounding UI.
   */
  accessibilityLabel?: string;
}
```

Why a flat API rather than re-exporting HeroUI `Tabs` compound form: every call-site is a segmented selection control with a fixed set of labeled segments. The per-site `Tabs.List` / `Tabs.Indicator` / `Tabs.Trigger` / `Tabs.Label` boilerplate collapses to a single declarative component. Indicator placement, scroll wiring, and variant styling are handled once here.

`Tabs.Content` is NOT part of this wrapper. All adoption sites use selection to drive their own state/rendering — there is no panel to show/hide. If a future use case genuinely needs `Tabs.Content` panel management, it should extend `SegmentedTabs` or use HeroUI `Tabs` directly.

### Rendering and styling contract

```tsx
import Tabs from 'heroui-native'; // component Tabs (not re-exported)
import { Colors } from '@/constants/theme';

export function SegmentedTabs<T extends string>({
  segments,
  value,
  onValueChange,
  variant = 'default',
  layout = 'fixed',
  scrollAlign = 'center',
  listClassName,
  animation,
  accessibilityLabel,
}: SegmentedTabsProps<T>): React.ReactElement {
  const isSolidGold = variant === 'solid-gold';
  const isScrollable = layout === 'scrollable';

  const triggers = segments.map((seg) => (
    <Tabs.Trigger
      key={seg.value}
      value={seg.value}
      className={isScrollable ? undefined : 'flex-1'}
      accessibilityLabel={seg.accessibilityLabel ?? seg.label}
    >
      <Tabs.Label
        className={isSolidGold ? 'font-inter text-base' : undefined}
        style={
          isSolidGold && value === seg.value
            ? { color: Colors.shared.midnightBlue }
            : undefined
        }
      >
        {seg.label}
      </Tabs.Label>
    </Tabs.Trigger>
  ));

  return (
    <Tabs
      value={value}
      onValueChange={onValueChange as (v: string) => void}
      variant="primary"
      animation={animation}
    >
      <Tabs.List
        className={listClassName}
        accessibilityLabel={accessibilityLabel}
      >
        <Tabs.Indicator
          style={isSolidGold ? { backgroundColor: Colors.shared.cairoGold } : undefined}
        />
        {isScrollable ? (
          <Tabs.ScrollView scrollAlign={scrollAlign}>
            {triggers}
          </Tabs.ScrollView>
        ) : (
          triggers
        )}
      </Tabs.List>
    </Tabs>
  );
}
```

Key decisions:

**Solid-gold indicator fill:** `style={{ backgroundColor: Colors.shared.cairoGold }}` on `Tabs.Indicator`. Background-color is NOT in the animated-only property list (only `width`, `height`, `translateX`, `opacity` are animated). This is safe. Using `style` with a token from `constants/theme.ts` rather than a hardcoded hex — this is the module-level color-prop exception pattern, same as `GoldTokens[500]` in `chip.tsx`.

**Solid-gold selected text:** `Tabs.Label` renders `text-segment-foreground` when selected (via HeroUI's `tabsClassNames.label`). For `solid-gold`, the selected text must be `Colors.shared.midnightBlue` (`#1B2B4B`). Since `isSelected` is available on `Tabs.Label` only through HeroUI's internal TriggerContext (not exposed as a prop), and since each trigger renders one label, we compare `value === seg.value` in the parent render to determine if this trigger is currently selected and apply the override via `style`. This is equivalent to what the existing `Pressable` rows do (`state.activeTab === tab && { backgroundColor: Colors.shared.cairoGold }`).

**Unselected text:** The `default` variant leaves HeroUI's `text-muted` in place. The `solid-gold` variant also leaves `text-muted` for unselected labels — this matches the existing categories screen which uses `text-muted` / `text2` for the inactive tab.

**No `animation="disable-all"` default:** The existing `Pressable` rows had no animation. The wrapper leaves this opt-in so the adoption author can decide per-site whether to keep HeroUI's default spring animation (it looks good on the indicator slide) or silence it for parity.

### Fallback if className indicator override fails at implementation time

If the `solid-gold` approach above encounters a Tailwind/Unistyles className ordering issue where `bg-segment` from HeroUI's `tv()` wins over our `style` prop (unlikely since `style` has higher specificity than `className` in RN), the implementation should switch to `isAnimatedStyleActive={false}` on `Tabs.Indicator` and provide a fully custom animated style via `useTabsIndicatorAnimation` hook (exported from HeroUI). This drops down one layer into HeroUI internals but keeps the substrate as HeroUI `Tabs`. Document the decision in the PR description. Substrate stays HeroUI `Tabs` either way — no parallel reimplementation.

---

## Adoption surfaces the wrapper must serve (validation, not adoption)

These surfaces confirm the API is sufficient. They are NOT changed in this SP.

### 1. Expense/Income category tab switcher — `screens/settings/categories/index.tsx`

Current: `Pressable` row with `padding: 3`, `backgroundColor: Colors.dark.surfaceEl`, `Radius.md` container. Active: `backgroundColor: Colors.shared.cairoGold`. Active text: `text-accent-foreground` (= midnightBlue). Inactive text: `text-muted`.

Wrapper call:
```tsx
<SegmentedTabs
  segments={[
    { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
    { value: CategoryType.Income, label: Strings.categoriesTabIncome },
  ]}
  value={state.activeTab}
  onValueChange={setActiveTab}
  variant="solid-gold"
/>
```

Visual delta: HeroUI `Tabs.List` uses `p-[3px] rounded-3xl bg-default` vs. current `padding: 3, borderRadius: Radius.md, backgroundColor: Colors.dark.surfaceEl`. `bg-default` maps to `surfaceEl` in the theme, so the container background is effectively the same. `rounded-3xl` is rounder than `Radius.md` (12px) — an accepted visual normalization within the segmented-control family. Confirm at device QA.

### 2. Type picker in add/edit category sheet — `screens/settings/categories/components/add_edit_category_sheet.tsx`

Current: `StyleSheet`-based `typeRow` / `typePill` / `typePillActive` with `backgroundColor: Colors.shared.cairoGold` active. Same `solid-gold` variant.

Wrapper call:
```tsx
<SegmentedTabs
  segments={[
    { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
    { value: CategoryType.Income, label: Strings.categoriesTabIncome },
  ]}
  value={sheetState.type}
  onValueChange={setType}
  variant="solid-gold"
/>
```

### 3. EGP/USD currency toggle — `screens/transactions/filter/components/amount_accordion.tsx`

Current: `Pressable` row inside `bg-background mb-3` wrapper with `rounded-md py-1.5` triggers. Active: `bg-default/40`. Inactive: no background. Selected text: `text-accent`. Unselected: `text-foreground/60`. This is a lighter, non-gold style — `variant="default"` maps well, though the indicator fill (`bg-segment`) will differ from the current `bg-default/40`. Confirm at device QA.

Wrapper call:
```tsx
<SegmentedTabs
  segments={[
    { value: Currency.EGP, label: Currency.EGP },
    { value: Currency.USD, label: Currency.USD },
  ]}
  value={draft.amountCurrency ?? Currency.EGP}
  onValueChange={onChangeCurrency}
  variant="default"
  listClassName="mx-0 mb-3"
/>
```

Note: this file is also touched by SP-5 (accordion shell). SP-4-adoption must merge before SP-5-contested begins per the parallelization plan.

### 4. EGP/USD currency picker — `screens/accounts/add_account/index.tsx`

Current: `Pressable` with `rounded-[10px]`, `border-[1.5px]`, `border-gold-600 bg-[rgba(201,151,58,0.08)]` selected. This is a border-highlight style, not an overlay indicator. The HeroUI `default` variant's animated pill indicator is a visual change from the current border style. Adoption author should confirm with @marcus whether `solid-gold` or `default` is the correct substitution at device QA.

Wrapper call (tentative — adoption author decides variant):
```tsx
<SegmentedTabs
  segments={CURRENCY_OPTIONS.map((code) => ({ value: code, label: code }))}
  value={selectedCurrency}
  onValueChange={(code) => form.setValue('currency', code)}
  variant="solid-gold"
/>
```

### 5. Month navigator — `screens/commitments/components/month_navigator.tsx`

Current: chevron-left + `Text` label (formatted `YYYY-MM`) + chevron-right. It is NOT a segmented control. The product owner has decided it will convert to a `Tabs` strip in SP-4-adoption.

Shape: the parent (`commitments/index.tsx` or equivalent) will need to maintain a list of available year-month strings (e.g., the last 12 months) and pass the current month as `value`. The navigator becomes a horizontal scrollable strip of month labels.

Wrapper call:
```tsx
<SegmentedTabs
  segments={availableMonths.map((ym) => ({
    value: ym,
    label: formatMonthYear(ym),   // same formatter as today
  }))}
  value={yearMonth}
  onValueChange={onMonthChange}
  variant="default"
  layout="scrollable"
  scrollAlign="center"
  accessibilityLabel="Select month"
/>
```

The `scrollable` layout mode + `Tabs.ScrollView`'s `scrollAlign="center"` auto-centers the selected month — replacing the current manual `onPrev` / `onNext` navigation with direct tap-to-select. The chevrons are retired. SP-4-adoption must define the `availableMonths` array in the parent hook; the wrapper only needs to render it. This shaped the wrapper to include `layout="scrollable"` and `scrollAlign` pass-through.

---

## Architecture and data flow

`SegmentedTabs` is **purely presentational**: segments + value in, `onValueChange` out. It owns no state, no store, no effects. Selection state continues to live where it already does (parent hooks, RHF controllers, Zustand stores). This keeps the component understandable in isolation and matches the `SelectablePill` philosophy.

The wrapper does NOT export `Tabs` (the HeroUI primitive). If a future screen needs the full HeroUI compound API (e.g., `Tabs.Content` for panel management), it imports from `heroui-native` directly. This wrapper is for the segmented-control use case only.

### File layout

```
components/ui/tabs.tsx     — SegmentedTabs component + TabSegment type + SegmentedTabsVariant type
```

No new store, no new hook, no new state file. One file.

### Import checklist for the implementation

```tsx
import Tabs from 'heroui-native';        // the component (not re-exported)
import React from 'react';
import { Colors } from '@/constants/theme';
```

`Colors.shared.cairoGold` and `Colors.shared.midnightBlue` are the two module-level color references needed (both are hex strings, not React hooks — sanctioned use per CLAUDE.md).

---

## Error handling

None applicable — no async, no I/O, no user input parsing. `segments` empty → no triggers rendered (degenerate but not a crash). `value` not in `segments` → HeroUI Tabs gracefully shows no selected trigger (indicator opacity animates to 0 per the indicator animation logic). `accessibilityLabel` undefined → no `aria-label` on the list; acceptable when context is unambiguous.

---

## Testing

Per the project's **logic-only test policy** (no `.tsx` render tests), a purely presentational component gets **no unit test file**. Verification:

1. **CI parity (6 jobs):** format, lint, typecheck, jest, expo-doctor, android prebuild. This SP creates one new `.tsx` file with no screen edits — existing tests must stay green as-is.
2. **TypeScript strict mode:** The generic `<T extends string>` on `SegmentedTabsProps` must satisfy `strict: true`. The cast `onValueChange as (v: string) => void` is the only unsafe-type-assertion site; it is necessary because HeroUI `Tabs.onValueChange` types as `(value: string) => void` while the caller expects `(value: T) => void`. The cast is safe because `T extends string` and the values in `segments` constrain what HeroUI can emit. Add an `oxlint-disable-next-line` comment with justification.
3. **Device QA gate:** Deferred to SP-4-adoption PR. The wrapper-only PR has no visual change — CI-only gate is sufficient.

---

## Accepted visual normalization (on adoption)

| Property | Before (varies per site) | After (normalized) | Perceptibility |
|---|---|---|---|
| Container shape | `Radius.md` (12px) | `rounded-3xl` (24px+) | Rounder — confirm at QA |
| Container bg | `Colors.dark.surfaceEl` | `bg-default` (maps to surfaceEl) | Effectively same |
| Solid-gold trigger shape | `Radius.sm` border-only | Rounded pill overlay | Visual change — confirm at QA |
| Default-variant selected bg | `bg-default/40` | `bg-segment` (theme variable) | Potentially different shade — confirm at QA |
| Label typography | varies (Sora/Inter, various sizes) | HeroUI default `text-base font-medium` | Size/weight may differ per site |

Label typography is worth flagging: the existing sites use different font families and sizes (e.g., `font-sora-semi text-base` in categories, `font-inter text-[11px] font-semibold` in amount accordion). HeroUI `Tabs.Label` defaults to `text-base font-medium`. For parity, SP-4-adoption may need to pass a `className` override to `Tabs.Label` per site — but this is an adoption concern, not a wrapper concern. The wrapper should document that per-trigger label class overrides are achievable by extending the `TabSegment` type with an optional `labelClassName` field if needed. For now, leave it out and decide during adoption.

---

## Scope and sequencing

**This SP (SP-4-WRAPPER):**
- Create `components/ui/tabs.tsx` (1 new file)
- Zero screen edits
- Branch: `feat/wave4-sp4-tabs-wrapper`
- CI-only gate (no visual change, no device QA required)
- Runs concurrently with SP-2, SP-3, and SP-5-non-contested in Batch 1

**SP-4-adoption (Batch 2, separate spec):**
- Adopt `SegmentedTabs` at all five surfaces
- Requires SP-4-WRAPPER merged to `main` first
- Branch: `feat/wave4-sp4-tabs-adoption`
- Device QA required

---

## Out of scope

- **`type_tabs.tsx` (`screens/transactions/transaction_form/components/type_tabs.tsx`):** The add-transaction form uses a bespoke Material-tabs indicator — a colored bottom border per transaction type (Expense/Income/Transfer/CC Payment). HeroUI `Tabs` `secondary` variant has a bottom-border indicator (`border-b-2 border-accent`), but the current implementation uses four distinct colors per type, not a single accent color. Migrating this surface risks a visible regression on the most-used screen in the app. It is deferred to a dedicated SP with its own spec. The `SegmentedTabsVariant` type does NOT include a `'colored-bottom-border'` variant — that SP will decide whether to extend this wrapper or use HeroUI `Tabs` directly.
- **`screens/dashboard/index.tsx`:** Already uses HeroUI `Tabs` directly. SP-4 does not touch it.
- **Token-source migration (`theme_tokens.ts` → `theme.ts`):** Dropped at the Wave 4 level (see SP-1 spec Context section).
- **SP-4-adoption screen edits:** All adoption-sweep file changes (`amount_accordion.tsx`, `add_account/index.tsx`, `categories/index.tsx`, `add_edit_category_sheet.tsx`, `month_navigator.tsx`) are Batch 2 work. Out of scope for this SP.
- **`Tabs.Content` panel management:** No adoption site uses tabs to show/hide content panels. If needed in future, use HeroUI `Tabs` directly or extend this wrapper.

---

## Open questions

1. **`Tabs.Label` typography per site:** The wrapper uses HeroUI's default `text-base font-medium`. If device QA in SP-4-adoption reveals font family/size regressions (e.g., the amount accordion's `text-[11px]` micro labels), SP-4-adoption can extend `TabSegment` with an optional `labelClassName` field and forward it per trigger. Resolve during adoption — do not prematurely add it here.

2. **`animation` default for adoption sites:** The prior `Pressable` rows had no press animation. HeroUI `Tabs` has a spring indicator slide. Whether to keep the animation (improved UX) or silence it (`animation="disable-all"`) is an adoption-time decision per @marcus. No API change needed — the prop is already present.

3. **Month navigator parent shape:** SP-4-adoption must decide where `availableMonths` is computed and stored (commitments hook or a new derivation in the hook). This is an adoption concern; the wrapper API is sufficient as-is. The product owner confirmed the chevron/label pattern retires in favor of the Tabs strip — the UX and range of available months must be specified in the SP-4-adoption design note.
