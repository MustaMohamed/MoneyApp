import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  AmountType,
  Currency,
  DurationType,
  RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import { useEditCommitmentStore } from './edit_commitment.store';
import { useEditCommitmentState } from './edit_commitment.state';

// Base shape — used to derive CommitmentFormValues so it always matches Zod's inferred output.
const BASE_SCHEMA = z.object({
  name: z.string(),
  amount: z.number().optional(),
  currency: z.nativeEnum(Currency),
  category_id: z.string(),
  recurrence_every: z.number().int(),
  recurrence_period: z.nativeEnum(RecurrencePeriod),
  start_date: z.string(),
  account_id: z.string().optional(),
  notes: z.string().optional(),
  duration_type: z.nativeEnum(DurationType),
  end_date: z.string().optional(),
  end_after_count: z.number().int().optional(),
});

export type CommitmentFormValues = z.infer<typeof BASE_SCHEMA>;

function createSchema(amountType: AmountType, durationType: DurationType) {
  return z
    .object({
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
      if (amountType === AmountType.Fixed && !data.amount) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.commitmentsErrAmountRequired,
          path: ['amount'],
        });
      }
      if (durationType === DurationType.UntilDate && !data.end_date) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.commitmentsErrEndDateRequired,
          path: ['end_date'],
        });
      }
      if (durationType === DurationType.AfterCount && !data.end_after_count) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.commitmentsErrAfterCountRequired,
          path: ['end_after_count'],
        });
      }
    });
}

function buildDefaultsFromCommitment(c: Commitment): CommitmentFormValues {
  return {
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

function detectPreset(every: number, period: RecurrencePeriod): RecurrencePreset {
  if (every === 1 && period === RecurrencePeriod.Months) return RecurrencePreset.Monthly;
  if (every === 1 && period === RecurrencePeriod.Weeks) return RecurrencePreset.Weekly;
  if (every === 1 && period === RecurrencePeriod.Years) return RecurrencePreset.Annually;
  return RecurrencePreset.Custom;
}

function buildInitialDefaults(): CommitmentFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
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

const PRESET_MAP: Record<RecurrencePreset, { every: number; period: RecurrencePeriod } | null> = {
  [RecurrencePreset.Monthly]: { every: 1, period: RecurrencePeriod.Months },
  [RecurrencePreset.Weekly]: { every: 1, period: RecurrencePeriod.Weeks },
  [RecurrencePreset.Annually]: { every: 1, period: RecurrencePeriod.Years },
  [RecurrencePreset.Custom]: null,
};

export function useEditCommitment() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const {
    state: commitmentState,
    updateCommitment,
    deactivateCommitment,
  } = useCommitmentStore(
    useShallow((s) => ({
      state: s.state,
      updateCommitment: s.updateCommitment,
      deactivateCommitment: s.deactivateCommitment,
    })),
  );

  const {
    state: storeState,
    setAmountType,
    setRecurrencePreset,
    setDurationType,
    reset: resetStore,
  } = useEditCommitmentStore(
    useShallow((s) => ({
      state: s.state,
      setAmountType: s.setAmountType,
      setRecurrencePreset: s.setRecurrencePreset,
      setDurationType: s.setDurationType,
      reset: s.reset,
    })),
  );

  const {
    state: screenState,
    setSaving: setScreenSaving,
    setCategoryPickerVisible,
    setAccountPickerVisible,
    setDeactivateDialogVisible,
    reset: resetScreenState,
  } = useEditCommitmentState(
    useShallow((s) => ({
      state: s.state,
      setSaving: s.setSaving,
      setCategoryPickerVisible: s.setCategoryPickerVisible,
      setAccountPickerVisible: s.setAccountPickerVisible,
      setDeactivateDialogVisible: s.setDeactivateDialogVisible,
      reset: s.reset,
    })),
  );

  const commitment = useMemo(
    () => commitmentState.commitments.find((c) => c.id === id),
    [commitmentState.commitments, id],
  );

  // Navigate back if commitment not found
  useEffect(() => {
    if (!commitment) {
      router.back();
    }
  }, [commitment, router]);

  const schema = useMemo(
    () => createSchema(storeState.amountType, storeState.durationType),
    [storeState.amountType, storeState.durationType],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildInitialDefaults(),
  });

  // Pre-fill form when commitment loads
  useEffect(() => {
    if (!commitment) return;
    form.reset(buildDefaultsFromCommitment(commitment));
    setAmountType(commitment.amount_type);
    setRecurrencePreset(detectPreset(commitment.recurrence_every, commitment.recurrence_period));
    setDurationType(commitment.duration_type);
  }, [commitment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetStore();
      resetScreenState();
    };
  }, [resetStore, resetScreenState]);

  const categoryId = form.watch('category_id');
  const accountId = form.watch('account_id');

  const selectedCategory = useMemo(
    () => categoryState.categories.find((c) => c.id === categoryId),
    [categoryState.categories, categoryId],
  );

  const selectedAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === accountId),
    [accountState.accounts, accountId],
  );

  async function onValid(data: CommitmentFormValues) {
    if (!id) return;
    setScreenSaving(true);
    try {
      await updateCommitment(id, {
        name: data.name,
        amount_type: storeState.amountType,
        amount: storeState.amountType === AmountType.Fixed ? (data.amount ?? null) : null,
        currency: data.currency,
        category_id: data.category_id,
        recurrence_every: data.recurrence_every,
        recurrence_period: data.recurrence_period,
        start_date: data.start_date,
        account_id: data.account_id ?? null,
        notes: data.notes?.trim() || null,
        duration_type: storeState.durationType,
        end_date:
          storeState.durationType === DurationType.UntilDate ? (data.end_date ?? null) : null,
        end_after_count:
          storeState.durationType === DurationType.AfterCount
            ? (data.end_after_count ?? null)
            : null,
      });
      resetStore();
      resetScreenState();
      router.back();
    } catch {
      // error logged by store
    } finally {
      setScreenSaving(false);
    }
  }

  function handleRecurrencePresetChange(preset: RecurrencePreset) {
    setRecurrencePreset(preset);
    const mapped = PRESET_MAP[preset];
    if (mapped) {
      form.setValue('recurrence_every', mapped.every);
      form.setValue('recurrence_period', mapped.period);
    }
  }

  function handleDurationTypeChange(type: DurationType) {
    setDurationType(type);
    form.setValue('duration_type', type);
    if (type !== DurationType.UntilDate) form.setValue('end_date', undefined);
    if (type !== DurationType.AfterCount) form.setValue('end_after_count', undefined);
  }

  function selectCategory(category: Category) {
    form.setValue('category_id', category.id);
    setCategoryPickerVisible(false);
  }

  function selectAccount(account: Account) {
    form.setValue('account_id', account.id);
    setAccountPickerVisible(false);
  }

  function handleDeactivate() {
    setDeactivateDialogVisible(true);
  }

  async function confirmDeactivate() {
    if (!id) return;
    setScreenSaving(true);
    try {
      await deactivateCommitment(id);
      setDeactivateDialogVisible(false);
      resetStore();
      resetScreenState();
      router.replace('/commitments' as Parameters<typeof router.replace>[0]);
    } catch {
      // error logged by store
    } finally {
      setScreenSaving(false);
    }
  }

  function cancelDeactivate() {
    setDeactivateDialogVisible(false);
  }

  return {
    state: {
      saving: screenState.saving,
      categoryPickerVisible: screenState.categoryPickerVisible,
      accountPickerVisible: screenState.accountPickerVisible,
      deactivateDialogVisible: screenState.deactivateDialogVisible,
      selectedCategory,
      selectedAccount,
      amountType: storeState.amountType,
      recurrencePreset: storeState.recurrencePreset,
      durationType: storeState.durationType,
      accounts: accountState.accounts,
      categories: categoryState.categories,
    },
    form,
    onSubmit: form.handleSubmit(onValid),
    setAmountType,
    handleRecurrencePresetChange,
    handleDurationTypeChange,
    openCategoryPicker: () => setCategoryPickerVisible(true),
    closeCategoryPicker: () => setCategoryPickerVisible(false),
    openAccountPicker: () => setAccountPickerVisible(true),
    closeAccountPicker: () => setAccountPickerVisible(false),
    selectCategory,
    selectAccount,
    handleDeactivate,
    confirmDeactivate,
    cancelDeactivate,
  };
}
