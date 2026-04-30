import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { backOrReplace } from '@/utils/onboarding_nav';
import { AccountColors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import type { Account, AccountType } from '@/store/account.store';
import type { Currency } from '@/store/onboarding.store';

export function createAddAccountSchema(accounts: Account[]) {
  return z
    .object({
      name: z.string().min(1, Strings.errNameRequired).max(30, Strings.errNameTooLong),
      balance: z.string().refine(
        (v) => {
          const n = parseFloat(v);
          return Number.isFinite(n) && n >= 0;
        },
        { message: Strings.errBalanceInvalid },
      ),
      selected_type: z.enum([
        'bank',
        'smart_wallet',
        'physical_wallet',
        'physical_savings',
        'credit_card',
      ] as [AccountType, ...AccountType[]]),
      selected_color: z.string(),
      currency: z.enum(['EGP', 'USD'] as [Currency, ...Currency[]]),
      interest_tracking: z.boolean(),
      credit_limit: z.string().optional(),
      apr: z.string().optional(),
      revolving_balance: z.string().optional(),
      min_payment: z.string().optional(),
      due_day: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (accounts.some((a) => a.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        ctx.addIssue({ code: 'custom', path: ['name'], message: Strings.errNameDuplicate });
      }
      if (data.selected_type === 'credit_card' && !data.credit_limit?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['credit_limit'],
          message: Strings.errCreditLimitRequired,
        });
      }
      if (data.interest_tracking && !data.apr?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRequired });
      }
    });
}

export type AddAccountFormData = z.infer<ReturnType<typeof createAddAccountSchema>>;

export function useAddAccount() {
  const router = useRouter();
  const { isAddingMore } = useLocalSearchParams<{ isAddingMore?: string }>();
  const accounts = useAccountStore((s) => s.accounts);
  const addAccount = useAccountStore((s) => s.addAccount);
  const setStep = useOnboardingStore((s) => s.setStep);
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);

  useEffect(() => {
    useAccountStore.getState().loadAccounts();
  }, []);

  const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: 'bank' as AccountType,
      selected_color: AccountColors[0],
      currency: baseCurrency as Currency,
      interest_tracking: false,
      credit_limit: '',
      apr: '',
      revolving_balance: '',
      min_payment: '',
      due_day: '',
    },
  });

  const onSubmit = async (data: AddAccountFormData) => {
    const isCC = data.selected_type === 'credit_card';
    await addAccount({
      name: data.name.trim(),
      type: data.selected_type,
      currency: data.currency,
      opening_balance: parseFloat(data.balance),
      current_balance: parseFloat(data.balance),
      color: data.selected_color,
      interest_tracking: (data.interest_tracking ? 1 : 0) as 0 | 1,
      is_archived: 0 as const,
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
      await setStep('O5');
      router.push('/(onboarding)/more_accounts');
    }
  };

  const onBack = () =>
    backOrReplace(router, isAddingMore ? '/(onboarding)/more_accounts' : '/(onboarding)/security');

  return { form, handleSave: form.handleSubmit(onSubmit), onBack };
}
