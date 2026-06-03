import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { DurationType } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useCommitmentStore } from '../../../store/commitment.store';
import {
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
  buildEditDefaults,
} from '../commitment_form.shared';
import { useEditCommitmentState } from './edit_commitment.state';

export type { CommitmentFormValues };

export function useEditCommitment() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const accountStore = useAccountStore();
  const accounts = accountStore.accounts;
  const categoryStore = useCategoryStore();
  const categories = categoryStore.categories;
  const commitmentStore = useCommitmentStore();
  const commitments = commitmentStore.commitments;
  const { updateCommitment, deactivateCommitment } = commitmentStore;
  const editState = useEditCommitmentState();
  const saving = editState.state.saving.value;
  const deactivateDialogVisible = editState.state.deactivateDialogVisible.value;
  const { setSaving, setDeactivateDialogVisible, reset } = editState;

  const commitment = useMemo(() => commitments.find((c) => c.id === id), [commitments, id]);

  useEffect(() => {
    if (!commitment) router.back();
  }, [commitment, router]);

  const form = useZodForm(COMMITMENT_SCHEMA, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: commitment ? buildEditDefaults(commitment) : undefined,
  });

  // Re-prefill if the underlying commitment reference changes
  useEffect(() => {
    if (!commitment) return;
    form.reset(buildEditDefaults(commitment));
  }, [commitment]); // oxlint-disable-line react-hooks/exhaustive-deps

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
      reset();
      // regeneratePayments invalidates the URL paymentId on the detail screen
      // underneath, so pop to list instead of router.back() (which would land
      // on a "Commitment not found" screen).
      router.dismissTo('/commitments' as Parameters<typeof router.dismissTo>[0]);
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
      saving,
      deactivateDialogVisible,
      categories,
      accounts,
    },
    form,
    onSubmit: form.handleSubmit(onValid),
    handleDeactivate,
    confirmDeactivate,
    cancelDeactivate,
  };
}
