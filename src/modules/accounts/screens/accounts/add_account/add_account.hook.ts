import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { AccountType, Currency } from '@/constants/enums';
import { AcctTokens } from '@/constants/theme_tokens';
import { useInit } from '@/utils/use_init.hook';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { EMPTY_ACCOUNTS, useAccountStore } from '../../../store/account.store';
import { createAddAccountSchema, type AddAccountFormData } from '../../../utils/add_account.schema';

// 12 ACCOUNT_COLORS sourced from AcctTokens.*.rich values (spec §2.4), mirroring
// onboarding/add_account. Exported so index.tsx renders the picker row.
export const ACCOUNT_COLORS = [
  AcctTokens.midnight.rich,
  AcctTokens.gold.rich,
  AcctTokens.nile.rich,
  AcctTokens.paprika.rich,
  AcctTokens.plum.rich,
  AcctTokens.lapis.rich,
  AcctTokens.rose.rich,
  AcctTokens.sand.rich,
  AcctTokens.amethyst.rich,
  AcctTokens.emerald.rich,
  AcctTokens.saffron.rich,
  AcctTokens.steel.rich,
] as const;

export function useAddAccountApp() {
  const router = useRouter();
  const {
    state: { accounts: accountsSignal },
    addAccount,
    init,
  } = useAccountStore();
  const accounts = accountsSignal.value ?? EMPTY_ACCOUNTS;

  useInit(init);

  const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: AccountType.Bank,
      selected_color: AcctTokens.midnight.rich,
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
      interest_tracking: data.interest_tracking ? 1 : 0,
      sort_order: accounts.length,
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
