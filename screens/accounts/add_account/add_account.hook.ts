import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { AccountColors } from '@/constants/theme';
import { AccountType, Currency } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';

export function useAddAccountApp() {
  const router = useRouter();
  const { state: accountState, addAccount } = useAccountStore(
    useShallow((s) => ({ state: s.state, addAccount: s.addAccount })),
  );

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
      currency: Currency.EGP,
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
    router.back();
  };

  const onBack = () => router.back();

  return { form, handleSave: form.handleSubmit(onSubmit), onBack };
}
