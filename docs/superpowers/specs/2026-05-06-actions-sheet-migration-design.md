# ActionSheet Migration Design

**Date:** 2026-05-06  
**Status:** Approved

## Overview

Migrate 6 custom Reanimated overlay sheets and Native Modal pickers in the transactions flow to `react-native-actions-sheet@10.1.2`, which is already installed and used by 6 other ActionSheets in the codebase. This eliminates two bespoke animation files and makes all overlay surfaces consistent.

---

## Scope

### Migrated (6 components)

| Component | Current pattern | Location |
|-----------|----------------|----------|
| `AddTransactionSheet` | Custom Reanimated slide-up overlay | `screens/transactions/transaction_form/index.tsx` |
| `EditTransactionSheet` | Custom Reanimated slide-up overlay | `screens/transactions/transaction_form/index.tsx` |
| `FilterDrawer` | Custom Reanimated slide-up overlay | `screens/transactions/filter/index.tsx` |
| `FilterCategoryPicker` | `<Modal>` native modal | `screens/transactions/filter/components/filter_category_picker.tsx` |
| `FilterAccountPicker` | `<Modal>` native modal | `screens/transactions/filter/components/filter_account_picker.tsx` |
| `FilterDateCustomPicker` | `<Modal>` native modal | `screens/transactions/filter/components/filter_date_custom_picker.tsx` |

### Deleted

- `screens/transactions/transaction_form/transaction_form.anim.ts`
- `screens/transactions/filter/filter.anim.ts`

### Unchanged

- All hooks, stores, and state files
- `TransactionFormBody` component (pure form, no overlay logic)
- All 6 existing ActionSheets elsewhere in the app
- All 3 confirmation dialogs (delete account, delete category, delete transaction)

---

## Visibility Pattern

All 6 components share the same pattern already used by the 6 existing ActionSheets in the codebase:

```tsx
const sheetRef = useRef<ActionSheetRef>(null);

useEffect(() => {
  if (visible) sheetRef.current?.show();
  else sheetRef.current?.hide();
}, [visible]);

return (
  <ActionSheet ref={sheetRef} onClose={onClose} gestureEnabled ...>
    {/* content */}
  </ActionSheet>
);
```

The component stays mounted at all times. The `visible` prop drives show/hide imperatively via the ref. The ActionSheet's `onClose` callback fires on gesture dismiss or backdrop tap and calls the parent's close handler (which sets `visible=false` via Zustand).

---

## Per-Component Decisions

### AddTransactionSheet

- **Ref type:** `ActionSheetRef`
- **Callbacks:** single `onClose: () => void`
- **Height:** `containerStyle={{ height: WINDOW_HEIGHT * 0.92 }}`
- **Gesture:** default ActionSheet gesture and backdrop close, calls `onClose`
- **No savedRef needed:** add-transaction has no concept of "saved vs cancelled" from the sheet's perspective; the parent manages its own state via the store.

### EditTransactionSheet / EditSheetInner

- **Ref type:** `ActionSheetRef`
- **Callbacks:** `onClose: () => void` (cancel path, no reload) and `onSaved?: () => void` (save path, triggers reload in parent)
- **savedRef pattern:** `EditSheetInner` holds `savedRef = useRef(false)`. The hook's internal `onSaved` arg sets `savedRef.current = true` then calls `sheetRef.current?.hide()`. ActionSheet's `onClose` event checks `savedRef.current`: if true, calls parent `onSaved`; if false, calls parent `onClose`. `savedRef` resets to `false` on `onClose` so the next open starts clean.
- **Height:** `containerStyle={{ height: WINDOW_HEIGHT * 0.92 }}`

### FilterDrawer

- **Ref type:** `ActionSheetRef`
- **Callbacks:** single `onClose: () => void` (syncs Zustand `FilterDrawerState.close()`)
- **Height:** `maxHeight: '85%'` (uses ActionSheet's percentage prop)
- **Handle:** remove the manual `<View style={styles.handle} />` — ActionSheet renders its own handle bar
- **Nested pickers:** v10 supports nested ActionSheets natively; `FilterCategoryPicker`, `FilterAccountPicker`, and `FilterDateCustomPicker` live inside `FilterDrawer`'s content as before. No layout changes to the inner content.

### FilterCategoryPicker / FilterAccountPicker / FilterDateCustomPicker

- **Ref type:** `ActionSheetRef`
- **Callbacks:** `onClose` (or equivalent dismiss) syncs parent picker visibility in `FilterDrawerState`
- **Height:** `maxHeight: '70%'`
- **Remove:** manual backdrop `<Pressable>` and manual `<View style={styles.handle} />` — ActionSheet provides both
- **Mount pattern:** always mounted inside `FilterDrawer`'s content; `useEffect([visible])` calls show/hide via ref, driven by the relevant `FilterDrawerState` picker-visible flag

---

## What Does Not Change

- `useFilterDrawerState`, `useTransactionsScreenStore`, `useAddTransactionState`, `useAddTransactionStore`, `useEditTransactionState`, `useEditTransactionStore` — no changes
- `TransactionFormBody` — no changes
- Parent screens (`screens/transactions/index.tsx`, `screens/transactions/detail/index.tsx`) — no changes to their logic; only the sheet components they render change internally
- ActionSheet usage pattern — no central registration required; components use `ActionSheet` directly, same as all 6 existing sheets

---

## Styling Notes

- Remove all `position: 'absolute'`, `zIndex`, `elevation` styles from the 6 components — ActionSheet handles stacking
- Remove all `Animated.*` imports and usage from the 6 components
- Keep all inner content styles (form fields, list items, typography) unchanged
- `containerStyle` is the primary sizing mechanism; `gestureEnabled` defaults to `true`

---

## Testing Checklist

- Add transaction sheet opens, submits successfully, closes
- Add transaction sheet dismisses via gesture/backdrop without submitting
- Edit transaction sheet opens pre-filled, saves → parent reloads detail
- Edit transaction sheet dismisses via gesture/backdrop → no reload
- Filter drawer opens, nested pickers open without closing drawer, filters apply
- Filter drawer closes on backdrop tap / gesture
- Android hardware back closes open sheet (existing `BackHandler` in `transactions/index.tsx` remains)
- No Reanimated `transaction_form.anim.ts` or `filter.anim.ts` imports remain
