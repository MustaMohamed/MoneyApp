import { useRouter } from 'expo-router';

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
  const setStep = useOnboardingStore.getState().setStep;
  const statusMessage = useMoreAccountsTransitionState.useState.statusMessage();
  const busy = useMoreAccountsTransitionState.useState.busy();

  // A fresh mount must never show a status message from a previous visit.
  useInit(() => useMoreAccountsTransitionState.getState().reset());

  const handleAddAnother = () => {
    const state = useMoreAccountsTransitionState.getState();
    // While the N3->N4 step write is in flight, do not open a route it can replace.
    if (state.busy) return;
    // Invalidate immediately before every navigate so a completing session cannot land stale.
    state.invalidate();

    // replace, not push: push would leave [more_accounts, add_account] on the stack.
    router.replace({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  };

  // No `isAddingMore` param, so `add_account` takes its first-account branch.
  const handleAddFirstAccount = () => {
    const state = useMoreAccountsTransitionState.getState();
    // A transition can be in flight here, since the back chevron stays visible.
    if (state.busy) return;
    state.invalidate();

    router.replace('/(onboarding)/add_account');
  };

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
    handleAddAnother,
    handleAddFirstAccount,
    handleContinue,
    onBack,
    state: { statusMessage, busy },
  };
}
