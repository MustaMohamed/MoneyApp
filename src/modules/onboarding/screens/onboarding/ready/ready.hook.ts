import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useBaseCurrencyStore } from '@/modules/currency/store/base_currency.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { selectReadySummaryState } from '@/modules/onboarding/domain/ready_summary_state';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useAsync } from '@/utils/use_async.hook';
import { useInit } from '@/utils/use_init.hook';

import { useReadyTransitionState } from './ready.state';

export function useReady() {
  const router = useRouter();
  const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency);
  const completeOnboarding = useOnboardingStore.getState().completeOnboarding;
  const setStep = useOnboardingStore.getState().setStep;
  const complete = useAsync(completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);
  const { rate, rateUpdatedAt, isManualOverride } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.rate,
      rateUpdatedAt: s.rate_updated_at,
      // The second provenance source `isRateUsable` accepts.
      isManualOverride: s.isManualOverride,
    })),
  );
  const backStatusMessage = useReadyTransitionState.useState.statusMessage();
  const busy = useReadyTransitionState.useState.busy();

  // A fresh mount must never show a status message left by a previous visit.
  useInit(() => useReadyTransitionState.getState().reset());

  // Deps must cover every `StartingNetPositionInput` field or the summary goes stale.
  const summary = useMemo(
    () =>
      selectReadySummaryState({ accounts, baseCurrency, rate, rateUpdatedAt, isManualOverride }),
    [accounts, baseCurrency, isManualOverride, rate, rateUpdatedAt],
  );

  const handleComplete = async () => {
    // `complete.isLoading` lags a render, so two taps in a frame both pass it; `begin()` is sync.
    const session = useReadyTransitionState.getState().begin();
    if (session === null) return;

    try {
      await complete();
    } catch {
      // `complete.isError` is set by `useAsync` and rendered through `statusMessage` below.
    } finally {
      // Runs on both paths, or `busy` latches true after a failure and swallows every later tap.
      useReadyTransitionState.getState().settle(session);
    }
  };

  const onBack = async () => {
    // No `isLoading` guard: `begin()` returns null while a completion holds `busy`.
    const session = useReadyTransitionState.getState().begin();
    if (session === null) return;

    await runOnboardingTransition({
      session,
      api: useReadyTransitionState.getState(),
      navigate: (href) => router.replace(href),
      desiredStep: OnboardingStep.N3,
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
    state: {
      summary,
      completing: complete.isLoading,
      // `begin()` clears this on every attempt, so non-empty means the back write is what failed.
      statusMessage:
        backStatusMessage !== ''
          ? backStatusMessage
          : complete.isError
            ? Strings.n4CompleteError
            : '',
      busy,
    },
    handleComplete,
    onBack,
  };
}
