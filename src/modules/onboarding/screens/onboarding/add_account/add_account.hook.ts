import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { AccountType, OnboardingStep } from '@/constants/enums';
import { AcctTokens } from '@/constants/theme_tokens';
import { EMPTY_ACCOUNTS, useAccounts } from '@/modules/accounts/store/account.store';
import { useOnboarding } from '@/modules/onboarding/store/onboarding.store';
import { backOrReplace } from '@/utils/onboarding_nav';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

// The 12 ACCOUNT_COLORS sourced from AcctTokens.*.rich values (spec §2.4).
// Used by the color picker in index.tsx. Exported so the screen can render the row.
export const ACCOUNT_COLORS = [
  AcctTokens.midnight.rich, // #1B2B4B — default
  AcctTokens.gold.rich, // #C9973A
  AcctTokens.nile.rich, // #2D7D6E
  AcctTokens.paprika.rich, // #C45C2A
  AcctTokens.plum.rich, // #5A2D55
  AcctTokens.lapis.rich, // #185FA5
  AcctTokens.rose.rich, // #B8526D
  AcctTokens.sand.rich, // #C9A876
  AcctTokens.amethyst.rich, // #7B3F8C
  AcctTokens.emerald.rich, // #4CAF82
  AcctTokens.saffron.rich, // #D4830A
  AcctTokens.steel.rich, // #4A6FA5
] as const;

export function useAddAccount() {
  const router = useRouter();
  const { isAddingMore } = useLocalSearchParams<{ isAddingMore?: string }>();
  const { state: accountsState, addAccount, loadAccounts } = useAccounts();
  const accounts = accountsState.accounts.value ?? EMPTY_ACCOUNTS;
  const { state, setStep } = useOnboarding();

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: AccountType.Bank,
      selected_color: AcctTokens.midnight.rich,
      currency: state.baseCurrency.value,
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
    if (isAddingMore) {
      backOrReplace(router, '/(onboarding)/more_accounts');
    } else {
      await setStep(OnboardingStep.N3);
      router.push('/(onboarding)/more_accounts');
    }
  };

  const onBack = () =>
    backOrReplace(router, isAddingMore ? '/(onboarding)/more_accounts' : '/(onboarding)/welcome');

  return { form, handleSave: form.handleSubmit(onSubmit), onBack };
}
