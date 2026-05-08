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

  const {
    state: screenState,
    setSaving,
    reset,
  } = useAddCommitmentState(
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
  }, [reset, form]);

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
