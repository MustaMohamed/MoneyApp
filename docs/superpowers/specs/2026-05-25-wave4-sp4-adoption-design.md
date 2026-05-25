# Wave 4 · SP-4-adoption — `SegmentedTabs` Adoption Design

**Date:** 2026-05-25
**Author:** @tariq
**Status:** Design
**Branch:** `feat/wave4-sp4-adoption`
**Depends on:** SP-4-WRAPPER merged to `main` (`components/ui/tabs.tsx` — `SegmentedTabs` wrapper available)
**Parent effort:** Wave 4 (Full HeroUI migration), Batch 2.

---

## 1. Goal

Retire three bespoke `Pressable`-row segmented controls by replacing them with the canonical `SegmentedTabs` wrapper (`components/ui/tabs.tsx`). This is a like-for-like primitive migration:

- **Zero rendered-text changes.** Every label byte passes through `segments[].label` unchanged.
- **Behavior and accessibility parity.** Selection callbacks, single-select semantics, and tab a11y (`role="tablist"` / `role="tab"` / `aria-selected`) are preserved — the HeroUI `Tabs` substrate handles them.
- **Only accepted visual normalization.** Per-target deltas are documented below and gated behind device QA.

---

## 2. Scope

### In scope

| # | Target | File(s) | Change |
|---|--------|---------|--------|
| T1 | Categories Expense/Income switcher | `screens/settings/categories/index.tsx` | Replace `Pressable` row (lines 56–95) |
| T2 | Filter currency toggle | `screens/transactions/filter/components/amount_accordion.tsx` | Replace inner `Pressable` row (lines 74–91 only) |
| T3 | Add-account currency picker | `screens/accounts/add_account/index.tsx` AND `screens/onboarding/add_account/index.tsx` | Replace `Pressable` row in both (identical pattern) |

### Explicitly out of scope

- **`screens/commitments/components/month_navigator.tsx`** — deferred to its own cycle. It is a prev/next stepper, not a segmented control; the full scrollable-strip redesign warrants a dedicated spec.
- **`screens/transactions/transaction_form/components/type_tabs.tsx`** — deferred. The multi-color bottom-border Material-tabs pattern is out of scope for this adoption pass.
- **`screens/settings/categories/components/add_edit_category_sheet.tsx`** — the `StyleSheet`-based type picker in the add/edit sheet is a separate surface deferred to its own cycle. It is NOT one of the three targets here.
- **The `AmountAccordion` OUTER shell** (`screens/transactions/filter/components/amount_accordion.tsx` lines 43–71): the `<View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">` container, the `Pressable` header with the chevron expand/collapse, and the `Input` min/max rows. All of that belongs to **Batch 3** (SP-5-accordions). This SP touches ONLY the inner currency toggle (lines 74–91).

---

## 3. Wrapper API Reference (verified — `components/ui/tabs.tsx`)

The `SegmentedTabs<T extends string>` component is verified from source. Relevant props for this SP:

```
segments: { value: T; label: string; accessibilityLabel?: string }[]
value: T
onValueChange: (value: T) => void
variant?: 'default' | 'solid-gold'   // default: 'default'
layout?: 'fixed' | 'scrollable'      // default: 'fixed'
listClassName?: string
animation?: 'disable-all'
accessibilityLabel?: string           // aria-label on the Tabs.List (tablist)
```

All three targets are 2-option → `layout="fixed"` (default, no need to pass).

**Solid-gold mechanism (verified from source):**
- `Tabs.Indicator` receives `style={{ backgroundColor: Colors.shared.cairoGold }}`. Background-color is NOT in the Reanimated-animated property set (only `width`, `height`, `translateX`, `opacity` are animated) — the override is safe.
- The selected `Tabs.Trigger`'s `Tabs.Label` receives `style={{ color: Colors.shared.midnightBlue }}` when `value === seg.value`.

**Static-style fallback (contingency, documented in wrapper JSDoc):** If `bg-segment` from HeroUI's `tv()` unexpectedly wins over the `style` prop on `Tabs.Indicator` (Unistyles className ordering edge case), set `isAnimatedStyleActive={false}` on `Tabs.Indicator` and provide background via a fully static `style` prop. This removes the spring slide animation but keeps HeroUI `Tabs` as the substrate. The implementer MUST document the decision in the PR description if this fallback is invoked.

Note: `useTabsIndicatorAnimation` is NOT exported from `heroui-native` — the fallback is static style only, not a custom animation hook.

---

## 4. Per-Target Mapping

### T1 — Categories Expense/Income switcher

**File:** `screens/settings/categories/index.tsx`
**Current code (lines 56–95):** A `<View style={{ flexDirection:'row', marginHorizontal:Spacing.sm, marginTop:Spacing.sm, marginBottom:Spacing.sm, backgroundColor:Colors.dark.surfaceEl, borderRadius:Radius.md, padding:3, gap:3 }}>` wrapping two `Pressable`s over `[CategoryType.Expense, CategoryType.Income]`. Selected `Pressable`: `flex:1, paddingVertical:Spacing.xs, borderRadius:Radius.sm, alignItems:'center', backgroundColor:Colors.shared.cairoGold`. Selected label: `text-accent-foreground font-sora-semi text-base`. Unselected label: `text-muted font-inter-medium text-base`. Labels sourced from `Strings.categoriesTabExpense` / `Strings.categoriesTabIncome`. State: `state.activeTab` + `setActiveTab(tab)` from `useCategories()`.

**Target call:**
```tsx
<SegmentedTabs<CategoryType>
  segments={[
    { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
    { value: CategoryType.Income, label: Strings.categoriesTabIncome },
  ]}
  value={state.activeTab}
  onValueChange={setActiveTab}
  variant="solid-gold"
  accessibilityLabel="Category type"
/>
```

**Outer spacing preservation:** The retiring `View` carried `marginHorizontal: Spacing.sm`, `marginTop: Spacing.sm`, `marginBottom: Spacing.sm`. `SegmentedTabs` emits a `Tabs.List` which has no outer margin by default. Pass these margins via `listClassName` or wrap in a `<View style={{ marginHorizontal: Spacing.sm, marginVertical: Spacing.sm }}>`. Prefer `listClassName` if the token values map cleanly to Tailwind classes; use a wrapping `View` with `style` props if not (per CLAUDE.md layout-critical container rule).

**Import additions needed:** `SegmentedTabs` from `@/components/ui/tabs`. Existing imports of `Colors`, `Radius`, `Spacing` may become unused — remove if so. `Pressable` and `View` (the tab-row View) may become unused — remove if so. Keep `View` for the `style={{ flex: 1 }}` list container below (line 98).

**Accepted visual delta (device QA item):**
- Container shape: `Radius.md` (12px) → `rounded-3xl` (~24px). Rounder pill look.
- Container background: `Colors.dark.surfaceEl` → `bg-default` (maps to `surfaceEl` in theme — effectively same, confirm at QA).
- Label typography: `font-sora-semi text-base` / `font-inter-medium text-base` → HeroUI `Tabs.Label` default. Near-parity in size; weight/family normalization is accepted.

This is the closest-to-parity target because the current design already uses `cairoGold` fill.

---

### T2 — Filter currency toggle

**File:** `screens/transactions/filter/components/amount_accordion.tsx`
**Edit boundary (HARD CONSTRAINT):** Lines 74–91 ONLY — the `<View className="bg-background mb-3 flex-row gap-1.5 rounded-lg p-1">` and its two `Pressable` children. DO NOT touch:
- Lines 43–71: the outer `<View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">` shell and the `Pressable` accordion header with chevron and expand/collapse logic.
- Lines 92–121: the `Input` min/max rows.
- The `expanded` / `onToggleSection` props and all accordion state.

These outer elements belong to **Batch 3** (SP-5). Any reviewer must reject changes outside lines 74–91.

**Current code (lines 74–91):** `<View className="bg-background mb-3 flex-row gap-1.5 rounded-lg p-1">` wrapping two `Pressable`s over `[Currency.EGP, Currency.USD]`. Selected: `flex-1 items-center rounded-md py-1.5 bg-default/40` + label `font-inter text-[11px] font-semibold text-accent`. Unselected label: `text-foreground/60`. Label text is the enum value (`{c}` → "EGP" / "USD"). Props: `draft.amountCurrency`, `onChangeCurrency(c)`.

**Target call:**
```tsx
<SegmentedTabs<Currency>
  segments={[
    { value: Currency.EGP, label: Currency.EGP },
    { value: Currency.USD, label: Currency.USD },
  ]}
  value={draft.amountCurrency}
  onValueChange={onChangeCurrency}
  variant="solid-gold"
  listClassName="mb-3"
  accessibilityLabel="Amount currency"
/>
```

**Variant note:** The previous SP-4-WRAPPER design proposed `variant="default"` for this toggle. That was written before the user decision (2026-05-25) that all currency pickers use `solid-gold`. This spec overrides that: use `variant="solid-gold"`. The `bg-background mb-3` outer wrapper is replaced by the `Tabs.List` container (with `mb-3` forwarded via `listClassName`). The retiring `View` can be removed entirely.

**Import additions needed:** `SegmentedTabs` from `@/components/ui/tabs`. `Pressable` and the inner `View` (lines 74–91) become unused — remove them. Keep all other imports; the outer shell still uses `MaterialCommunityIcons`, `Input`, `Text`, etc.

**Accepted visual delta (device QA item):**
- Selected indicator: grey-pill `bg-default/40` with `text-accent` label → gold fill `cairoGold` + midnight-blue label. This is a visible appearance change. It is intentional and user-approved (currency pickers use solid-gold per the 2026-05-25 decision). Flag prominently in the PR description.
- Container shape: `rounded-lg` → `rounded-3xl`. Rounder pill look.
- Label typography: `font-inter text-[11px] font-semibold` → HeroUI `Tabs.Label` default. The `text-[11px]` micro-size will normalize to `text-base`. If QA reveals this is too large for the filter-sheet context, apply `listClassName` or extend with a per-segment `labelClassName` approach — but do not make that call pre-QA.

---

### T3 — Add-account currency picker (two screens)

**Files:**
- `screens/accounts/add_account/index.tsx` (lines 109–139)
- `screens/onboarding/add_account/index.tsx` (lines 112–142)

The pattern is identical in both files. Both must receive the same change. Apply atomically — do not ship one without the other.

**Current code (both files):** Under the `{Strings.o4SectionCurrency}` hint label, a `<Box style={{ flexDirection:'row' }} className="gap-2">` wrapping two `Pressable`s over `CURRENCY_OPTIONS = [Currency.EGP, Currency.USD]`, each `style={{ flex:1 }}` `className="items-center justify-center rounded-[10px] border-[1.5px] px-3 py-3"`. Selected: `border-gold-600 bg-[rgba(201,151,58,0.08)]` + label `font-soraBold text-gold-600`. Unselected: `border-border bg-default` + label `text-muted`. Label is the `code` enum value. State: `selectedCurrency = useWatch({ control, name:'currency' })`, change via `form.setValue('currency', code)`.

**Target call (both screens):**
```tsx
<SegmentedTabs<Currency>
  segments={[
    { value: Currency.EGP, label: Currency.EGP },
    { value: Currency.USD, label: Currency.USD },
  ]}
  value={selectedCurrency}
  onValueChange={(c) => form.setValue('currency', c)}
  variant="solid-gold"
  accessibilityLabel="Account currency"
/>
```

**`CURRENCY_OPTIONS` const:** Remove the `const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD]` declaration from both files if it is no longer referenced after this change. Do not leave dead code.

**Import additions needed (both files):** `SegmentedTabs` from `@/components/ui/tabs`. `Pressable` from `@/components/ui/pressable` may become unused — remove if so (verify no other `Pressable` usage remains in each file; both files have color-swatch `Pressable`s lower in the form, so the import stays). The retiring `Box` row and the map over `CURRENCY_OPTIONS` are replaced entirely; the outer `<Box className="pt-1">` and the hint `<Text>` above it are untouched.

**User decision (2026-05-25 — APPROVED, intentional visual change):** This is a notable visual redesign. The current tall bordered-card pair (matching the `TypePill` grid above it in visual weight) becomes a compact gold-pill segmented control. The currency picker is now visually distinct from the account-type `TypePill`s — that distinction is accepted. This change must be called out prominently in the PR description and is a device QA gate item.

**Accepted visual delta (device QA item):**
- Shape: tall `rounded-[10px] border-[1.5px] px-3 py-3` bordered card pair → compact `rounded-3xl` pill strip. Major height reduction.
- Selected state: `border-gold-600 bg-[rgba(201,151,58,0.08)]` border highlight → `cairoGold` filled pill indicator. Visible redesign (approved).
- Label typography: `font-soraBold text-gold-600` / `text-muted` → HeroUI `Tabs.Label` default with solid-gold midnight-blue / muted override.

---

## 5. Accessibility Parity

The retiring `Pressable` rows use `accessibilityRole="button"` (implicit — RN `Pressable` defaults). HeroUI `Tabs` provides proper ARIA semantics:
- `Tabs.List` → `role="tablist"`
- `Tabs.Trigger` → `role="tab"`, `aria-selected`, `accessibilityState={{ selected }}`
- `Tabs.Trigger` gets `accessibilityLabel={seg.accessibilityLabel ?? seg.label}` — the label string is byte-identical.

This is a net accessibility improvement (tablist/tab semantics over button semantics for a segmented control).

Each call site passes `accessibilityLabel` on the `SegmentedTabs` (forwarded to `Tabs.List`) to give the tablist a name — the bespoke rows had no explicit `accessibilityLabel` on the container. Per-target values:
- T1: `"Category type"`
- T2: `"Amount currency"`
- T3: `"Account currency"`

These are concise and unambiguous given surrounding labels. No string-key required (these are structural a11y strings, not user-facing copy per CLAUDE.md domain rule).

---

## 6. Verification and Risk

**Lesson from SP-3 (last cycle):** A spec assumption about HeroUI primitive defaults was wrong and shipped critical visual regressions that CI did not catch — only device QA found them. This spec asserts ONLY what has been verified from source code (`components/ui/tabs.tsx`) and from the actual target files. No rendered output is assumed without a source reference.

### Implementer verification checklist

Before opening the PR, the implementer must device-verify:

1. **T1 — solid-gold gold fill renders on the categories Expense/Income switcher.** The `Tabs.Indicator` must show `Colors.shared.cairoGold` fill. The selected label must show `Colors.shared.midnightBlue` text. If either fails: apply the static-style fallback (`isAnimatedStyleActive={false}` on `Tabs.Indicator`, static `style` for position + background). Document in PR description.

2. **T2 — solid-gold gold fill renders on the filter currency toggle.** Same verification as T1. Additionally confirm the `mb-3` bottom margin via `listClassName` correctly replicates the retiring `mb-3` class on the removed `View`. Verify the toggle is visually contained within the expanded accordion body and does not bleed outside the outer shell.

3. **T3 — solid-gold gold fill renders on the add-account currency picker (both screens).** Verify in both `screens/accounts/add_account` AND `screens/onboarding/add_account`. The user-approved visual redesign from bordered-card pair to pill strip must be confirmed to look intentional and not broken. Verify the `selectedCurrency` from `useWatch` correctly drives the `value` prop on mount (pre-selected currency is reflected without user interaction).

4. **Outer spacing preservation (T1).** Confirm `Spacing.sm` horizontal + vertical margins around the T1 control match the spacing the retiring `View` provided.

5. **T2 boundary enforcement.** Confirm the outer accordion shell (header `Pressable`, `View` container, `Input` rows) is 100% untouched. Diff must show changes only in lines 74–91 of `amount_accordion.tsx`.

6. **`CURRENCY_OPTIONS` cleanup (T3).** Confirm the `const CURRENCY_OPTIONS` declaration is removed from both files if unused.

### Known risks

| Risk | Impact | Mitigation |
|---|---|---|
| `bg-segment` className wins over `style` on `Tabs.Indicator` (Unistyles ordering) | Gold fill does not appear | Apply static-style fallback; document in PR |
| `Tabs.Label` default typography renders too large for the `text-[11px]` T2 filter context | Visual regression in filter sheet | If confirmed at QA, extend `SegmentedTabs` with optional `labelClassName` per segment and forward to `Tabs.Label`; revisit in a follow-up SP |
| `listClassName` Tailwind class not compiling at runtime in Unistyles | Spacing mismatch | Use a wrapping `View` with `style` prop for any critical spacing (per CLAUDE.md layout-critical container rule) |
| T3 changes applied to only one of the two screens | Inconsistent UX between onboarding + app | Reviewer must verify both files are changed in the same PR |
| SP-5 / Batch 3 begins before T2 lands, creating a file conflict on `amount_accordion.tsx` | Merge conflict | SP-4-adoption must merge to `main` before any SP-5 branch edits `amount_accordion.tsx`. This ordering constraint is noted in the parallelization plan. |

---

## 7. Testing Approach

**Project policy: logic-only tests. No `.tsx` render tests.**

`SegmentedTabs` is purely presentational — it owns no state, no store, no effects. The selection state lives where it already lives, unchanged by this migration:

- **T1:** `useCategories()` → `state.activeTab` + `setActiveTab` from `useCategoriesScreenState` (Zustand). Covered by `__tests__/categories.state.test.ts` which asserts `activeTab` transitions: `setActiveTab(CategoryType.Income)` / `setActiveTab(CategoryType.Expense)`. These tests are the regression guard — they must pass unchanged after this SP.

- **T2:** `filter.store.ts` → `draft.amountCurrency` + `onChangeCurrency` setter (line 73 of `filter.store.ts`). Covered by `__tests__/database_get_transactions_filter.test.ts` which exercises `amountCurrency: Currency.EGP` / `amountCurrency: Currency.USD` filter scenarios. These tests are the regression guard — pass unchanged.

- **T3:** RHF `currency` field on the add-account form. Covered by `__tests__/add_account.schema.test.ts`. Pass unchanged.

**No new test files are required.** The presentational wiring (`SegmentedTabs` receiving `value`/`onValueChange`) is verified by device QA, not automated tests. Do not invent render tests for this SP.

Run `npm test -- --ci` before pushing to confirm all existing tests still pass.

---

## 8. Files Touched

| File | Change |
|---|---|
| `screens/settings/categories/index.tsx` | Replace tab-switcher `View`+`Pressable` block (lines 56–95) with `SegmentedTabs`. Remove unused imports. |
| `screens/transactions/filter/components/amount_accordion.tsx` | Replace inner currency toggle `View`+`Pressable` block (lines 74–91) with `SegmentedTabs`. Add `SegmentedTabs` import. |
| `screens/accounts/add_account/index.tsx` | Replace currency picker `Box`+`Pressable` block with `SegmentedTabs`. Remove `CURRENCY_OPTIONS` const if unused. |
| `screens/onboarding/add_account/index.tsx` | Same as above (identical pattern). |

No new files. No store changes. No hook changes. No migration. No schema change. No new dependency.

---

## 9. Open Questions

None. All decisions are resolved:

- Variant for all three targets: `solid-gold` (user decision 2026-05-25).
- Month navigator: explicitly deferred.
- Add-edit category sheet type picker: explicitly deferred.
- Outer accordion shell (T2): not touched; belongs to Batch 3.
- Typography normalization: accepted for all three targets; revisit only if device QA identifies a functional regression (e.g., label truncation).
