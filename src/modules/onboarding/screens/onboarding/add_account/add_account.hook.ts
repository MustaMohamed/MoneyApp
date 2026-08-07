import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { AccountType, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';
import { useInit } from '@/utils/use_init.hook';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAddAccountTransitionState } from './add_account.state';

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
  const accounts = useAccountStore((s) => s.accounts);
  const addAccount = useAccountStore.getState().addAccount;
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const setStep = useOnboardingStore.getState().setStep;
  const statusMessage = useAddAccountTransitionState.useState.statusMessage();
  const busy = useAddAccountTransitionState.useState.busy();

  useInit(loadAccounts);
  // Belt and braces for an entry path that does not go through the runner —
  // invalidate() already clears this on every successful exit, but a fresh
  // mount (including the add-more re-entry via `replace`) should never be
  // able to show a message from a previous visit.
  useInit(() => useAddAccountTransitionState.getState().reset());

  const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: AccountType.Bank,
      selected_color: AcctTokens.midnight.rich,
      currency: baseCurrency,
      interest_tracking: false,
      credit_limit: '',
      apr: '',
      revolving_balance: '',
      min_payment: '',
      due_day: '',
    },
  });

  const onSubmit = async (data: AddAccountFormData) => {
    const session = useAddAccountTransitionState.getState().begin();
    if (session === null) return;

    const isCC = data.selected_type === AccountType.CreditCard;

    await runOnboardingTransition({
      session,
      api: useAddAccountTransitionState.getState(),
      navigate: (href) => router.replace(href),
      desiredStep: OnboardingStep.N3,
      readAccountCount: () => useAccountStore.getState().accounts.length,
      persist: async (resolve, isCurrent) => {
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

        // Truthy check on the raw param string, not `=== 'true'` — MA-008
        // owns fixing this (`?isAddingMore=false` would take this branch
        // too); this task keeps the tail's behaviour identical to today.
        if (isAddingMore) return OnboardingStep.N3;

        // Stale session: the account stays on disk, the step is not
        // written. resolveOnboardingStep's row 5 heals it on next launch.
        if (!isCurrent()) return undefined;

        // accountCount must be read *after* the insert above resolves —
        // reading it any earlier reproduces the first-account hard loop
        // (MA-005 plan Decision 2 row 2).
        const resolved = resolve();
        await setStep(resolved);
        return resolved;
      },
      errorMessage: Strings.n2SaveError,
    });
  };

  const onBack = async () => {
    const session = useAddAccountTransitionState.getState().begin();
    if (session === null) return;

    await runOnboardingTransition({
      session,
      api: useAddAccountTransitionState.getState(),
      navigate: (href) => router.replace(href),
      desiredStep: isAddingMore ? OnboardingStep.N3 : OnboardingStep.N1,
      readAccountCount: () => useAccountStore.getState().accounts.length,
      persist: async (resolve) => {
        // Add-more mode: the persisted step never moved off N3 — nothing to
        // write, only the route changes.
        if (isAddingMore) return OnboardingStep.N3;
        const resolved = resolve();
        await setStep(resolved);
        return resolved;
      },
      errorMessage: Strings.onboardingBackSaveError,
    });
  };

  return {
    form,
    handleSave: form.handleSubmit(onSubmit),
    onBack,
    state: { statusMessage, busy },
  };
}
