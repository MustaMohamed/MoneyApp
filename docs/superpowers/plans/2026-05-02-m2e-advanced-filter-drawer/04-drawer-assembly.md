# M2e Part 4 — Drawer Assembly

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-02-m2e-advanced-filter-drawer-design.md` §§ 6.1, 6.7, 6.9, 6.10

**Goal:** Add the `@react-native-community/datetimepicker` dependency, build the custom-date sub-sheet, the drawer animation, the orchestration hook (`useFilterDrawer`), and the `FilterDrawer` component itself which assembles everything.

**Tech Stack:** Expo, react-native-reanimated, `@react-native-community/datetimepicker`, MaterialCommunityIcons, Zustand v5.

**Prerequisites:** Parts 1, 3 complete.

---

## File Structure (this part)

| File | Purpose | Created/Modified |
|---|---|---|
| `package.json` / lockfile | Add `@react-native-community/datetimepicker` | Modified |
| `app/(app)/(tabs)/transactions/filter/components/filter_date_custom_picker.tsx` | Sub-sheet with from/to native date pickers | Created |
| `app/(app)/(tabs)/transactions/filter/filter.anim.ts` | Sheet open/close + Apply button press animations | Created |
| `app/(app)/(tabs)/transactions/filter/filter.hook.ts` | `useFilterDrawer` orchestration hook | Created |
| `app/(app)/(tabs)/transactions/filter/index.tsx` | `FilterDrawer` bottom sheet component | Created |

---

## Task 15: Add `@react-native-community/datetimepicker` dependency

**Files:**
- Modify: `package.json`, lockfile

The custom-date sub-sheet needs a native date picker. The Expo-recommended package is `@react-native-community/datetimepicker`; `npx expo install` resolves the version compatible with the project's Expo SDK.

- [ ] **Step 1: Install via expo**

Run: `npx expo install @react-native-community/datetimepicker`
Expected: Package added to dependencies, lockfile updated. The exact version is determined by Expo SDK 55 — let Expo pick.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(m2e): add @react-native-community/datetimepicker dependency"
```

---

## Task 16: `FilterDateCustomPicker` (sub-sheet with from/to date pickers)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/components/filter_date_custom_picker.tsx`

- [ ] **Step 1: Create the file**

```tsx
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  visible: boolean;
  initialFrom: string | undefined;
  initialTo: string | undefined;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
}

function isoToDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(d: Date | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FilterDateCustomPicker({
  visible,
  initialFrom,
  initialTo,
  onClose,
  onConfirm,
}: Props) {
  const [from, setFrom] = useState<Date | undefined>(isoToDate(initialFrom));
  const [to, setTo] = useState<Date | undefined>(isoToDate(initialTo));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const canConfirm = !!from && !!to && from <= to;

  function handleFromChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowFromPicker(false);
    if (selected) setFrom(selected);
  }

  function handleToChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowToPicker(false);
    if (selected) setTo(selected);
  }

  function handleConfirm() {
    if (canConfirm && from && to) {
      onConfirm(dateToIso(from), dateToIso(to));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={ms(22)} color={Colors.dark.text2} />
          </Pressable>
          <Text style={styles.title}>{Strings.filterCustomDateRangeTitle}</Text>
          <Pressable onPress={handleConfirm} disabled={!canConfirm} hitSlop={8}>
            <Text style={[styles.doneLabel, !canConfirm && styles.doneLabelDisabled]}>
              {Strings.filterPickerDone}
            </Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Pressable
            onPress={() => setShowFromPicker(true)}
            style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
          >
            <Text style={styles.fieldLabel}>{Strings.filterCustomFromLabel}</Text>
            <Text style={styles.fieldValue}>{formatDisplay(from) || '—'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowToPicker(true)}
            style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
          >
            <Text style={styles.fieldLabel}>{Strings.filterCustomToLabel}</Text>
            <Text style={styles.fieldValue}>{formatDisplay(to) || '—'}</Text>
          </Pressable>
        </View>

        {showFromPicker && (
          <DateTimePicker
            value={from ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleFromChange}
            maximumDate={to}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={to ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleToChange}
            minimumDate={from}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  doneLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  doneLabelDisabled: {
    color: Colors.dark.text2,
    opacity: 0.5,
  },
  body: { gap: Spacing.sm, paddingTop: Spacing.sm },
  field: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  fieldPressed: { opacity: 0.7 },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  fieldValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/components/filter_date_custom_picker.tsx
git commit -m "feat(m2e): add FilterDateCustomPicker with native date pickers"
```

---

## Task 17: `filter.anim.ts` — sheet animation

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/filter.anim.ts`

- [ ] **Step 1: Create the file**

This mirrors `transaction_form.anim.ts` (proven pattern) so the filter drawer feels identical to the existing add/edit transaction sheet.

```typescript
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useFilterDrawerAnim() {
  const sheetY = useSharedValue(1000);
  const overlay = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));

  function openSheet() {
    overlay.value = withTiming(1, { duration: 250 });
    sheetY.value = withSpring(0, { damping: 22, stiffness: 200 });
  }

  function closeSheet(onDone?: () => void) {
    overlay.value = withTiming(0, { duration: 200 });
    sheetY.value = withTiming(1000, { duration: 260 }, (finished) => {
      'worklet';
      if (finished && onDone) {
        runOnJS(onDone)();
      }
    });
  }

  return { sheetStyle, overlayStyle, openSheet, closeSheet };
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/filter.anim.ts
git commit -m "feat(m2e): add filter drawer open/close animation"
```

---

## Task 18: `filter.hook.ts` — orchestration

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/filter.hook.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useMemo } from 'react';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters, formatSelectionSummary } from './filter.helpers';
import { useFilterDrawerStore } from './filter.store';

/**
 * Orchestrates the filter drawer:
 *   - exposes draft state and setters from useFilterDrawerStore
 *   - reads account / category lists for sub-pickers
 *   - exposes derived display strings (selection summaries, active count)
 *   - provides applyDraft() which commits draft → applied + closes the sheet
 */
export function useFilterDrawer() {
  // Drawer store
  const visible = useFilterDrawerStore((s) => s.visible);
  const draft = useFilterDrawerStore((s) => s.draft);
  const accountPickerVisible = useFilterDrawerStore((s) => s.accountPickerVisible);
  const categoryPickerVisible = useFilterDrawerStore((s) => s.categoryPickerVisible);
  const customDatePickerVisible = useFilterDrawerStore((s) => s.customDatePickerVisible);

  const close = useFilterDrawerStore((s) => s.close);
  const resetDraft = useFilterDrawerStore((s) => s.resetDraft);
  const toggleAccountId = useFilterDrawerStore((s) => s.toggleAccountId);
  const toggleCategoryId = useFilterDrawerStore((s) => s.toggleCategoryId);
  const setDatePreset = useFilterDrawerStore((s) => s.setDatePreset);
  const setCustomDateRange = useFilterDrawerStore((s) => s.setCustomDateRange);
  const setAmountMin = useFilterDrawerStore((s) => s.setAmountMin);
  const setAmountMax = useFilterDrawerStore((s) => s.setAmountMax);
  const setAmountCurrency = useFilterDrawerStore((s) => s.setAmountCurrency);
  const setAccountPickerVisible = useFilterDrawerStore((s) => s.setAccountPickerVisible);
  const setCategoryPickerVisible = useFilterDrawerStore((s) => s.setCategoryPickerVisible);
  const setCustomDatePickerVisible = useFilterDrawerStore((s) => s.setCustomDatePickerVisible);

  // Domain data (filtered to non-archived accounts; categories shown in full)
  const allAccounts = useAccountStore((s) => s.accounts);
  const allCategories = useCategoryStore((s) => s.categories);

  const pickerAccounts = useMemo(
    () => allAccounts.filter((a) => a.is_archived === 0),
    [allAccounts],
  );
  const pickerCategories = allCategories;

  // Apply commits draft → applied
  const setAppliedFilters = useTransactionsScreenStore((s) => s.setAppliedFilters);
  function applyDraft() {
    setAppliedFilters(draft);
    close();
  }

  // Derived display values
  const selectedAccountSummary = useMemo(() => {
    const names = draft.accountIds
      .map((id) => allAccounts.find((a) => a.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllAccounts);
  }, [draft.accountIds, allAccounts]);

  const selectedCategorySummary = useMemo(() => {
    const names = draft.categoryIds
      .map((id) => allCategories.find((c) => c.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllCategories);
  }, [draft.categoryIds, allCategories]);

  const draftActiveCount = useMemo(() => countActiveFilters(draft), [draft]);

  return {
    // visibility
    visible,
    accountPickerVisible,
    categoryPickerVisible,
    customDatePickerVisible,

    // draft + setters
    draft,
    toggleAccountId,
    toggleCategoryId,
    setDatePreset,
    setCustomDateRange,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
    setAccountPickerVisible,
    setCategoryPickerVisible,
    setCustomDatePickerVisible,

    // lifecycle
    close,
    resetDraft,
    applyDraft,

    // domain data for sub-pickers
    pickerAccounts,
    pickerCategories,

    // derived
    selectedAccountSummary,
    selectedCategorySummary,
    draftActiveCount,
  };
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/filter.hook.ts
git commit -m "feat(m2e): add useFilterDrawer orchestration hook"
```

---

## Task 19: `FilterDrawer` (bottom sheet — `filter/index.tsx`)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/index.tsx`

- [ ] **Step 1: Create the file**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useFilterDrawer } from './filter.hook';
import { useFilterDrawerAnim } from './filter.anim';
import { FilterAccountPicker } from './components/filter_account_picker';
import { FilterAmountSection } from './components/filter_amount_section';
import { FilterCategoryPicker } from './components/filter_category_picker';
import { FilterDateCustomPicker } from './components/filter_date_custom_picker';
import { FilterDateSection } from './components/filter_date_section';
import { FilterSectionRow } from './components/filter_section_row';

export function FilterDrawer() {
  const f = useFilterDrawer();
  const { sheetStyle, overlayStyle, openSheet, closeSheet } = useFilterDrawerAnim();

  useEffect(() => {
    if (f.visible) openSheet();
  }, [f.visible]);

  if (!f.visible) return null;

  function handleClose() {
    closeSheet(f.close);
  }

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={Size.iconMd} color={Colors.dark.text2} />
          </Pressable>
          <Text style={styles.title}>{Strings.filterTitle}</Text>
          <Pressable onPress={f.resetDraft} hitSlop={8}>
            <Text style={styles.resetLabel}>{Strings.filterReset}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rowWrap}>
            <FilterSectionRow
              label={Strings.filterSectionAccounts}
              summary={f.selectedAccountSummary}
              isActive={f.draft.accountIds.length > 0}
              onPress={() => f.setAccountPickerVisible(true)}
            />
          </View>

          <View style={styles.rowWrap}>
            <FilterSectionRow
              label={Strings.filterSectionCategories}
              summary={f.selectedCategorySummary}
              isActive={f.draft.categoryIds.length > 0}
              onPress={() => f.setCategoryPickerVisible(true)}
            />
          </View>

          <FilterDateSection
            preset={f.draft.datePreset}
            customFrom={f.draft.customDateFrom}
            customTo={f.draft.customDateTo}
            onSelectPreset={f.setDatePreset}
            onOpenCustomPicker={() => f.setCustomDatePickerVisible(true)}
          />

          <FilterAmountSection
            currency={f.draft.amountCurrency}
            min={f.draft.amountMin}
            max={f.draft.amountMax}
            onChangeCurrency={f.setAmountCurrency}
            onChangeMin={f.setAmountMin}
            onChangeMax={f.setAmountMax}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={f.applyDraft}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaLabel}>
              {f.draftActiveCount > 0
                ? Strings.filterApplyWithCount(f.draftActiveCount)
                : Strings.filterApply}
            </Text>
          </Pressable>
        </View>

        <FilterAccountPicker
          visible={f.accountPickerVisible}
          accounts={f.pickerAccounts}
          selectedIds={f.draft.accountIds}
          onToggle={f.toggleAccountId}
          onClose={() => f.setAccountPickerVisible(false)}
        />

        <FilterCategoryPicker
          visible={f.categoryPickerVisible}
          categories={f.pickerCategories}
          selectedIds={f.draft.categoryIds}
          onToggle={f.toggleCategoryId}
          onClose={() => f.setCategoryPickerVisible(false)}
        />

        <FilterDateCustomPicker
          visible={f.customDatePickerVisible}
          initialFrom={f.draft.customDateFrom}
          initialTo={f.draft.customDateTo}
          onClose={() => f.setCustomDatePickerVisible(false)}
          onConfirm={(from, to) => {
            f.setCustomDateRange(from, to);
            f.setCustomDatePickerVisible(false);
          }}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 11,
    maxHeight: '85%',
  },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  resetLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.md, paddingBottom: Spacing.xl, paddingTop: Spacing.xs },
  rowWrap: { paddingHorizontal: Spacing.md },
  footer: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.surface,
  },
  cta: {
    height: Size.ctaHeight,
    backgroundColor: Colors.shared.cairoGold,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
```

Note: `FilterSectionRow` doesn't carry its own outer horizontal padding (it expects to be placed inside a horizontally-padded parent), so the rows are wrapped in `<View style={styles.rowWrap}>`. `FilterDateSection` and `FilterAmountSection` already include their own `paddingHorizontal: Spacing.md` internally.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/index.tsx
git commit -m "feat(m2e): add FilterDrawer bottom sheet assembling all sub-components"
```

---

## Part 4 — Definition of Done

- ✅ `@react-native-community/datetimepicker` installed via `npx expo install`.
- ✅ `FilterDateCustomPicker` renders both date pickers, disables Done until both dates picked, enforces `from <= to` via min/maxDate constraints.
- ✅ `filter.anim.ts` mirrors the proven `transaction_form.anim.ts` pattern.
- ✅ `useFilterDrawer` hook exposes draft state, setters, sub-picker visibility, derived display values (summaries, active count), and `applyDraft()`.
- ✅ `FilterDrawer` mounts overlay + sheet + 4 sections + 3 sub-sheets + footer Apply CTA; close button + backdrop tap dismiss.
- ✅ `npm run typecheck` clean.
- ✅ Each artifact committed independently.

Proceed to `05-wiring-verification.md`.
