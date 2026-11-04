import { useEffect, useId } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useZodForm } from '@/utils/use_zod_form.hook';

import type { Commitment } from '../../../entities/commitment.entity';
import { useCommitmentStore } from '../../../store/commitment.store';
import {
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
  buildEditDefaults,
} from '../commitment_form.shared';
import { INITIAL_UI_ENTRY, useEditCommitmentState } from './edit_commitment.state';

export type { CommitmentFormValues };

interface EditCommitmentOptions {
  commitment: Commitment;
  onSaved: () => void;
  onStopped: () => void;
}

export function useEditCommitment(options: EditCommitmentOptions) {
  const owner = useId();
  const { commitment } = options;

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();
  const updateCommitment = useCommitmentStore.getState().updateCommitment;
  const deactivateCommitment = useCommitmentStore.getState().deactivateCommitment;
  const { saving, saveError, stopDialogVisible, stopError } = useEditCommitmentState(
    useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY),
  );
  const claim = useEditCommitmentState.getState().claim;
  const setSaving = useEditCommitmentState.getState().setSaving;
  const setSaveError = useEditCommitmentState.getState().setSaveError;
  const setStopDialogVisible = useEditCommitmentState.getState().setStopDialogVisible;
  const setStopError = useEditCommitmentState.getState().setStopError;
  const release = useEditCommitmentState.getState().release;

  const form = useZodForm(COMMITMENT_SCHEMA, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildEditDefaults(commitment),
  });

  // Read off the store: two taps in one frame both see the render's `saving` as false.
  const isSaving = (): boolean => useEditCommitmentState.getState().entries[owner]?.saving === true;

  useEffect(() => {
    claim(owner);
    return () => release(owner);
  }, [owner, claim, release]);

  async function onValid(data: CommitmentFormValues) {
    if (isSaving()) return;
    setSaveError(owner, undefined);
    setSaving(owner, true);
    try {
      await updateCommitment(commitment.id, {
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
      setSaveError(owner, Strings.commitmentsSaveError);
    } finally {
      setSaving(owner, false);
    }
  }

  const onSubmit = async (): Promise<void> => {
    if (isSaving()) return;
    await form.handleSubmit(onValid)();
  };

  function openStopDialog() {
    setStopError(owner, false);
    setStopDialogVisible(owner, true);
  }

  async function confirmStop() {
    if (isSaving()) return;
    setStopError(owner, false);
    setSaving(owner, true);
    try {
      await deactivateCommitment(commitment.id);
      setStopDialogVisible(owner, false);
      options.onStopped();
    } catch {
      setStopError(owner, true);
    } finally {
      setSaving(owner, false);
    }
  }

  function cancelStop() {
    setStopDialogVisible(owner, false);
  }

  return {
    state: {
      saving,
      saveError,
      stopDialogVisible,
      stopError,
      categories,
      accounts,
    },
    form,
    onSubmit,
    openStopDialog,
    confirmStop,
    cancelStop,
  };
}
