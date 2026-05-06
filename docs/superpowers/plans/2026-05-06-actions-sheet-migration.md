# ActionSheet Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 6 custom Reanimated overlay sheets and native Modal pickers in the transactions flow with `react-native-actions-sheet`, matching the pattern already used by the other 6 ActionSheets in the codebase.

**Architecture:** All 6 components follow the same ref-based pattern: `useRef<ActionSheetRef>` + `useEffect([visible])` calling `show()`/`hide()`. The `EditTransactionSheet` adds a `savedRef` to distinguish cancel vs. save so the parent knows whether to reload. Filter pickers become nested ActionSheets inside the FilterDrawer ActionSheet.

**Tech Stack:** `react-native-actions-sheet@10.1.2` (already installed), `react-native-reanimated` (kept for `FadeInDown` entering animations in FilterDrawer content only)

---

## File Map

| File | Action |
|------|--------|
| `screens/transactions/transaction_form/index.tsx` | Rewrite — replace Reanimated overlay with ActionSheet for both Add and Edit sheets |
| `screens/transactions/transaction_form/transaction_form.anim.ts` | Delete |
| `screens/transactions/filter/components/filter_category_picker.tsx` | Rewrite — replace `<Modal>` with ActionSheet |
| `screens/transactions/filter/components/filter_account_picker.tsx` | Rewrite — replace `<Modal>` with ActionSheet |
| `screens/transactions/filter/components/filter_date_custom_picker.tsx` | Rewrite — replace `<Modal>` with ActionSheet |
| `screens/transactions/filter/index.tsx` | Rewrite — replace Reanimated overlay with ActionSheet |
| `screens/transactions/filter/filter.anim.ts` | Delete |

**Unchanged:** All `*.hook.ts`, `*.store.ts`, `*.state.ts` files. `TransactionFormBody`. The 6 existing ActionSheets. All 3 confirmation dialogs. Parent screens.

---

## Reference: Existing ActionSheet Pattern

Study `screens/transactions/transaction_form/components/account_picker_sheet.tsx` before starting. Every new sheet follows this exact pattern:

```tsx
const sheetRef = useRef<ActionSheetRef>(null);

useEffect(() => {
  if (visible) sheetRef.current?.show();
  else sheetRef.current?.hide();
}, [visible]);

return (
  <ActionSheet
    ref={sheetRef}
    onClose={onClose}
    gestureEnabled
    containerStyle={styles.sheet}
    indicatorStyle={styles.handle}
  >
    {/* content */}
  </ActionSheet>
);

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
});
```

---

## Task 1: Rewrite `transaction_form/index.tsx`

Replaces both `AddTransactionSheet` and `EditTransactionSheet` in one file. The Reanimated overlay + custom animation are gone. `EditSheetInner` gains `savedRef` to route between `onSaved` (reload) and `onClose` (no reload) when ActionSheet's `onClose` fires.

**Files:**
- Modify: `screens/transactions/transaction_form/index.tsx`

- [ ] **Step 1: Replace the file contents**

Write this exact content to `screens/transactions/transaction_form/index.tsx`:

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { Strings } from '@/constants/strings';
import { Colors, Radius } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useAddTransaction } from './add_transaction.hook';
import { useEditTransaction } from './edit_transaction.hook';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { TransactionFormBody } from './transaction_form_body';

const WINDOW_HEIGHT = Dimensions.get('window').height;

// ─── Add Transaction Sheet ────────────────────────────────────────────────────

interface AddProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: AddProps) {
  const sheetRef = useRef<ActionSheetRef>(null);
  const hide = useCallback(() => sheetRef.current?.hide(), []);
  const hook = useAddTransaction(hide);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <TransactionFormBody
        title={Strings.addTxTitle}
        locked={false}
        type={hook.state.type}
        onSelectType={hook.setType}
        amountStr={hook.state.amountStr}
        handleNumpad={hook.handleNumpad}
        amountError={hook.state.errors.amount}
        selectedAccount={hook.state.selectedAccount}
        onOpenAccountPicker={() => hook.setShowAccountPicker(true)}
        accountError={hook.state.errors.account}
        selectedToAccount={hook.state.selectedToAccount}
        onOpenToPicker={() => hook.setShowToPicker(true)}
        toAccountError={hook.state.errors.toAccount}
        selectedCategory={hook.state.selectedCategory}
        onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
        categoryError={hook.state.errors.category}
        isUSD={hook.state.isUSD}
        exchangeRate={hook.state.exchangeRate}
        setExchangeRate={hook.setExchangeRate}
        rateOverride={hook.state.rateOverride}
        toggleRateOverride={hook.toggleRateOverride}
        rateError={hook.state.errors.rate}
        date={hook.state.date}
        setDate={hook.setDate}
        time={hook.state.time}
        setTime={hook.setTime}
        note={hook.state.note}
        setNote={hook.setNote}
        saving={hook.state.saving}
        onClose={hide}
        handleSave={hook.handleSave}
      />

      <AccountPickerSheet
        visible={hook.state.showAccountPicker}
        title={
          hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle
        }
        accounts={hook.state.accountsForFrom}
        selectedId={hook.state.accountId}
        onSelect={hook.selectAccount}
        onClose={() => hook.setShowAccountPicker(false)}
      />
      <AccountPickerSheet
        visible={hook.state.showToPicker}
        title={Strings.addTxPickToTitle}
        accounts={hook.state.accountsForTo}
        selectedId={hook.state.toAccountId}
        excludeId={hook.state.accountId}
        onSelect={hook.selectToAccount}
        onClose={() => hook.setShowToPicker(false)}
      />
      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
      />
    </ActionSheet>
  );
}

// ─── Edit Transaction Sheet ───────────────────────────────────────────────────

interface EditProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  tx: Transaction | null;
}

export function EditTransactionSheet({ visible, onClose, onSaved, tx }: EditProps) {
  if (!tx) return null;
  return <EditSheetInner visible={visible} tx={tx} onClose={onClose} onSaved={onSaved} />;
}

// Inner component so useEditTransaction can be called with a guaranteed non-null tx.
// savedRef distinguishes a successful save from a cancel/gesture dismiss.
function EditSheetInner({
  visible,
  tx,
  onClose,
  onSaved,
}: {
  visible: boolean;
  tx: Transaction;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const sheetRef = useRef<ActionSheetRef>(null);
  const savedRef = useRef(false);

  const hide = useCallback(() => sheetRef.current?.hide(), []);

  const handleSaved = useCallback(() => {
    savedRef.current = true;
    sheetRef.current?.hide();
  }, []);

  const hook = useEditTransaction(tx, hide, handleSaved);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  function handleSheetClose() {
    if (savedRef.current) {
      savedRef.current = false;
      onSaved?.();
    } else {
      onClose();
    }
  }

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={handleSheetClose}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <TransactionFormBody
        title={Strings.editTxTitle}
        locked={true}
        type={hook.state.type}
        onSelectType={() => {}}
        amountStr={hook.state.amountStr}
        handleNumpad={hook.handleNumpad}
        amountError={hook.state.errors.amount}
        selectedAccount={hook.state.selectedAccount}
        onOpenAccountPicker={() => {}}
        accountError={undefined}
        selectedToAccount={hook.state.selectedToAccount}
        onOpenToPicker={() => {}}
        toAccountError={undefined}
        selectedCategory={hook.state.selectedCategory}
        onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
        categoryError={hook.state.errors.category}
        isUSD={hook.state.isUSD}
        exchangeRate={hook.state.exchangeRate}
        setExchangeRate={hook.setExchangeRate}
        rateOverride={hook.state.rateOverride}
        toggleRateOverride={hook.toggleRateOverride}
        rateError={hook.state.errors.rate}
        date={hook.state.date}
        setDate={hook.setDate}
        time={hook.state.time}
        setTime={hook.setTime}
        note={hook.state.note}
        setNote={hook.setNote}
        saving={hook.state.saving}
        onClose={hide}
        handleSave={hook.handleSave}
      />

      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
      />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: WINDOW_HEIGHT * 0.92,
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors related to `transaction_form/index.tsx`. (There will be a dangling import error about `transaction_form.anim` being missing — that's resolved in Task 2.)

- [ ] **Step 3: Commit**

```bash
git add screens/transactions/transaction_form/index.tsx
git commit -m "refactor: migrate AddTransactionSheet and EditTransactionSheet to ActionSheet"
```

---

## Task 2: Delete `transaction_form.anim.ts`

Nothing in the codebase imports `transaction_form.anim.ts` anymore (Task 1 removed the only import).

**Files:**
- Delete: `screens/transactions/transaction_form/transaction_form.anim.ts`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -r "transaction_form.anim" screens/ --include="*.ts" --include="*.tsx"
```

Expected: no output.

- [ ] **Step 2: Delete the file**

```bash
rm screens/transactions/transaction_form/transaction_form.anim.ts
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete transaction_form.anim.ts"
```

---

## Task 3: Migrate `FilterCategoryPicker`

Replaces `<Modal>` with `ActionSheet`. Removes the manual overlay `<Pressable>` and handle `<View>`. Inner content (header + FlatList) is unchanged.

**Files:**
- Modify: `screens/transactions/filter/components/filter_category_picker.tsx`

- [ ] **Step 1: Replace the file contents**

Write this exact content to `screens/transactions/filter/components/filter_category_picker.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Category } from '@/database/entities/category.entity';

interface Props {
  visible: boolean;
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function FilterCategoryPicker({
  visible,
  categories,
  selectedIds,
  onToggle,
  onClose,
}: Props) {
  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.filterPickCategoriesTitle}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.doneLabel}>{Strings.filterPickerDone}</Text>
        </Pressable>
      </View>
      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const checked = selectedIds.includes(item.id);
          const typeLabel =
            item.type === CategoryType.Income
              ? Strings.filterCategoryTypeIncome
              : Strings.filterCategoryTypeExpense;
          return (
            <Pressable
              onPress={() => onToggle(item.id)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '33' }]}>
                <MaterialCommunityIcons
                  name={item.icon as MCIName}
                  size={ms(18)}
                  color={item.color}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.caption}>{typeLabel}</Text>
              </View>
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && (
                  <MaterialCommunityIcons
                    name="check"
                    size={ms(14)}
                    color={Colors.shared.midnightBlue}
                  />
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
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
  sep: { height: 1, backgroundColor: Colors.dark.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  checkbox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(4),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions/filter/components/filter_category_picker.tsx
git commit -m "refactor: migrate FilterCategoryPicker to ActionSheet"
```

---

## Task 4: Migrate `FilterAccountPicker`

Same pattern as Task 3.

**Files:**
- Modify: `screens/transactions/filter/components/filter_account_picker.tsx`

- [ ] **Step 1: Replace the file contents**

Write this exact content to `screens/transactions/filter/components/filter_account_picker.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Account } from '@/database/entities/account.entity';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ACCOUNT_TYPE_ICON: Record<AccountType, MCIName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

function iconForAccountType(type: AccountType): MCIName {
  return ACCOUNT_TYPE_ICON[type] ?? 'bank';
}

interface Props {
  visible: boolean;
  accounts: Account[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

function formatBalance(balance: number, currency: string): string {
  return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(balance)} ${currency}`;
}

export function FilterAccountPicker({ visible, accounts, selectedIds, onToggle, onClose }: Props) {
  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.filterPickAccountsTitle}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.doneLabel}>{Strings.filterPickerDone}</Text>
        </Pressable>
      </View>
      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const checked = selectedIds.includes(item.id);
          return (
            <Pressable
              onPress={() => onToggle(item.id)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={iconForAccountType(item.type as AccountType)}
                  size={ms(20)}
                  color={checked ? Colors.shared.cairoGold : Colors.dark.text2}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.balance}>
                  {formatBalance(item.current_balance, item.currency)}
                </Text>
              </View>
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && (
                  <MaterialCommunityIcons
                    name="check"
                    size={ms(14)}
                    color={Colors.shared.midnightBlue}
                  />
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
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
  sep: { height: 1, backgroundColor: Colors.dark.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  iconContainer: { width: ms(24), alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  balance: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  checkbox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(4),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions/filter/components/filter_account_picker.tsx
git commit -m "refactor: migrate FilterAccountPicker to ActionSheet"
```

---

## Task 5: Migrate `FilterDateCustomPicker`

Same pattern. The `useEffect` that initializes date state from `initialFrom`/`initialTo` props is unchanged. The `DateTimePicker` native components inside remain unchanged.

**Files:**
- Modify: `screens/transactions/filter/components/filter_date_custom_picker.tsx`

- [ ] **Step 1: Replace the file contents**

Write this exact content to `screens/transactions/filter/components/filter_date_custom_picker.tsx`:

```tsx
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useFilterDateCustomPickerState } from './filter_date_custom_picker.state';

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
  const sheetRef = useRef<ActionSheetRef>(null);
  const {
    state: datePickerState,
    setFrom,
    setTo,
    setShowFromPicker,
    setShowToPicker,
    initialize,
  } = useFilterDateCustomPickerState(
    useShallow((s) => ({
      state: s.state,
      setFrom: s.setFrom,
      setTo: s.setTo,
      setShowFromPicker: s.setShowFromPicker,
      setShowToPicker: s.setShowToPicker,
      initialize: s.initialize,
    })),
  );

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    initialize(isoToDate(initialFrom), isoToDate(initialTo));
  }, [visible, initialFrom, initialTo, initialize]);

  const canConfirm =
    !!datePickerState.from && !!datePickerState.to && datePickerState.from <= datePickerState.to;

  function handleFromChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowFromPicker(false);
    if (selected) setFrom(selected);
  }

  function handleToChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowToPicker(false);
    if (selected) setTo(selected);
  }

  function handleConfirm() {
    if (canConfirm && datePickerState.from && datePickerState.to) {
      onConfirm(dateToIso(datePickerState.from), dateToIso(datePickerState.to));
    }
  }

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
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
          <Text style={styles.fieldValue}>{formatDisplay(datePickerState.from) || '—'}</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowToPicker(true)}
          style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
        >
          <Text style={styles.fieldLabel}>{Strings.filterCustomToLabel}</Text>
          <Text style={styles.fieldValue}>{formatDisplay(datePickerState.to) || '—'}</Text>
        </Pressable>
      </View>

      {datePickerState.showFromPicker && (
        <DateTimePicker
          value={datePickerState.from ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleFromChange}
          maximumDate={datePickerState.to}
        />
      )}
      {datePickerState.showToPicker && (
        <DateTimePicker
          value={datePickerState.to ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleToChange}
          minimumDate={datePickerState.from}
        />
      )}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
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
  doneLabelDisabled: { color: Colors.dark.text2, opacity: 0.5 },
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

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add screens/transactions/filter/components/filter_date_custom_picker.tsx
git commit -m "refactor: migrate FilterDateCustomPicker to ActionSheet"
```

---

## Task 6: Migrate `FilterDrawer` + delete `filter.anim.ts`

The `useFilterDrawerAnim` hook is removed entirely. The `applyStyle` animated wrapper around the CTA is removed (no bounce animation on apply tap). The `FadeInDown` entering animations on the scrollable content items stay — `Animated` and `FadeInDown` from `react-native-reanimated` remain imported. The manual overlay `<Animated.View>` and handle `<View>` are gone. The pickers (already migrated in Tasks 3–5) stay inside the ActionSheet content — they're nested ActionSheets and ActionSheet v10 supports this natively.

**Files:**
- Modify: `screens/transactions/filter/index.tsx`
- Delete: `screens/transactions/filter/filter.anim.ts`

- [ ] **Step 1: Replace `filter/index.tsx`**

Write this exact content to `screens/transactions/filter/index.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useFilterDrawer } from './filter.hook';
import { FilterAccountPicker } from './components/filter_account_picker';
import { FilterAmountSection } from './components/filter_amount_section';
import { FilterCategoryPicker } from './components/filter_category_picker';
import { FilterDateCustomPicker } from './components/filter_date_custom_picker';
import { FilterDateSection } from './components/filter_date_section';
import { FilterSectionRow } from './components/filter_section_row';

export function FilterDrawer() {
  const f = useFilterDrawer();
  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (f.state.visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [f.state.visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={f.close}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Pressable onPress={() => sheetRef.current?.hide()} hitSlop={8}>
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
        <Animated.View entering={FadeInDown.duration(250)} style={styles.rowWrap}>
          <FilterSectionRow
            label={Strings.filterSectionAccounts}
            summary={f.state.selectedAccountSummary}
            isActive={f.state.draft.accountIds.length > 0}
            onPress={() => f.setAccountPickerVisible(true)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(250)} style={styles.rowWrap}>
          <FilterSectionRow
            label={Strings.filterSectionCategories}
            summary={f.state.selectedCategorySummary}
            isActive={f.state.draft.categoryIds.length > 0}
            onPress={() => f.setCategoryPickerVisible(true)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(250)}>
          <FilterDateSection
            preset={f.state.draft.datePreset}
            customFrom={f.state.draft.customDateFrom}
            customTo={f.state.draft.customDateTo}
            onSelectPreset={f.setDatePreset}
            onOpenCustomPicker={() => f.setCustomDatePickerVisible(true)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(250)}>
          <FilterAmountSection
            currency={f.state.draft.amountCurrency}
            min={f.state.draft.amountMin}
            max={f.state.draft.amountMax}
            onChangeCurrency={f.setAmountCurrency}
            onChangeMin={f.setAmountMin}
            onChangeMax={f.setAmountMax}
          />
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={f.applyDraft}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaLabel}>
            {f.state.draftActiveCount > 0
              ? Strings.filterApplyWithCount(f.state.draftActiveCount)
              : Strings.filterApply}
          </Text>
        </Pressable>
      </View>

      <FilterAccountPicker
        visible={f.state.accountPickerVisible}
        accounts={f.state.pickerAccounts}
        selectedIds={f.state.draft.accountIds}
        onToggle={f.toggleAccountId}
        onClose={() => f.setAccountPickerVisible(false)}
      />

      <FilterCategoryPicker
        visible={f.state.categoryPickerVisible}
        categories={f.state.pickerCategories}
        selectedIds={f.state.draft.categoryIds}
        onToggle={f.toggleCategoryId}
        onClose={() => f.setCategoryPickerVisible(false)}
      />

      <FilterDateCustomPicker
        visible={f.state.customDatePickerVisible}
        initialFrom={f.state.draft.customDateFrom}
        initialTo={f.state.draft.customDateTo}
        onClose={() => f.setCustomDatePickerVisible(false)}
        onConfirm={(from, to) => {
          f.setCustomDateRange(from, to);
          f.setCustomDatePickerVisible(false);
        }}
      />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
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

- [ ] **Step 2: Confirm `filter.anim.ts` has no remaining imports**

```bash
grep -r "filter.anim" screens/ --include="*.ts" --include="*.tsx"
```

Expected: no output.

- [ ] **Step 3: Delete `filter.anim.ts`**

```bash
rm screens/transactions/filter/filter.anim.ts
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: migrate FilterDrawer to ActionSheet, delete filter.anim.ts"
```

---

## Post-Migration Verification

- [ ] Run the app: `npx expo start`
- [ ] **Add transaction:** tap FAB → sheet slides up → fill form → save → sheet closes, transaction appears in list
- [ ] **Add transaction cancel:** tap FAB → sheet slides up → tap X or swipe down → sheet closes, no transaction added
- [ ] **Edit transaction:** open any transaction → tap Edit → edit sheet opens pre-filled → change category → save → sheet closes, detail reloads with updated data
- [ ] **Edit transaction cancel:** open edit sheet → swipe down → sheet closes, detail does NOT reload
- [ ] **Filter drawer:** tap filter button → drawer slides up → tap Accounts → account picker slides up → select accounts → tap Done → account picker closes, drawer still open → tap Apply → drawer closes, transactions filtered
- [ ] **Filter custom date:** open filter drawer → select Custom in date section → date picker slides up → pick from/to dates → confirm → date picker closes
- [ ] **Android back:** with add-transaction sheet open, press hardware back → sheet closes (not app navigates)
- [ ] No Reanimated imports remain in `transaction_form/index.tsx` or `filter/index.tsx`

```bash
grep -n "react-native-reanimated" screens/transactions/transaction_form/index.tsx screens/transactions/filter/index.tsx
```

Expected: only `filter/index.tsx` has it (for `FadeInDown`). `transaction_form/index.tsx` has none.
