import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useBaseCurrencyStore } from '@/modules/currency/store/base_currency.store';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useInit } from '@/utils/use_init.hook';

import { useWelcomeTransitionState } from './welcome.state';

export function useWelcome() {
  const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency);
  const setBaseCurrency = useBaseCurrencyStore.getState().setBaseCurrency;
  const setStep = useOnboardingStore.getState().setStep;
  const router = useRouter();
  const [selected, setSelected] = useState<Currency>(baseCurrency);
  const statusMessage = useWelcomeTransitionState.useState.statusMessage();
  const busy = useWelcomeTransitionState.useState.busy();

  // Redundant with `invalidate()` on exit, but a fresh mount must not show a stale message.
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
        // This write cannot change the account count, so the destination resolves up front.
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
