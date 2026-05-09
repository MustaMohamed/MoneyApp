# Commitment Form Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make RHF the single source of truth for all commitment form state, collapsing 5 Zustand stores to 3 and reducing `CommitmentFormBody` from 18 props to 7.

**Architecture:** Add `amount_type` to the RHF schema, replace the `createSchema(amountType, durationType)` factory with a single static schema where `superRefine` reads `data.amount_type` and `data.duration_type` directly. Extract shared schema/types/utilities into `commitment_form.shared.ts`. `CommitmentFormBody` reads everything from the form via `form.watch()` and manages its own local state internally.

**Tech Stack:** React Native (Expo Go), TypeScript strict, React Hook Form v7 + Zod v4, Zustand v5, Expo Router v3.

---

## File Map

| Status | File | Change |
|---|---|---|
| **Create** | `screens/commitments/commitment_form.shared.ts` | Static schema, `CommitmentFormValues` type, `PRESET_MAP`, `buildAddDefaults`, `buildEditDefaults`, `detectPreset` |
| **Create** | `__tests__/commitment_form_shared.test.ts` | Tests for schema validation, `detectPreset`, `buildAddDefaults`, `buildEditDefaults` |
| **Modify** | `screens/commitments/components/commitment_form_body.state.ts` | Add `categoryPickerVisible` + `accountPickerVisible` |
| **Modify** | `screens/commitments/components/commitment_form_body.tsx` | 18 props → 7; internalize all handlers and state |
| **Modify** | `screens/commitments/components/recurrence_picker.tsx` | Re-point `CommitmentFormValues` import to shared module |
| **Modify** | `screens/commitments/components/duration_picker.tsx` | Re-point `CommitmentFormValues` import to shared module |
| **Modify** | `screens/commitments/add_commitment/add_commitment.hook.ts` | Import from shared; drop store; simplified return |
| **Modify** | `screens/commitments/add_commitment/add_commitment.state.ts` | Shrink to `{ saving: boolean }` |
| **Modify** | `screens/commitments/add_commitment/index.tsx` | 5-prop call site |
| **Delete** | `screens/commitments/add_commitment/add_commitment.store.ts` | Replaced by RHF form field |
| **Modify** | `screens/commitments/edit_commitment/edit_commitment.hook.ts` | Import from shared; drop store; simplified return |
| **Modify** | `screens/commitments/edit_commitment/edit_commitment.state.ts` | Shrink to `{ saving, deactivateDialogVisible }` |
| **Modify** | `screens/commitments/edit_commitment/index.tsx` | 5-prop call site + deactivate |
| **Delete** | `screens/commitments/edit_commitment/edit_commitment.store.ts` | Replaced by RHF form field |

---

## Task 1: Create shared module `commitment_form.shared.ts`

**Files:**
- Create: `screens/commitments/commitment_form.shared.ts`
- Create: `__tests__/commitment_form_shared.test.ts`

### Step 1 — Write the failing tests

Create `__tests__/commitment_form_shared.test.ts`:

```ts
import {
  COMMITMENT_SCHEMA,
  buildAddDefaults,
  buildEditDefaults,
  detectPreset,
} from '@/screens/commitments/commitment_form.shared';
import {
  AmountType,
  Currency,
  DurationType,
  RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import type { Commitment } from '@/database/entities/commitment.entity';

const VALID_BASE = {
  amount_type: AmountType.Fixed,
  name: 'Rent',
  amount: 5000,
  currency: Currency.EGP,
  category_id: 'cat-1',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2024-01-01',
  duration_type: DurationType.Forever,
};

const MOCK_COMMITMENT: Commitment = {
  id: 'c-1',
  name: 'Rent',
  amount_type: AmountType.Fixed,
  amount: 5000,
  currency: Currency.EGP,
  category_id: 'cat-1',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2024-01-01',
  account_id: null,
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('COMMITMENT_SCHEMA', () => {
  it('passes for valid Fixed commitment', () => {
    expect(COMMITMENT_SCHEMA.safeParse(VALID_BASE).success).toBe(true);
  });

  it('fails when Fixed has no amount', () => {
    const result = COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, amount: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes('amount'))).toBe(true);
    }
  });

  it('passes when Variable has no amount', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      amount_type: AmountType.Variable,
      amount: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('fails when UntilDate has no end_date', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      duration_type: DurationType.UntilDate,
      end_date: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes('end_date'))).toBe(true);
    }
  });

  it('passes when UntilDate has end_date', () => {
    expect(
      COMMITMENT_SCHEMA.safeParse({
        ...VALID_BASE,
        duration_type: DurationType.UntilDate,
        end_date: '2025-12-31',
      }).success,
    ).toBe(true);
  });

  it('fails when AfterCount has no end_after_count', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      duration_type: DurationType.AfterCount,
      end_after_count: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes('end_after_count'))).toBe(true);
    }
  });

  it('passes when AfterCount has end_after_count', () => {
    expect(
      COMMITMENT_SCHEMA.safeParse({
        ...VALID_BASE,
        duration_type: DurationType.AfterCount,
        end_after_count: 12,
      }).success,
    ).toBe(true);
  });

  it('fails when name is empty', () => {
    expect(COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, name: '' }).success).toBe(false);
  });

  it('fails when category_id is empty', () => {
    expect(COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, category_id: '' }).success).toBe(false);
  });
});

describe('detectPreset', () => {
  it('returns Monthly for every=1, Months', () => {
    expect(detectPreset(1, RecurrencePeriod.Months)).toBe(RecurrencePreset.Monthly);
  });
  it('returns Weekly for every=1, Weeks', () => {
    expect(detectPreset(1, RecurrencePeriod.Weeks)).toBe(RecurrencePreset.Weekly);
  });
  it('returns Annually for every=1, Years', () => {
    expect(detectPreset(1, RecurrencePeriod.Years)).toBe(RecurrencePreset.Annually);
  });
  it('returns Custom for every=2, Months', () => {
    expect(detectPreset(2, RecurrencePeriod.Months)).toBe(RecurrencePreset.Custom);
  });
  it('returns Custom for every=1, Days', () => {
    expect(detectPreset(1, RecurrencePeriod.Days)).toBe(RecurrencePreset.Custom);
  });
});

describe('buildAddDefaults', () => {
  it('returns Fixed amount_type', () => {
    expect(buildAddDefaults().amount_type).toBe(AmountType.Fixed);
  });
  it('returns Forever duration_type', () => {
    expect(buildAddDefaults().duration_type).toBe(DurationType.Forever);
  });
  it('returns EGP currency', () => {
    expect(buildAddDefaults().currency).toBe(Currency.EGP);
  });
  it('returns today as start_date', () => {
    expect(buildAddDefaults().start_date).toBe(new Date().toISOString().slice(0, 10));
  });
  it('returns undefined amount', () => {
    expect(buildAddDefaults().amount).toBeUndefined();
  });
});

describe('buildEditDefaults', () => {
  it('maps all fields from entity', () => {
    const d = buildEditDefaults(MOCK_COMMITMENT);
    expect(d.name).toBe('Rent');
    expect(d.amount_type).toBe(AmountType.Fixed);
    expect(d.amount).toBe(5000);
    expect(d.currency).toBe(Currency.EGP);
    expect(d.category_id).toBe('cat-1');
    expect(d.duration_type).toBe(DurationType.Forever);
    expect(d.start_date).toBe('2024-01-01');
  });
  it('converts null amount to undefined', () => {
    expect(buildEditDefaults({ ...MOCK_COMMITMENT, amount: null }).amount).toBeUndefined();
  });
  it('converts null account_id to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).account_id).toBeUndefined();
  });
  it('converts null notes to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).notes).toBeUndefined();
  });
  it('converts null end_date to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).end_date).toBeUndefined();
  });
  it('converts null end_after_count to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).end_after_count).toBeUndefined();
  });
});
```

- [ ] **Step 2 — Run tests to confirm they fail**

```bash
npm run test:coverage -- --testPathPattern="commitment_form_shared" --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '@/screens/commitments/commitment_form.shared'`

- [ ] **Step 3 — Implement `commitment_form.shared.ts`**

Create `screens/commitments/commitment_form.shared.ts`:

```ts
import { z } from 'zod';

import {
  AmountType,
  Currency,
  DurationType,
  RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Commitment } from '@/database/entities/commitment.entity';

export const COMMITMENT_SCHEMA = z
  .object({
    amount_type: z.nativeEnum(AmountType),
    name: z
      .string()
      .min(1, Strings.commitmentsErrNameRequired)
      .max(50, Strings.commitmentsErrNameMax),
    amount: z
      .number({ error: Strings.commitmentsErrAmountRequired })
      .positive(Strings.commitmentsErrAmountPositive)
      .optional(),
    currency: z.nativeEnum(Currency),
    category_id: z.string().min(1, Strings.commitmentsErrCategoryRequired),
    recurrence_every: z
      .number()
      .int()
      .min(1, Strings.commitmentsErrEveryMin)
      .max(365, Strings.commitmentsErrEveryMax),
    recurrence_period: z.nativeEnum(RecurrencePeriod),
    start_date: z.string().min(1, Strings.commitmentsErrStartDateRequired),
    account_id: z.string().optional(),
    notes: z.string().optional(),
    duration_type: z.nativeEnum(DurationType),
    end_date: z.string().optional(),
    end_after_count: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.amount_type === AmountType.Fixed && !data.amount) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrAmountRequired,
        path: ['amount'],
      });
    }
    if (data.duration_type === DurationType.UntilDate && !data.end_date) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrEndDateRequired,
        path: ['end_date'],
      });
    }
    if (data.duration_type === DurationType.AfterCount && !data.end_after_count) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrAfterCountRequired,
        path: ['end_after_count'],
      });
    }
  });

export type CommitmentFormValues = z.infer<typeof COMMITMENT_SCHEMA>;

export const PRESET_MAP: Record<
  RecurrencePreset,
  { every: number; period: RecurrencePeriod } | null
> = {
  [RecurrencePreset.Monthly]: { every: 1, period: RecurrencePeriod.Months },
  [RecurrencePreset.Weekly]: { every: 1, period: RecurrencePeriod.Weeks },
  [RecurrencePreset.Annually]: { every: 1, period: RecurrencePeriod.Years },
  [RecurrencePreset.Custom]: null,
};

export function buildAddDefaults(): CommitmentFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    amount_type: AmountType.Fixed,
    name: '',
    amount: undefined,
    currency: Currency.EGP,
    category_id: '',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: today,
    account_id: undefined,
    notes: undefined,
    duration_type: DurationType.Forever,
    end_date: undefined,
    end_after_count: undefined,
  };
}

export function buildEditDefaults(c: Commitment): CommitmentFormValues {
  return {
    amount_type: c.amount_type,
    name: c.name,
    amount: c.amount ?? undefined,
    currency: c.currency,
    category_id: c.category_id,
    recurrence_every: c.recurrence_every,
    recurrence_period: c.recurrence_period,
    start_date: c.start_date,
    account_id: c.account_id ?? undefined,
    notes: c.notes ?? undefined,
    duration_type: c.duration_type,
    end_date: c.end_date ?? undefined,
    end_after_count: c.end_after_count ?? undefined,
  };
}

export function detectPreset(every: number, period: RecurrencePeriod): RecurrencePreset {
  if (every === 1 && period === RecurrencePeriod.Months) return RecurrencePreset.Monthly;
  if (every === 1 && period === RecurrencePeriod.Weeks) return RecurrencePreset.Weekly;
  if (every === 1 && period === RecurrencePeriod.Years) return RecurrencePreset.Annually;
  return RecurrencePreset.Custom;
}
```

- [ ] **Step 4 — Run tests to confirm they pass**

```bash
npm run test:coverage -- --testPathPattern="commitment_form_shared" --no-coverage 2>&1 | tail -20
```

Expected: All 21 tests pass.

- [ ] **Step 5 — Commit**

```bash
git add screens/commitments/commitment_form.shared.ts __tests__/commitment_form_shared.test.ts
git commit -m "feat: add commitment_form.shared — static schema, types, defaults, preset utils"
```

---

## Task 2: Expand form body state + fix sub-component imports

**Files:**
- Modify: `screens/commitments/components/commitment_form_body.state.ts`
- Modify: `screens/commitments/components/recurrence_picker.tsx`
- Modify: `screens/commitments/components/duration_picker.tsx`

- [ ] **Step 1 — Expand `commitment_form_body.state.ts`**

Replace the entire file with:

```ts
import { create } from 'zustand';

interface CommitmentFormBodyStateShape {
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
  showStartDatePicker: boolean;
  showEndDatePicker: boolean;
}

interface CommitmentFormBodyState {
  state: CommitmentFormBodyStateShape;
  setCategoryPickerVisible: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setShowStartDatePicker: (v: boolean) => void;
  setShowEndDatePicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CommitmentFormBodyStateShape = {
  categoryPickerVisible: false,
  accountPickerVisible: false,
  showStartDatePicker: false,
  showEndDatePicker: false,
};

export const useCommitmentFormBodyState = create<CommitmentFormBodyState>((set) => ({
  state: INITIAL_STATE,
  setCategoryPickerVisible: (v) => set((s) => ({ state: { ...s.state, categoryPickerVisible: v } })),
  setAccountPickerVisible: (v) => set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
  setShowStartDatePicker: (v) => set((s) => ({ state: { ...s.state, showStartDatePicker: v } })),
  setShowEndDatePicker: (v) => set((s) => ({ state: { ...s.state, showEndDatePicker: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2 — Fix `recurrence_picker.tsx` import**

Change line 8 from:
```ts
import type { CommitmentFormValues } from '../add_commitment/add_commitment.hook';
```
to:
```ts
import type { CommitmentFormValues } from '../commitment_form.shared';
```

- [ ] **Step 3 — Fix `duration_picker.tsx` import**

Change line 12 from:
```ts
import type { CommitmentFormValues } from '../add_commitment/add_commitment.hook';
```
to:
```ts
import type { CommitmentFormValues } from '../commitment_form.shared';
```

- [ ] **Step 4 — Run full test suite to confirm no regressions**

```bash
npm run test:coverage 2>&1 | tail -30
```

Expected: All tests pass, coverage thresholds met (80% lines / 95% functions / 100% branches).

- [ ] **Step 5 — Commit**

```bash
git add screens/commitments/components/commitment_form_body.state.ts \
        screens/commitments/components/recurrence_picker.tsx \
        screens/commitments/components/duration_picker.tsx
git commit -m "refactor: expand form body state, re-point sub-component imports to shared module"
```

---

## Task 3: Refactor `CommitmentFormBody` to 7 props + update both screen index files

**Files:**
- Modify: `screens/commitments/components/commitment_form_body.tsx`
- Modify: `screens/commitments/add_commitment/index.tsx`
- Modify: `screens/commitments/edit_commitment/index.tsx`

- [ ] **Step 1 — Replace `commitment_form_body.tsx`**

Replace the entire file with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency, DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatLongDate } from '@/utils/format_date';
import { CategoryPickerSheet } from '@/screens/transactions/transaction_form/components/category_picker_sheet';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import {
  type CommitmentFormValues,
  PRESET_MAP,
  detectPreset,
} from '../commitment_form.shared';
import { RecurrencePicker } from './recurrence_picker';
import { DurationPicker } from './duration_picker';
import { useCommitmentFormBodyState } from './commitment_form_body.state';

const CHIP_ACTIVE_BG = Colors.shared.cairoGold + '22';
const CURRENCIES: Currency[] = [Currency.EGP, Currency.USD];
const AMOUNT_TYPES: { key: AmountType; label: string }[] = [
  { key: AmountType.Fixed, label: Strings.commitmentsAmountFixed },
  { key: AmountType.Variable, label: Strings.commitmentsAmountVariable },
];

interface CommitmentFormBodyProps {
  form: UseFormReturn<CommitmentFormValues>;
  categories: Category[];
  accounts: Account[];
  saving: boolean;
  onSubmit: () => void;
  title: string;
  locked?: boolean;
}

export function CommitmentFormBody({
  form,
  categories,
  accounts,
  saving,
  onSubmit,
  title,
  locked,
}: CommitmentFormBodyProps) {
  const amountType = form.watch('amount_type');
  const currency = form.watch('currency');
  const start_date = form.watch('start_date');
  const durationType = form.watch('duration_type');
  const recurrenceEvery = form.watch('recurrence_every');
  const recurrencePeriod = form.watch('recurrence_period');
  const categoryId = form.watch('category_id');
  const accountId = form.watch('account_id');
  const recurrencePreset = detectPreset(recurrenceEvery, recurrencePeriod);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );

  const {
    state: bodyState,
    setCategoryPickerVisible,
    setAccountPickerVisible,
    setShowStartDatePicker,
    setShowEndDatePicker,
  } = useCommitmentFormBodyState(
    useShallow((s) => ({
      state: s.state,
      setCategoryPickerVisible: s.setCategoryPickerVisible,
      setAccountPickerVisible: s.setAccountPickerVisible,
      setShowStartDatePicker: s.setShowStartDatePicker,
      setShowEndDatePicker: s.setShowEndDatePicker,
    })),
  );

  useEffect(() => () => useCommitmentFormBodyState.getState().reset(), []);

  const errors = {
    name: form.formState.errors.name?.message,
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.category_id?.message,
    start_date: form.formState.errors.start_date?.message,
    notes: form.formState.errors.notes?.message,
  };

  const startDateAsDate = start_date ? new Date(start_date + 'T00:00:00') : new Date();
  const formattedStartDate = start_date
    ? formatLongDate(start_date)
    : Strings.commitmentDateInputFormat;

  function handleAmountTypeChange(v: AmountType) {
    form.setValue('amount_type', v);
    if (v === AmountType.Variable) form.setValue('amount', undefined);
  }

  function handleRecurrencePresetChange(preset: ReturnType<typeof detectPreset>) {
    const mapped = PRESET_MAP[preset];
    if (mapped) {
      form.setValue('recurrence_every', mapped.every);
      form.setValue('recurrence_period', mapped.period);
    }
  }

  function handleDurationTypeChange(type: DurationType) {
    form.setValue('duration_type', type);
    if (type !== DurationType.UntilDate) form.setValue('end_date', undefined);
    if (type !== DurationType.AfterCount) form.setValue('end_after_count', undefined);
  }

  function openStartDatePicker() {
    if (locked) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDateAsDate,
        mode: 'date',
        onChange: (_, d) => {
          if (d) form.setValue('start_date', d.toISOString().slice(0, 10));
        },
      });
    } else {
      setShowStartDatePicker(!bodyState.showStartDatePicker);
      setShowEndDatePicker(false);
    }
  }

  function selectCategory(category: Category) {
    form.setValue('category_id', category.id);
    setCategoryPickerVisible(false);
  }

  function selectAccount(account: Account) {
    form.setValue('account_id', account.id);
    setAccountPickerVisible(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color={Colors.dark.text2} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldName}</Text>
          <Controller
            control={form.control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={styles.textInput}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.commitmentsNamePlaceholder}
                placeholderTextColor={Colors.dark.text2}
                maxLength={50}
                editable={!locked}
                multiline={false}
                numberOfLines={1}
              />
            )}
          />
        </View>
        {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

        {/* Amount Type toggle */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldAmountType}</Text>
          <View style={styles.chipRow}>
            {AMOUNT_TYPES.map(({ key, label }) => {
              const active = amountType === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleAmountTypeChange(key)}
                  disabled={locked}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Amount + Currency row */}
        <View style={styles.amountRow}>
          <View style={[styles.field, styles.amountField]}>
            {amountType === AmountType.Variable ? (
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{Strings.commitmentsFieldEstimatedAmount}</Text>
                <Text style={styles.optionalBadge}>{Strings.commitmentsOptional}</Text>
              </View>
            ) : (
              <Text style={styles.fieldLabel}>{Strings.commitmentsFieldAmount}</Text>
            )}
            <Controller
              control={form.control}
              name="amount"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.textInput, errors.amount ? styles.inputError : null]}
                  value={value != null ? String(value) : ''}
                  onChangeText={(v) => {
                    const n = parseFloat(v);
                    onChange(isNaN(n) ? undefined : n);
                  }}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  placeholder={
                    amountType === AmountType.Variable
                      ? Strings.commitmentsEstimatedAmountPlaceholder
                      : Strings.commitmentsAmountPlaceholder
                  }
                  placeholderTextColor={Colors.dark.text2}
                  editable={!locked}
                  multiline={false}
                  numberOfLines={1}
                />
              )}
            />
          </View>
          <View style={[styles.field, styles.currencyField]}>
            <Text style={styles.fieldLabel}>{Strings.commitmentsFieldCurrency}</Text>
            <View style={styles.currencyChipRow}>
              {CURRENCIES.map((c) => {
                const active = currency === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.chip, styles.currencyChip, active && styles.chipActive]}
                    onPress={() => form.setValue('currency', c)}
                    disabled={locked}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        {errors.amount ? <Text style={styles.err}>{errors.amount}</Text> : null}

        {/* Category picker row */}
        <Pressable
          style={styles.field}
          onPress={() => setCategoryPickerVisible(true)}
          disabled={locked}
        >
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldCategory}</Text>
          <View style={styles.fieldValue}>
            {selectedCategory ? (
              <Text style={styles.fieldValueText}>{selectedCategory.name}</Text>
            ) : (
              <Text style={styles.fieldPlaceholder}>{Strings.addTxPickCategoryTitle}</Text>
            )}
            <MaterialCommunityIcons
              name={locked ? 'lock-outline' : 'chevron-right'}
              size={ms(18)}
              color={Colors.dark.text2}
            />
          </View>
        </Pressable>
        {errors.category ? <Text style={styles.err}>{errors.category}</Text> : null}

        {/* Recurrence */}
        <RecurrencePicker
          form={form}
          recurrencePreset={recurrencePreset}
          onPresetChange={handleRecurrencePresetChange}
        />

        {/* Start Date */}
        <Pressable
          style={[styles.field, errors.start_date ? styles.inputError : null]}
          onPress={openStartDatePicker}
          disabled={locked}
        >
          <Text style={styles.fieldLabel}>{Strings.commitmentsFieldStartDate}</Text>
          <View style={styles.fieldValue}>
            <Text style={start_date ? styles.fieldValueText : styles.fieldPlaceholder}>
              {formattedStartDate}
            </Text>
            <MaterialCommunityIcons
              name={locked ? 'lock-outline' : 'calendar'}
              size={ms(18)}
              color={Colors.dark.text2}
            />
          </View>
        </Pressable>
        {errors.start_date ? <Text style={styles.err}>{errors.start_date}</Text> : null}

        {bodyState.showStartDatePicker && (
          <DateTimePicker
            value={startDateAsDate}
            mode="date"
            display="spinner"
            themeVariant="dark"
            onChange={(_, d) => {
              if (d) form.setValue('start_date', d.toISOString().slice(0, 10));
            }}
          />
        )}

        {/* Default Account (optional) */}
        <Pressable
          style={styles.field}
          onPress={() => setAccountPickerVisible(true)}
          disabled={locked}
        >
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{Strings.commitmentsFieldDefaultAccount}</Text>
            <Text style={styles.optionalBadge}>{Strings.commitmentsOptional}</Text>
          </View>
          <View style={styles.fieldValue}>
            {selectedAccount ? (
              <>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: selectedAccount.color ?? Colors.dark.border },
                  ]}
                />
                <Text style={styles.fieldValueText}>{selectedAccount.name}</Text>
              </>
            ) : (
              <Text style={styles.fieldPlaceholder}>{Strings.addTxPickAccountTitle}</Text>
            )}
            <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
          </View>
        </Pressable>

        {/* Duration */}
        <DurationPicker
          form={form}
          durationType={durationType}
          onDurationTypeChange={handleDurationTypeChange}
          showEndDatePicker={bodyState.showEndDatePicker}
          setShowEndDatePicker={(v) => {
            setShowEndDatePicker(v);
            if (v) setShowStartDatePicker(false);
          }}
        />

        {/* Notes (optional) */}
        <View style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{Strings.commitmentsFieldNotes}</Text>
            <Text style={styles.optionalBadge}>{Strings.commitmentsOptional}</Text>
          </View>
          <Controller
            control={form.control}
            name="notes"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={styles.notesInput}
                value={value ?? ''}
                onChangeText={(v) => onChange(v || undefined)}
                onBlur={onBlur}
                placeholder={Strings.addTxNotePlaceholder}
                placeholderTextColor={Colors.dark.text2}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, saving && styles.ctaDisabled]}>
        <Pressable style={styles.ctaPress} onPress={onSubmit} disabled={saving}>
          <LinearGradient
            colors={[Colors.shared.cairoGold, Colors.dark.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaLabel}>{Strings.commitmentsSave}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Pickers */}
      <CategoryPickerSheet
        visible={bodyState.categoryPickerVisible}
        title={Strings.addTxPickCategoryTitle}
        categories={categories}
        selectedId={form.watch('category_id')}
        onSelect={selectCategory}
        onClose={() => setCategoryPickerVisible(false)}
      />
      <AccountPickerSheet
        visible={bodyState.accountPickerVisible}
        title={Strings.addTxPickAccountTitle}
        accounts={accounts}
        selectedId={form.watch('account_id')}
        onSelect={selectAccount}
        onClose={() => setAccountPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  scrollContent: { gap: Spacing.sm, paddingBottom: Spacing.md, paddingTop: Spacing.sm },
  field: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  optionalBadge: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  fieldValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  fieldValueText: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  fieldPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(5) },
  textInput: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.dark.negative,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  currencyChipRow: { flexDirection: 'row', gap: Spacing.xs },
  currencyChip: { flex: 1, alignItems: 'center' },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipActive: { borderColor: Colors.shared.cairoGold, backgroundColor: CHIP_ACTIVE_BG },
  chipLabel: { fontFamily: FontFamily.interMedium, fontSize: Type.caption, color: Colors.dark.text2 },
  chipLabelActive: { color: Colors.shared.cairoGold },
  amountRow: { flexDirection: 'row', gap: Spacing.sm },
  amountField: { flex: 3 },
  currencyField: { flex: 2 },
  notesInput: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
    minHeight: ms(60),
    textAlignVertical: 'top',
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: -Spacing.xxs,
  },
  footer: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.surface,
  },
  ctaPress: { borderRadius: Radius.cta, overflow: 'hidden' },
  cta: {
    height: Size.ctaHeight,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
```

- [ ] **Step 2 — Replace `add_commitment/index.tsx`**

Replace the entire file with:

```tsx
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { CommitmentFormBody } from '../components/commitment_form_body';
import { useAddCommitment } from './add_commitment.hook';

export default function AddCommitmentScreen() {
  const { state, form, onSubmit } = useAddCommitment();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
        saving={state.saving}
        onSubmit={onSubmit}
        title={Strings.commitmentsAddTitle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
});
```

- [ ] **Step 3 — Replace `edit_commitment/index.tsx`**

Replace the entire file with:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { CommitmentFormBody } from '../components/commitment_form_body';
import { useEditCommitment } from './edit_commitment.hook';
import { DeactivateDialog } from './components/deactivate_dialog';

export default function EditCommitmentScreen() {
  const { state, form, onSubmit, handleDeactivate, confirmDeactivate, cancelDeactivate } =
    useEditCommitment();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CommitmentFormBody
        form={form}
        categories={state.categories}
        accounts={state.accounts}
        saving={state.saving}
        onSubmit={onSubmit}
        title={Strings.commitmentsEditTitle}
      />
      <Pressable style={styles.deactivateBtn} onPress={handleDeactivate}>
        <Text style={styles.deactivateText}>{Strings.commitmentsDeactivate}</Text>
      </Pressable>
      <DeactivateDialog
        visible={state.deactivateDialogVisible}
        busy={state.saving}
        onCancel={cancelDeactivate}
        onConfirm={confirmDeactivate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  deactivateBtn: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  deactivateText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
});
```

- [ ] **Step 4 — Run full test suite to confirm no regressions**

```bash
npm run test:coverage 2>&1 | tail -30
```

Expected: All tests pass, thresholds met.

- [ ] **Step 5 — Commit**

```bash
git add screens/commitments/components/commitment_form_body.tsx \
        screens/commitments/add_commitment/index.tsx \
        screens/commitments/edit_commitment/index.tsx
git commit -m "refactor: CommitmentFormBody 18→7 props, internalise all handlers via form.watch"
```

---

## Task 4: Simplify add commitment hook + state, delete add store

**Files:**
- Modify: `screens/commitments/add_commitment/add_commitment.hook.ts`
- Modify: `screens/commitments/add_commitment/add_commitment.state.ts`
- Delete: `screens/commitments/add_commitment/add_commitment.store.ts`

- [ ] **Step 1 — Replace `add_commitment.state.ts`**

Replace the entire file with:

```ts
import { create } from 'zustand';

interface AddCommitmentStateShape {
  saving: boolean;
}

interface AddCommitmentState {
  state: AddCommitmentStateShape;
  setSaving: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AddCommitmentStateShape = { saving: false };

export const useAddCommitmentState = create<AddCommitmentState>((set) => ({
  state: INITIAL_STATE,
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2 — Replace `add_commitment.hook.ts`**

Replace the entire file with:

```ts
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useRouter } from 'expo-router';

import { AmountType, DurationType } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import {
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
  buildAddDefaults,
} from '../commitment_form.shared';
import { useAddCommitmentState } from './add_commitment.state';

export type { CommitmentFormValues };

export function useAddCommitment() {
  const router = useRouter();

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const { addCommitment, generatePayments } = useCommitmentStore(
    useShallow((s) => ({ addCommitment: s.addCommitment, generatePayments: s.generatePayments })),
  );

  const { state: screenState, setSaving, reset } = useAddCommitmentState(
    useShallow((s) => ({ state: s.state, setSaving: s.setSaving, reset: s.reset })),
  );

  const form = useZodForm(COMMITMENT_SCHEMA, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildAddDefaults(),
  });

  useEffect(() => {
    return () => {
      reset();
      form.reset(buildAddDefaults());
    };
  }, [reset]);

  async function onValid(data: CommitmentFormValues) {
    setSaving(true);
    try {
      await addCommitment({
        name: data.name,
        amount_type: data.amount_type,
        amount: data.amount_type === AmountType.Fixed ? (data.amount ?? null) : null,
        currency: data.currency,
        category_id: data.category_id,
        recurrence_every: data.recurrence_every,
        recurrence_period: data.recurrence_period,
        start_date: data.start_date,
        account_id: data.account_id ?? null,
        notes: data.notes?.trim() || null,
        duration_type: data.duration_type,
        end_date: data.duration_type === DurationType.UntilDate ? (data.end_date ?? null) : null,
        end_after_count:
          data.duration_type === DurationType.AfterCount ? (data.end_after_count ?? null) : null,
      });
      await generatePayments();
      reset();
      form.reset(buildAddDefaults());
      router.back();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  return {
    state: {
      saving: screenState.saving,
      categories: categoryState.categories,
      accounts: accountState.accounts,
    },
    form,
    onSubmit: form.handleSubmit(onValid),
  };
}
```

- [ ] **Step 3 — Delete `add_commitment.store.ts`**

```bash
rm screens/commitments/add_commitment/add_commitment.store.ts
```

- [ ] **Step 4 — Run full test suite**

```bash
npm run test:coverage 2>&1 | tail -30
```

Expected: All tests pass, thresholds met.

- [ ] **Step 5 — Commit**

```bash
git add screens/commitments/add_commitment/add_commitment.hook.ts \
        screens/commitments/add_commitment/add_commitment.state.ts
git rm screens/commitments/add_commitment/add_commitment.store.ts
git commit -m "refactor: simplify add commitment hook+state, delete add store"
```

---

## Task 5: Simplify edit commitment hook + state, delete edit store

**Files:**
- Modify: `screens/commitments/edit_commitment/edit_commitment.hook.ts`
- Modify: `screens/commitments/edit_commitment/edit_commitment.state.ts`
- Delete: `screens/commitments/edit_commitment/edit_commitment.store.ts`

- [ ] **Step 1 — Replace `edit_commitment.state.ts`**

Replace the entire file with:

```ts
import { create } from 'zustand';

interface EditCommitmentStateShape {
  saving: boolean;
  deactivateDialogVisible: boolean;
}

interface EditCommitmentState {
  state: EditCommitmentStateShape;
  setSaving: (v: boolean) => void;
  setDeactivateDialogVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: EditCommitmentStateShape = {
  saving: false,
  deactivateDialogVisible: false,
};

export const useEditCommitmentState = create<EditCommitmentState>((set) => ({
  state: INITIAL_STATE,
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setDeactivateDialogVisible: (v) =>
    set((s) => ({ state: { ...s.state, deactivateDialogVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2 — Replace `edit_commitment.hook.ts`**

Replace the entire file with:

```ts
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AmountType, DurationType } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import {
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
  buildAddDefaults,
  buildEditDefaults,
} from '../commitment_form.shared';
import { useEditCommitmentState } from './edit_commitment.state';

export type { CommitmentFormValues };

export function useEditCommitment() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const { state: commitmentState, updateCommitment, deactivateCommitment } = useCommitmentStore(
    useShallow((s) => ({
      state: s.state,
      updateCommitment: s.updateCommitment,
      deactivateCommitment: s.deactivateCommitment,
    })),
  );

  const { state: screenState, setSaving, setDeactivateDialogVisible, reset } =
    useEditCommitmentState(
      useShallow((s) => ({
        state: s.state,
        setSaving: s.setSaving,
        setDeactivateDialogVisible: s.setDeactivateDialogVisible,
        reset: s.reset,
      })),
    );

  const commitment = useMemo(
    () => commitmentState.commitments.find((c) => c.id === id),
    [commitmentState.commitments, id],
  );

  useEffect(() => {
    if (!commitment) router.back();
  }, [commitment, router]);

  const form = useZodForm(COMMITMENT_SCHEMA, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildAddDefaults(),
  });

  // Pre-fill when commitment loads
  useEffect(() => {
    if (!commitment) return;
    form.reset(buildEditDefaults(commitment));
  }, [commitment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);

  async function onValid(data: CommitmentFormValues) {
    if (!id) return;
    setSaving(true);
    try {
      await updateCommitment(id, {
        name: data.name,
        amount_type: data.amount_type,
        amount: data.amount_type === AmountType.Fixed ? (data.amount ?? null) : null,
        currency: data.currency,
        category_id: data.category_id,
        recurrence_every: data.recurrence_every,
        recurrence_period: data.recurrence_period,
        start_date: data.start_date,
        account_id: data.account_id ?? null,
        notes: data.notes?.trim() || null,
        duration_type: data.duration_type,
        end_date: data.duration_type === DurationType.UntilDate ? (data.end_date ?? null) : null,
        end_after_count:
          data.duration_type === DurationType.AfterCount ? (data.end_after_count ?? null) : null,
      });
      reset();
      router.back();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function handleDeactivate() {
    setDeactivateDialogVisible(true);
  }

  async function confirmDeactivate() {
    if (!id) return;
    setSaving(true);
    try {
      await deactivateCommitment(id);
      setDeactivateDialogVisible(false);
      reset();
      router.replace('/commitments' as Parameters<typeof router.replace>[0]);
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function cancelDeactivate() {
    setDeactivateDialogVisible(false);
  }

  return {
    state: {
      saving: screenState.saving,
      deactivateDialogVisible: screenState.deactivateDialogVisible,
      categories: categoryState.categories,
      accounts: accountState.accounts,
    },
    form,
    onSubmit: form.handleSubmit(onValid),
    handleDeactivate,
    confirmDeactivate,
    cancelDeactivate,
  };
}
```

- [ ] **Step 3 — Delete `edit_commitment.store.ts`**

```bash
rm screens/commitments/edit_commitment/edit_commitment.store.ts
```

- [ ] **Step 4 — Run full test suite**

```bash
npm run test:coverage 2>&1 | tail -30
```

Expected: All tests pass, thresholds met (80% lines / 95% functions / 100% branches).

- [ ] **Step 5 — Commit**

```bash
git add screens/commitments/edit_commitment/edit_commitment.hook.ts \
        screens/commitments/edit_commitment/edit_commitment.state.ts
git rm screens/commitments/edit_commitment/edit_commitment.store.ts
git commit -m "refactor: simplify edit commitment hook+state, delete edit store"
```

---

## Task 6: Final verification

- [ ] **Step 1 — Run full test suite with coverage report**

```bash
npm run test:coverage 2>&1 | tail -40
```

Expected output includes:
```
Tests:       X passed
Snapshots:   0 total
Coverage:    Lines ≥80%, Functions ≥95%, Branches 100%
```

- [ ] **Step 2 — Verify deleted files are gone**

```bash
ls screens/commitments/add_commitment/add_commitment.store.ts 2>&1
ls screens/commitments/edit_commitment/edit_commitment.store.ts 2>&1
```

Expected: `No such file or directory` for both.

- [ ] **Step 3 — Verify shared module exports are all used**

```bash
grep -r "commitment_form.shared" screens/commitments/ --include="*.ts" --include="*.tsx" -l
```

Expected: Lists `commitment_form.shared.ts` itself plus `add_commitment.hook.ts`, `edit_commitment.hook.ts`, `commitment_form_body.tsx`, `recurrence_picker.tsx`, `duration_picker.tsx`.

- [ ] **Step 4 — Verify no remaining imports from old hook files for CommitmentFormValues**

```bash
grep -r "from.*add_commitment.hook" screens/commitments/components/ --include="*.ts" --include="*.tsx"
grep -r "from.*edit_commitment.hook" screens/commitments/components/ --include="*.ts" --include="*.tsx"
```

Expected: No output (zero matches).

- [ ] **Step 5 — Final commit**

```bash
git add -A
git commit -m "chore: verify commitment form refactor complete — 5 stores → 3, 18 props → 7"
```
