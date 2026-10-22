import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useCommitmentStore } from '../../../store/commitment.store';
import {
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
  buildAddDefaults,
} from '../commitment_form.shared';
import { useAddCommitmentState } from './add_commitment.state';

export type { CommitmentFormValues };

export function useAddCommitment(options: { onSaved: () => void }) {
  const saveInFlightRef = useRef(false);

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();
  const addCommitment = useCommitmentStore.getState().addCommitment;
  const { saving, saveError } = useAddCommitmentState(
    useShallow((s) => ({ saving: s.saving, saveError: s.saveError })),
  );
  const setSaving = useAddCommitmentState.getState().setSaving;
  const setSaveError = useAddCommitmentState.getState().setSaveError;
  const reset = useAddCommitmentState.getState().reset;

  const form = useZodForm(COMMITMENT_SCHEMA, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildAddDefaults(),
  });

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const resetForm = form.reset;
  const resetDraft = useCallback(() => {
    resetForm(buildAddDefaults());
    reset();
  }, [resetForm, reset]);

  async function onValid(data: CommitmentFormValues) {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    setSaveError(undefined);
    try {
      await addCommitment({
        name: data.name,
        amount_type: data.amountType,
        amount: data.amount ?? null,
        currency: data.currency,
        category_id: data.categoryId,
        recurrence_every: data.recurrenceEvery,
        recurrence_period: data.recurrencePeriod,
        start_date: data.startDate,
        account_id: data.accountId ?? null,
        // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string maps to null
        notes: data.notes?.trim() || null,
        duration_type: data.durationType,
        end_date: data.durationType === DurationType.UntilDate ? (data.endDate ?? null) : null,
        end_after_count:
          data.durationType === DurationType.AfterCount ? (data.endAfterCount ?? null) : null,
      });
      options.onSaved();
    } catch {
      setSaveError(Strings.commitmentsSaveError);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  return {
    state: {
      saving,
      saveError,
      categories,
      accounts,
    },
    form,
    onSubmit: form.handleSubmit(onValid),
    resetDraft,
  };
}
