import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

import { OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useInit } from '@/utils/use_init.hook';

import { useMoreAccountsTransitionState } from './more_accounts.state';

export function useMoreAccounts() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const setStep = useOnboardingStore.getState().setStep;
  const statusMessage = useMoreAccountsTransitionState.useState.statusMessage();
  const busy = useMoreAccountsTransitionState.useState.busy();

  const initialCountRef = useRef<number>(accounts.length);
  const initialCount = initialCountRef.current;

  useFocusEffect(
    useCallback(() => {
      void loadAccounts();
    }, [loadAccounts]),
  );

  // Belt and braces for an entry path that does not go through the runner —
  // invalidate() already clears this on every successful exit, but a fresh
  // mount should never be able to show a message from a previous visit.
  useInit(() => useMoreAccountsTransitionState.getState().reset());

  const handleAddAnother = () => {
    // replace, not push — the only remaining push inside the group would
    // otherwise leave [more_accounts, add_account] on the stack, and the
    // add-more N2's own back (which must replace to more_accounts) would
    // stack a second more_accounts on top of it.
    router.replace({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  };

  // Renamed from handleDone → handleContinue (spec §2.5); navigates to N4 (was O6)
  const handleContinue = async () => {
    const session = useMoreAccountsTransitionState.getState().begin();
    if (session === null) return;

    await runOnboardingTransition({
      session,
      api: useMoreAccountsTransitionState.getState(),
      navigate: (href) => router.replace(href),
      desiredStep: OnboardingStep.N4,
      readAccountCount: () => useAccountStore.getState().accounts.length,
      persist: async (resolve) => {
        const resolved = resolve();
        await setStep(resolved);
        return resolved;
      },
      errorMessage: Strings.n3StepSaveError,
    });
  };

  const onBack = async () => {
    const session = useMoreAccountsTransitionState.getState().begin();
    if (session === null) return;

    await runOnboardingTransition({
      session,
      api: useMoreAccountsTransitionState.getState(),
      navigate: (href) => router.replace(href),
      desiredStep: OnboardingStep.N1,
      readAccountCount: () => useAccountStore.getState().accounts.length,
      persist: async (resolve) => {
        const resolved = resolve();
        await setStep(resolved);
        return resolved;
      },
      errorMessage: Strings.onboardingBackSaveError,
    });
  };

  return {
    accounts,
    initialCount,
    handleAddAnother,
    handleContinue,
    onBack,
    state: { statusMessage, busy },
  };
}
