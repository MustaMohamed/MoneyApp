import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { DurationType } from '@/constants/enums';
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

export function useAddCommitment() {
  const router = useRouter();

  const accounts = useAccountStore.useState.accounts();
  const categories = useCategoryStore.useState.categories();
  const addCommitment = useCommitmentStore.use.addCommitment();
  const generatePayments = useCommitmentStore.use.generatePayments();
  const saving = useAddCommitmentState.useState.saving();
  const setSaving = useAddCommitmentState.use.setSaving();
  const reset = useAddCommitmentState.use.reset();

  const form = useZodForm(COMMITMENT_SCHEMA, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildAddDefaults(),
  });

  useEffect(() => {
    return () => reset();
  }, [reset]);

  async function onValid(data: CommitmentFormValues) {
    setSaving(true);
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
      saving,
      categories,
      accounts,
    },
    form,
    onSubmit: form.handleSubmit(onValid),
  };
}
