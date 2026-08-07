import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useInit } from '@/utils/use_init.hook';

import { useWelcomeTransitionState } from './welcome.state';

export function useWelcome() {
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const setBaseCurrency = useOnboardingStore.getState().setBaseCurrency;
  const setStep = useOnboardingStore.getState().setStep;
  const router = useRouter();
  const [selected, setSelected] = useState<Currency>(baseCurrency);
  const statusMessage = useWelcomeTransitionState.useState.statusMessage();
  const busy = useWelcomeTransitionState.useState.busy();

  // Belt and braces for an entry path that does not go through the runner —
  // invalidate() already clears this on every successful exit, but a fresh
  // mount should never be able to show a message from a previous visit.
  useInit(() => useWelcomeTransitionState.getState().reset());

  const onContinue = async () => {
    const session = useWelcomeTransitionState.getState().begin();
    if (session === null) return;

    await runOnboardingTransition({
      session,
      api: useWelcomeTransitionState.getState(),
      navigate: (href) => router.replace(href),
      desiredStep: OnboardingStep.N2,
      readAccountCount: () => useAccountStore.getState().accounts.length,
      persist: async (resolve) => {
        // Nothing this write does changes the account count, so the
        // destination can be resolved up front.
        const resolved = resolve();
        await setBaseCurrency(selected);
        await setStep(resolved);
        return resolved;
      },
      errorMessage: Strings.n1StepSaveError,
    });
  };

  return { state: { selected, statusMessage, busy }, setSelected, onContinue };
}
