import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import {
  STACKED_PREFIX,
  TABBED_ORIGIN,
  stackedPrefixOf,
  stackedTransactionDetailRoute,
} from '@/modules/navigation/domain/stacked_route';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useCommitmentStore } from '../../../store/commitment.store';
import {
  COMMITMENT_SCHEMA,
  type CommitmentFormValues,
  buildEditDefaults,
} from '../commitment_form.shared';
import { INITIAL_UI_ENTRY, useEditCommitmentState } from './edit_commitment.state';

export type { CommitmentFormValues };

export function useEditCommitment() {
  const owner = useId();
  const router = useRouter();
  const { id, originTxId, originTxCopy } = useLocalSearchParams<{
    id: string;
    originTxId?: string;
    originTxCopy?: string;
  }>();
  const stackedPrefix = stackedPrefixOf(usePathname());

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();
  const commitments = useCommitmentStore.useState.commitments();
  const updateCommitment = useCommitmentStore.getState().updateCommitment;
  const deactivateCommitment = useCommitmentStore.getState().deactivateCommitment;
  const { saving, saveError, deactivateDialogVisible } = useEditCommitmentState(
    useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY),
  );
  const claim = useEditCommitmentState.getState().claim;
  const setSaving = useEditCommitmentState.getState().setSaving;
  const setSaveError = useEditCommitmentState.getState().setSaveError;
  const setDeactivateDialogVisible = useEditCommitmentState.getState().setDeactivateDialogVisible;
  const release = useEditCommitmentState.getState().release;

  const commitment = useMemo(() => commitments.find((c) => c.id === id), [commitments, id]);

  useEffect(() => {
    if (!commitment) router.back();
  }, [commitment, router]);

  const form = useZodForm(COMMITMENT_SCHEMA, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: commitment ? buildEditDefaults(commitment) : undefined,
  });

  useEffect(() => {
    if (!commitment) return;
    form.reset(buildEditDefaults(commitment));
  }, [commitment]); // oxlint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    claim(owner);
    return () => release(owner);
  }, [owner, claim, release]);

  function leaveStackedSubtree() {
    // `(tabs)` is index 0 of the `(app)` Stack, so popping to the top lands on the tabbed transaction.
    if (originTxCopy === TABBED_ORIGIN) router.dismissAll();
    // POP_TO selects by route name, so it steps over any duplicate edit or payment a double-tap appended.
    else if (originTxId) router.dismissTo(stackedTransactionDetailRoute(originTxId));
    else router.back();
  }

  async function onValid(data: CommitmentFormValues) {
    if (!id) return;
    setSaveError(owner, undefined);
    setSaving(owner, true);
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
      if (stackedPrefix === STACKED_PREFIX) leaveStackedSubtree();
      else router.dismissTo('/commitments');
    } catch {
      setSaveError(owner, Strings.commitmentsSaveError);
    } finally {
      setSaving(owner, false);
    }
  }

  function handleDeactivate() {
    setDeactivateDialogVisible(owner, true);
  }

  async function confirmDeactivate() {
    if (!id) return;
    setSaving(owner, true);
    try {
      await deactivateCommitment(id);
      setDeactivateDialogVisible(owner, false);
      if (stackedPrefix === STACKED_PREFIX) leaveStackedSubtree();
      else router.replace('/commitments');
    } catch {
      // The sheet is a portal over the form, so it must close for the banner to show.
      setDeactivateDialogVisible(owner, false);
      setSaveError(owner, Strings.commitmentsSaveError);
    } finally {
      setSaving(owner, false);
    }
  }

  function cancelDeactivate() {
    setDeactivateDialogVisible(owner, false);
  }

  return {
    state: {
      saving,
      saveError,
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
