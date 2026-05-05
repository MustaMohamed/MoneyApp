import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { backOrReplace } from '@/utils/onboarding_nav';
import { AccountColors } from '@/constants/theme';
import { AccountType, OnboardingStep } from '@/constants/enums';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';

export function useAddAccount() {
  const router = useRouter();
  const { isAddingMore } = useLocalSearchParams<{ isAddingMore?: string }>();
  const { state: accountState, addAccount } = useAccountStore(
    useShallow((s) => ({ state: s.state, addAccount: s.addAccount })),
  );
  const { state: onboardingState, setStep } = useOnboardingStore(
    useShallow((s) => ({ state: s.state, setStep: s.setStep })),
  );

  useEffect(() => {
    useAccountStore.getState().loadAccounts();
  }, []);

  const schema = useMemo(
    () => createAddAccountSchema(accountState.accounts),
    [accountState.accounts],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: AccountType.Bank,
      selected_color: AccountColors[0],
      currency: onboardingState.baseCurrency,
      interest_tracking: false,
      credit_limit: '',
      apr: '',
      revolving_balance: '',
      min_payment: '',
      due_day: '',
    },
  });

  const onSubmit = async (data: AddAccountFormData) => {
    const isCC = data.selected_type === AccountType.CreditCard;
    await addAccount({
      name: data.name.trim(),
      type: data.selected_type,
      currency: data.currency,
      opening_balance: parseFloat(data.balance),
      color: data.selected_color,
      interest_tracking: (data.interest_tracking ? 1 : 0) as 0 | 1,
      sort_order: accountState.accounts.length,
      credit_limit: isCC && data.credit_limit?.trim() ? parseFloat(data.credit_limit) : null,
      revolving_balance:
        isCC && data.revolving_balance?.trim() ? parseFloat(data.revolving_balance) || 0 : null,
      minimum_payment: isCC && data.min_payment?.trim() ? parseFloat(data.min_payment) : null,
      statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,
      apr: isCC && data.interest_tracking && data.apr?.trim() ? parseFloat(data.apr) : null,
    });
    if (isAddingMore) {
      backOrReplace(router, '/(onboarding)/more_accounts');
    } else {
      await setStep(OnboardingStep.O5);
      router.push('/(onboarding)/more_accounts');
    }
  };

  const onBack = () =>
    backOrReplace(router, isAddingMore ? '/(onboarding)/more_accounts' : '/(onboarding)/security');

  return { form, handleSave: form.handleSubmit(onSubmit), onBack };
}
