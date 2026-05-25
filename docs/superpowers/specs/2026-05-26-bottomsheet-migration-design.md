# BottomSheet Migration — Design Spec

**Date:** 2026-05-26
**Status:** Draft — awaiting spec sign-off
**Owners:** [tariq] technical · [sarah] sequencing
**Critical-trigger class:** High blast radius (critical trigger #3) — touches every sheet in the app. No new dependency. No native code change. Coexistence strategy ensures the app never breaks mid-migration.
**Branch (impl, later):** `refactor/bottomsheet-migration`

**Cross-references:**
- `components/ui/sheet.tsx` — the legacy hand-rolled `@gorhom/bottom-sheet` wrapper; untouched through Waves 1–4, deleted in Wave 5.
- `components/ui/bottom_sheet.tsx` — the new HeroUI-backed primitive (created Wave 1, promoted to `sheet.tsx` in Wave 5).
- `components/ui/confirm_sheet.tsx` — shared confirm sheet; rebuilt on `bottom_sheet.tsx` in Wave 1.
- `store/sheet_visibility.store.ts` — FAB-hiding counter; contract is preserved unchanged.
- `__tests__/components/ui/sheet_snap_points.test.ts` — rewritten in Wave 1 (imports `resolveSnapPoints` from `bottom_sheet.tsx`; updated to `sheet.tsx` in Wave 5).
- `__tests__/store/sheet_visibility.store.test.ts` — unchanged; the store contract does not change.
- `__mocks__/@gorhom/bottom-sheet.tsx` — extended in Wave 1 to support HeroUI BottomSheet usage.
- `CLAUDE.md` "Bottom Sheets" section — updated in Wave 5 (the last wave).

---

## 1. Feature Summary

The app's bottom-sheet surface has a confirmed, multi-class bug set rooted in its legacy hand-rolled wrapper (`components/ui/sheet.tsx`). The wrapper drives `@gorhom/bottom-sheet` imperatively via a `ref` while exposing a declarative `visible`/`onClose` API. The mismatch between gorhom v5's initial-only `index` prop and the imperative ref-driven state produces unreliable behavior across all four reported symptom classes:

1. **Keyboard gap/jump** — form sheets show a gap between the footer CTA and the keyboard on Android, or jump when the keyboard appears.
2. **Close reliability** — sheets sometimes fail to close via overlay press, the close button, or programmatic `visible = false`.
3. **Scroll/gesture conflicts** — `BottomSheetScrollView`/`BottomSheetFlatList` content intercepts are disrupted by the wrapper's custom backdrop.
4. **Snap/sizing drift** — the `enableDynamicSizing` opt-in is leaky; sheets with short content do not snap to the declared `size` preset.

HeroUI Native (`heroui-native` v1.0.3) already ships a `BottomSheet` compound component (`BottomSheet` / `.Trigger` / `.Portal` / `.Overlay` / `.Content` / `.Close` / `.Title` / `.Description`) that resolves all four classes via `onOpenChange` (all-path close), `useBottomSheetAwareHandlers` (keyboard), gorhom scrollables + enforced `enableOverDrag={false}` / `enableDynamicSizing={false}` / `contentContainerClassName="h-full"` (scroll), and explicit `snapPoints` + `enableDynamicSizing={false}` (snap). `@gorhom/bottom-sheet` stays in the tree as HeroUI's rendering engine — no new dependency, no native code change.

This spec covers the full migration: a new thin `Sheet` primitive composing HeroUI `BottomSheet`, a shared sheet kit for cross-cutting pickers, wave-sequenced migration of all 12+1 consumers, and a final cleanup. The coexistence model is: the legacy `components/ui/sheet.tsx` is left **byte-for-byte untouched** throughout Waves 1–4; the new HeroUI-backed primitive is created at a separate transitional path (`components/ui/bottom_sheet.tsx`) in Wave 1. Consumers migrate from the legacy import to the new one wave by wave. Wave 5 deletes the legacy file and promotes `bottom_sheet.tsx` → `sheet.tsx`. There is no shim and no dual-API on a single file; there are simply two distinct files during the transition, and the app is always green.

**Out of scope:** No visual redesign of sheets. Every sheet that is behavior-preserving today stays visually identical. Where a bug fix changes observable behavior (e.g., overlay press now reliably closes), that is intentional and expected.

---

## 2. Product & UX ([marcus])

There is no UX design work in this migration. Every existing sheet keeps its current layout, content, and interaction model. The only UX-observable changes are bug fixes:

- Overlay press now reliably closes every sheet (previously broken on some sheets).
- The CTA footer sits flush against the keyboard on form sheets (previously showed a gap on Android).
- Scroll in list-picker sheets no longer conflicts with swipe-to-dismiss.
- Sheets snap to their declared size; they do not resize to content height unexpectedly.

Marcus's input: confirmed behavior-preserving; no new screen designs required. Device-QA gates (one per wave) are the UX validation surface.

---

## 3. Financial Logic ([layla])

Not applicable. This is a UI infrastructure migration with no financial logic changes.

---

## 4. Architecture ([tariq])

### 4.1 Why composing HeroUI `BottomSheet` is allowed under Team Law 7

Team Law 7 forbids hand-rolling a custom or third-party UI component that a HeroUI primitive could cover. It explicitly permits **composing/wrapping** a HeroUI primitive. The new `Sheet` primitive is exactly that: a thin wrapper over `BottomSheet` (Root → Portal → Overlay → Content → Close → Title) that bakes project-specific defaults (snap presets, FAB-hide side-effect, `SHEET_FOOTER_CLEARANCE` export). This is the same precedent as `Screen`/`ScreenScroll`/`Text`/`FAB` — layout or behavioral shells that compose HeroUI, not parallel implementations. The direct `@gorhom/bottom-sheet` wiring in the old `Sheet` is the non-conforming part being eliminated.

### 4.2 Section 1 — New `Sheet` primitive (`components/ui/bottom_sheet.tsx`, new file)

The legacy `components/ui/sheet.tsx` is left untouched in Wave 1. The new HeroUI-backed primitive is created as a separate file at `components/ui/bottom_sheet.tsx`. Consumers that migrate in Waves 1–4 update their import from `@/components/ui/sheet` to `@/components/ui/bottom_sheet`. In Wave 5, the legacy file is deleted and `bottom_sheet.tsx` is promoted to `sheet.tsx` with a final import-path cleanup pass. This is the mechanism that makes phased coexistence work without a shim.

The new file composes `BottomSheet` from `heroui-native`.

#### 4.2.1 API surface

```ts
export interface SheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /**
   * Preset size. Resolves to snapPoints via SNAP_POINTS map.
   * Overridden by explicit `snapPoints` prop.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Explicit snap points. Overrides `size` when provided.
   * Pass gorhom-style string values: ['50%'], ['45%', '92%'], etc.
   */
  snapPoints?: string[];
  /**
   * Opt-in scrollable mode. When true, bakes:
   *   enableOverDrag={false}
   *   enableDynamicSizing={false}
   *   contentContainerClassName="h-full"
   * onto BottomSheet.Content so gorhom scrollables work correctly.
   * Children must use BottomSheetScrollView / BottomSheetFlatList
   * from @gorhom/bottom-sheet — not react-native ScrollView.
   */
  scrollable?: boolean;
  /**
   * Sticky footer rendered via gorhom footerComponent.
   * Consumers that pass a footer must add SHEET_FOOTER_CLEARANCE
   * as paddingBottom to their scrollable contentContainerStyle.
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

#### 4.2.2 Snap preset map (unchanged values)

```ts
const SNAP_POINTS: Record<'sm' | 'md' | 'lg', string[]> = {
  sm: ['50%'],
  md: ['75%'],
  lg: ['92%'],
};

/** Pure resolver — exported for unit testing */
export function resolveSnapPoints(
  size: SheetProps['size'],
  snapPoints: SheetProps['snapPoints'],
): string[] {
  return snapPoints ?? SNAP_POINTS[size ?? 'lg'];
}
```

Exporting `resolveSnapPoints` as a pure function makes the existing `sheet_snap_points.test.ts` directly testable without file-read string-matching. The test is updated to import and call it directly.

#### 4.2.3 FAB-hide side-effect

The primitive is the **sole publisher** to `sheet_visibility.store`. It uses a `useEffect` on `isOpen`:

```ts
useEffect(() => {
  if (isOpen) {
    increment();
    return () => { decrement(); };
  }
  return undefined;
}, [isOpen, increment, decrement]);
```

This preserves the exact counter contract tested in `sheet_visibility.store.test.ts`. `decrement` is called on cleanup (unmount while open) and on the next effect run (when `isOpen` flips to false). The store and its tests are unchanged.

#### 4.2.4 Baked defaults on `BottomSheet.Content`

| Prop | Value | Reason |
|---|---|---|
| `snapPoints` | `resolveSnapPoints(size, snapPoints)` | Enforce sm/md/lg contract |
| `enableDynamicSizing` | `false` | Prevent content-height drift from breaking snap contract |
| `keyboardBehavior` | `'interactive'` | Footer stays flush against keyboard on all platforms |
| `keyboardBlurBehavior` | `'restore'` | Sheet returns to snap on keyboard dismiss |
| `android_keyboardInputMode` | `'adjustResize'` | Required on Android for gorhom to receive keyboard height |
| `enablePanDownToClose` | `true` | Swipe-to-dismiss always enabled |

When `scrollable={true}` is passed, additionally:

| Prop | Value |
|---|---|
| `enableOverDrag` | `false` |
| `contentContainerClassName` | `'h-full'` |

#### 4.2.5 Close routing

`onOpenChange` from the HeroUI root fires on all close paths (swipe-down, overlay press, close button, programmatic). The primitive passes it straight through:

```tsx
<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
  <BottomSheet.Portal>
    <BottomSheet.Overlay />
    <BottomSheet.Content ...>
      {title !== undefined && (
        <>
          <BottomSheet.Close />
          <BottomSheet.Title>{title}</BottomSheet.Title>
        </>
      )}
      {children}
    </BottomSheet.Content>
  </BottomSheet.Portal>
</BottomSheet>
```

No `.Trigger` is rendered. Sheets are parent-controlled via `isOpen` only.

#### 4.2.6 Footer

`footer` is passed to `BottomSheet.Content` via gorhom's `footerComponent` prop (same as the legacy wrapper). The footer node is rendered as a `BottomSheetFooter` (from `@gorhom/bottom-sheet`) inside `footerComponent`.

#### 4.2.7 Theming

Background and handle are expressed via `className` on `BottomSheet.Content` (`backgroundClassName`, `handleClassName`, `handleIndicatorClassName`) using theme tokens (`bg-surface`, `border-border`), replacing the legacy `StyleSheet.create` with hardcoded `Colors.dark.*` values.

#### 4.2.8 Retained exports

`SHEET_FOOTER_CLEARANCE` is carried forward with the same value and the same calculation rationale (see existing comment in the legacy `sheet.tsx`). `resolveSnapPoints` is a new export (testable pure function). `useBottomSheetAwareHandlers` is re-exported from `heroui-native` so callers import it from `@/components/ui/bottom_sheet` (and later `@/components/ui/sheet` after Wave 5) without a direct `heroui-native` dep.

```ts
export { useBottomSheetAwareHandlers } from 'heroui-native';
```

### 4.3 Section 2 — Shared sheet kit (`components/sheets/`)

#### 4.3.1 Placement rule

A sheet component moves to `components/sheets/` **if and only if it has two or more consumers**. Single-consumer sheets stay in their screen folder (`screens/<domain>/components/`) and migrate onto the new primitive in place. This preserves the `screens/` anatomy rule (colocate with the screen that owns them) while avoiding import tangles for components that are genuinely cross-cutting.

Rationale: moving a sheet to `components/sheets/` is an additional cost (re-export from all prior paths, or update all callers). That cost is only justified when the sheet is actually shared. Single-consumer sheets have one caller who imports from a local path — no change needed.

#### 4.3.2 `components/sheets/account_picker_sheet.tsx`

Moved from `screens/transactions/transaction_form/components/account_picker_sheet.tsx` and generalized. Consumers (3):

- `screens/transactions/transaction_form/index.tsx` (two call sites: from and to account)
- `screens/commitments/components/commitment_form_body.tsx`
- `screens/commitments/detail/components/pay_sheet.tsx`

The component's API is unchanged; its internal `Sheet` import is updated from `@/components/ui/sheet` to `@/components/ui/bottom_sheet` and `visible`/`onClose` renamed to `isOpen`/`onOpenChange`.

#### 4.3.3 `components/sheets/category_picker_sheet.tsx`

Moved from `screens/transactions/transaction_form/components/category_picker_sheet.tsx` and generalized. Consumers (3):

- `screens/transactions/transaction_form/index.tsx` (two call sites: expense and income category)
- `screens/commitments/components/commitment_form_body.tsx`
- `screens/budget/components/set_budget_sheet.tsx`

Same treatment as account picker — import updated from `@/components/ui/sheet` to `@/components/ui/bottom_sheet`.

#### 4.3.4 `components/ui/confirm_sheet.tsx`

Stays at its current path (it is shared and already in `components/ui/`). Rebuilt on the new primitive in Wave 1 — its internal `Sheet` import switches from `@/components/ui/sheet` to `@/components/ui/bottom_sheet`. API change: `visible`/`onClose`/`onCancel` → `isOpen`/`onOpenChange`. Its two callers (`skip_confirm_sheet.tsx`, `deactivate_sheet.tsx`) are updated in the same wave.

### 4.4 Section 3 — Migration waves

Each wave is one PR with its own device-QA gate. The coexistence mechanism: `components/ui/sheet.tsx` (the legacy wrapper with the `visible`/`onClose` API) is left byte-for-byte untouched throughout Waves 1–4. The new HeroUI-backed primitive lives at `components/ui/bottom_sheet.tsx` from Wave 1 onward. Migrated consumers switch their import path; un-migrated consumers continue to import from the unchanged legacy file. There is no dual-API on a single component and no flag-flip moment — two distinct files coexist until Wave 5 collapses them.

#### Wave 1 — Foundation (new primitive file + ConfirmSheet + mocks)

Files changed:
- `components/ui/bottom_sheet.tsx` — **new file**. The HeroUI-backed primitive with the `isOpen`/`onOpenChange` API (see §4.2). `components/ui/sheet.tsx` is NOT touched.
- `components/ui/confirm_sheet.tsx` — rebuilt to import from `@/components/ui/bottom_sheet`; `visible`/`onClose` → `isOpen`/`onOpenChange`.
- `screens/commitments/detail/components/skip_confirm_sheet.tsx` — updated to new `ConfirmSheet` API.
- `screens/commitments/edit_commitment/components/deactivate_sheet.tsx` — updated to new `ConfirmSheet` API.
- `__mocks__/@gorhom/bottom-sheet.tsx` — extend to add `BottomSheetTextInput` stub if used directly by any remaining consumer; confirm existing exports are still present.
- `__tests__/components/ui/sheet_snap_points.test.ts` — rewritten to import `resolveSnapPoints` from `@/components/ui/bottom_sheet` and call it as a pure function (no file-read string-matching).
- Add `__mocks__/heroui-native.tsx` (or extend existing) with a `BottomSheet` jest mock that satisfies the compound component shape, so tests that exercise components importing from `heroui-native` do not break.

At Wave 1 merge: `bottom_sheet.tsx` exists. `ConfirmSheet` and its two callers are on the new primitive. All other 11 sheets still import from the unchanged legacy `sheet.tsx`. App is green.

#### Wave 2 — Shared pickers

Files changed:
- `components/sheets/account_picker_sheet.tsx` — new file (moved + generalized from `screens/transactions/transaction_form/components/`). Imports `Sheet` from `@/components/ui/bottom_sheet` (exists since Wave 1).
- `components/sheets/category_picker_sheet.tsx` — new file (moved + generalized). Same import.
- Delete `screens/transactions/transaction_form/components/account_picker_sheet.tsx`.
- Delete `screens/transactions/transaction_form/components/category_picker_sheet.tsx`.
- Update 3 callers of each picker to import from `@/components/sheets/` (6 import-path changes).
- Both pickers use the new `Sheet` primitive internally (`isOpen`/`onOpenChange`).

At Wave 2 merge: the 2 pickers + ConfirmSheet are on the new primitive. 9 sheets still import from the unchanged legacy `sheet.tsx`.

#### Wave 3 — Transactions sheets

Files changed:
- `screens/transactions/components/date_range_sheet.tsx`
- `screens/transactions/filter/index.tsx`
- `screens/transactions/transaction_form/index.tsx`
- `screens/transactions/transaction_form/components/amount_hero.tsx` (uses `BottomSheetTextInput` directly; wire `useBottomSheetAwareHandlers`)
- `screens/transactions/transaction_form/components/transaction_form_body.tsx` (uses `BottomSheetScrollView` directly)

All migrated to import from `@/components/ui/bottom_sheet`. `visible`/`onClose` → `isOpen`/`onOpenChange` at each call site. Test files in `__tests__/screens/transactions/` updated if import paths changed.

#### Wave 4 — Accounts / budget / commitments sheets

Files changed:
- `screens/accounts/detail/components/adjust_balance_sheet.tsx`
- `screens/budget/components/set_budget_sheet.tsx`
- `screens/commitments/detail/components/pay_sheet.tsx`
- `screens/dashboard/components/net_worth_breakdown_sheet.tsx`
- `screens/settings/categories/components/add_edit_category_sheet.tsx`
- `screens/settings/categories/components/reassign_category_sheet.tsx`

All migrated to import from `@/components/ui/bottom_sheet`. Test files in `__tests__/screens/accounts/`, `__tests__/screens/` for adjust_balance, reassign, add_edit_category updated if import paths changed.

At Wave 4 merge: all 12 legacy `Sheet` consumers have migrated to `bottom_sheet.tsx`. The legacy `components/ui/sheet.tsx` still exists but has zero consumers.

#### Wave 5 — Cleanup and CLAUDE.md update

Files changed:
- Delete `components/ui/sheet.tsx` (the legacy hand-rolled wrapper — zero consumers after Wave 4).
- Rename `components/ui/bottom_sheet.tsx` → `components/ui/sheet.tsx` (`git mv`).
- Update every `@/components/ui/bottom_sheet` import across `components/sheets/`, `components/ui/confirm_sheet.tsx`, and all migrated screen sheets to `@/components/ui/sheet`. This is a mechanical search-and-replace; the component API is unchanged.
- Update `__tests__/components/ui/sheet_snap_points.test.ts` import from `bottom_sheet` → `sheet`.
- Update `CLAUDE.md` "Bottom Sheets" section: remove the migration note ("Migration note: `components/ui/sheet.tsx`… slated to migrate…") and replace with the authoritative new guidance reflecting the completed migration.
- Full-app device-QA gate (walked by the user — always escalated per critical trigger #8).

### 4.5 Section 4 — Bug-fix mapping

| Symptom class | Legacy root cause | HeroUI mechanism that fixes it |
|---|---|---|
| **Keyboard gap/jump on form sheets** | `keyboardBehavior="interactive"` on a fixed-snap sheet with no `android_keyboardInputMode="adjustResize"` — gorhom computed layout against the full window height on Android, producing a gap between the footer and keyboard | `keyboardBehavior="interactive"` + `keyboardBlurBehavior="restore"` + `android_keyboardInputMode="adjustResize"` baked into the new primitive; `useBottomSheetAwareHandlers()` wired onto any `Input` inside a sheet via `onFocus`/`onBlur` |
| **Close reliability (overlay / button / programmatic)** | Legacy wrapper used `sheetRef.current?.close()` for programmatic close and `BottomSheetBackdrop onPress={onClose}` for overlay. Gorhom v5 treats `index` as initial-only in many code paths — the imperative ref drove state but `onClose` only fired on swipe-down; overlay-press close did not reliably call `onClose`, leaving the `visible` prop and internal gorhom state out of sync | `BottomSheet isOpen + onOpenChange` fires on **all** close paths (swipe, overlay, close button, programmatic). No imperative ref. No state synchronization problem |
| **Scroll / gesture conflicts** | The legacy custom `BottomSheetBackdrop` with `onPress` could intercept gestures intended for scrollable content inside the sheet | `BottomSheet.Overlay isCloseOnPress={true}` (default) is handled at the HeroUI layer. Scrollables use gorhom's `BottomSheetScrollView`/`BottomSheetFlatList` with `enableOverDrag={false}` + `enableDynamicSizing={false}` + `contentContainerClassName="h-full"` — the scrollable has a bounded parent and scroll gestures are not absorbed by the sheet backdrop |
| **Wrong snap / sizing** | `enableDynamicSizing` defaulted to `false` correctly, but individual consumers could pass `enableDynamicSizing={true}` (opt-in) or omit `snapPoints`, causing the sheet to auto-size to content and silently ignore the preset. Dynamic sizing was a footgun | New primitive hard-codes `enableDynamicSizing={false}` on `BottomSheet.Content` with no opt-out. `scrollable={true}` bakes the correct companion props instead. Explicit `snapPoints` always take effect |

### 4.6 Section 5 — API change: `visible`/`onClose` → `isOpen`/`onOpenChange`

All 12 consumers of the legacy `Sheet` (and `ConfirmSheet`'s callers) are updated to the new API. There is no backward-compat shim.

**Why no shim:** A shim (`visible` → `isOpen`, `onClose` → `onOpenChange`) would preserve the legacy semantics at the call site, which means `onClose` continues to map to a callback that fires only on some close paths — exactly the close-reliability bug. The fix requires the caller to use `onOpenChange` and understand that it fires on all paths. A shim that silently maps `onClose` to `onOpenChange` would produce correct runtime behavior but confusing code (a prop named `onClose` that actually fires on all-paths). Reject. Rename everywhere.

Call-site change pattern:

```tsx
// Before
<Sheet visible={isOpen} onClose={() => setIsOpen(false)} size="md">

// After
<Sheet isOpen={isOpen} onOpenChange={setIsOpen} size="md">
```

For `ConfirmSheet`:

```tsx
// Before
<ConfirmSheet visible={visible} onCancel={onCancel} ... />

// After
<ConfirmSheet isOpen={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }} ... />
```

The new `ConfirmSheet` internally maps `onOpenChange(false)` to `onCancel()` so callers that cannot pass a full `onOpenChange` handler can still pass `onCancel`.

### 4.7 Section 6 — Test strategy

Policy: logic-only `.ts` tests; no `.tsx` render tests (see CLAUDE.md). Device-QA per wave is the render/interaction verification surface.

| Test file | Change |
|---|---|
| `__tests__/components/ui/sheet_snap_points.test.ts` | Rewritten in Wave 1: imports `resolveSnapPoints` from `@/components/ui/bottom_sheet` and asserts return values directly. Removes the file-read string-matching approach (that approach only worked because the snap values were inline literals; with a pure function they are directly testable and much cleaner). Import path updated to `@/components/ui/sheet` in Wave 5 after the promotion rename. |
| `__tests__/store/sheet_visibility.store.test.ts` | Unchanged. The store contract (`increment` / `decrement` / `reset` / `useAnySheetOpen`) is identical. |
| `__tests__/add_edit_category_sheet.state.test.ts` | Update import paths if any changed by Wave 4. Logic unchanged. |
| `__tests__/adjust_balance_sheet.state.test.ts` | Update import paths if any changed by Wave 4. Logic unchanged. |
| `__tests__/reassign_category_sheet.state.test.ts` | Update import paths if any changed by Wave 4. Logic unchanged. |
| `__tests__/screens/commitments_pay_sheet.hook.test.ts` | Update import paths if any changed by Wave 3/4. Logic unchanged. |
| `__tests__/screens/accounts/adjust_balance_validation.test.ts` | Update import paths if any changed by Wave 4. Logic unchanged. |
| `__mocks__/@gorhom/bottom-sheet.tsx` | Extend with `BottomSheetTextInput` stub (if needed by remaining direct uses in `amount_hero.tsx`). Confirm `BottomSheetScrollView`, `BottomSheetFlatList`, `BottomSheetFooter` stubs remain present. |
| `__mocks__/heroui-native.tsx` (new or extended) | Add `BottomSheet` compound component mock: `Root` (renders children, accepts `isOpen`/`onOpenChange`), `Portal` / `Overlay` / `Content` / `Close` / `Title` / `Description` as passthrough. Export `useBottomSheetAwareHandlers` as a no-op hook returning `{ onFocus: jest.fn(), onBlur: jest.fn() }`. |

No new `.tsx` test files. Real interaction verification happens at device-QA gates.

### 4.8 Risks and blast radius

**Critical-trigger class:** This is a high blast-radius PR series (critical trigger #3 — the legacy `Sheet` is referenced by every sheet in the app, and Wave 5 deletes the original `sheet.tsx` and renames the replacement into its path). Escalated to the user before plan-writing begins (spec sign-off gate).

**No new dependency:** `heroui-native` is already installed and `@gorhom/bottom-sheet` stays. Zero new packages.

**No native code change:** `expo prebuild` output is unaffected. The migration is pure TypeScript/TSX.

**Coexistence strategy:** `components/ui/sheet.tsx` (the legacy `visible`/`onClose` wrapper) is left byte-for-byte untouched from Wave 1 through Wave 4. The new HeroUI-backed primitive is created at `components/ui/bottom_sheet.tsx` in Wave 1 and exists alongside the legacy file. Migrated consumers switch their import path; un-migrated consumers continue to import from `sheet.tsx` unchanged. There is no dual-API on a single file and no compatibility shim. Wave 5 deletes `sheet.tsx` (zero consumers by then), renames `bottom_sheet.tsx` → `sheet.tsx`, and runs a mechanical import-path cleanup. At no wave boundary does the app have a broken import.

**Device-QA gates:** One per wave, always escalated. Sheets are rich gesture/animation surfaces; logic tests cannot substitute for walking real gestures on device.

**Android Fabric note:** The `android_keyboardInputMode="adjustResize"` prop is a gorhom-level prop forwarded through `BottomSheet.Content`. Confirmed compatible with New Architecture / Fabric via `@gorhom/bottom-sheet` v5 (which is the version already installed).

### 4.9 Folder layout

No new top-level directories. One new directory (`components/sheets/`). File state varies by wave:

**Waves 1–4 (transitional — two sheet files coexist):**

```
components/
  sheets/                       (new in Wave 2 — cross-cutting sheets, 2+ consumers)
    account_picker_sheet.tsx    (moved from screens/.../transaction_form/components/ in Wave 2)
    category_picker_sheet.tsx   (moved from screens/.../transaction_form/components/ in Wave 2)
  ui/
    sheet.tsx                   (UNCHANGED legacy wrapper — visible/onClose API; untouched Waves 1–4)
    bottom_sheet.tsx            (NEW in Wave 1 — HeroUI-backed primitive; isOpen/onOpenChange API)
    confirm_sheet.tsx           (rebuilt in Wave 1 to import from bottom_sheet.tsx)
```

**Wave 5 (canonical end state — single sheet file):**

```
components/
  sheets/
    account_picker_sheet.tsx    (import updated: bottom_sheet → sheet)
    category_picker_sheet.tsx   (import updated: bottom_sheet → sheet)
  ui/
    sheet.tsx                   (Wave 5: legacy deleted; bottom_sheet.tsx renamed here via git mv)
    confirm_sheet.tsx           (import updated: bottom_sheet → sheet)
```

All single-consumer sheets remain in their screen folders:

```
screens/
  accounts/detail/components/adjust_balance_sheet.tsx
  budget/components/set_budget_sheet.tsx
  commitments/detail/components/pay_sheet.tsx
  commitments/detail/components/skip_confirm_sheet.tsx    (ConfirmSheet caller)
  commitments/edit_commitment/components/deactivate_sheet.tsx  (ConfirmSheet caller)
  dashboard/components/net_worth_breakdown_sheet.tsx
  settings/categories/components/add_edit_category_sheet.tsx
  settings/categories/components/reassign_category_sheet.tsx
  transactions/components/date_range_sheet.tsx
  transactions/filter/index.tsx                          (filter sheet is the screen itself)
  transactions/transaction_form/index.tsx                (transaction form is the screen itself)
```

---

## 5. Open Questions

- **Q1 (low, implementation detail):** `sheet_snap_points.test.ts` currently reads the legacy `sheet.tsx` from disk as a string and asserts on inline literals. Wave 1 creates `bottom_sheet.tsx` which exports `resolveSnapPoints` as a proper pure function. Implementors should confirm the test is rewritten in Wave 1 to import from `bottom_sheet.tsx` (not deferred to Wave 5) so there is no window where the test is broken against the wrong file.

- **Q2 (low):** `ConfirmSheet` currently ignores `onClose` during `busy=true` by passing `() => {}` to `onClose`. The new primitive uses `onOpenChange`; the same guard must be applied: when `busy`, `onOpenChange` must be a no-op. Implementors should carry this forward explicitly.

- **Q3 (device-QA, always escalated):** The four symptom classes were confirmed by the product owner during brainstorming. Each wave's device-QA gate should walk all sheets in scope for that wave, specifically exercising: (a) overlay press close, (b) close-button press, (c) programmatic close via state, (d) keyboard appearance on form sheets, (e) scroll inside picker sheets. The user walks this matrix.

- **Q4 (future, not in scope):** After Wave 5, the `sheet_visibility.store` counter architecture remains correct but is now driven internally by the new `Sheet` primitive rather than by gorhom `onClose`. Stacked sheets (a sheet opened from inside another sheet, max depth 2 per the legacy doc comment) should be validated during Wave 3's device-QA (transaction form sheet opens pickers nested inside it).
