import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { selectReadySummaryState } from '@/modules/onboarding/domain/ready_summary_state';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useAsync } from '@/utils/use_async.hook';
import { useInit } from '@/utils/use_init.hook';

import { useReadyTransitionState } from './ready.state';

export function useReady() {
  const router = useRouter();
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const completeOnboarding = useOnboardingStore.getState().completeOnboarding;
  const setStep = useOnboardingStore.getState().setStep;
  const complete = useAsync(completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);
  const { rate, rateUpdatedAt, isManualOverride } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.rate,
      rateUpdatedAt: s.rate_updated_at,
      // The second provenance source `isRateUsable` accepts. A manual rate
      // saved before the marker existed carries this and nothing else.
      isManualOverride: s.isManualOverride,
    })),
  );
  const backStatusMessage = useReadyTransitionState.useState.statusMessage();
  const busy = useReadyTransitionState.useState.busy();

  // Belt and braces for an entry path that does not go through the runner —
  // invalidate() already clears this on every successful exit, but a fresh
  // mount should never be able to show a message from a previous visit.
  useInit(() => useReadyTransitionState.getState().reset());

  // Derived from store state and nothing else. That is what makes F9 work: a
  // failed completion leaves the screen mounted with its summary intact because
  // there is nothing to blank, skeleton or refetch. There is deliberately no
  // loading branch and no early return above the animation hook (issue #247's
  // shape).
  //
  // Memoised on the five inputs it actually reads, so the re-renders this screen
  // takes for reasons of its own — `busy`, `completing`, the status track — do
  // not re-run the resolver over the account list. The deps ARE the whole input
  // object; adding a field to `StartingNetPositionInput` without adding it here
  // is a stale summary.
  const summary = useMemo(
    () =>
      selectReadySummaryState({ accounts, baseCurrency, rate, rateUpdatedAt, isManualOverride }),
    [accounts, baseCurrency, isManualOverride, rate, rateUpdatedAt],
  );

  const handleComplete = async () => {
    // The double-tap guard is a SYNCHRONOUS store read, matching
    // `useAddAccountTransitionState.getState().begin()` in
    // `src/modules/onboarding/screens/onboarding/add_account/add_account.hook.ts`
    // (NOT the same-named accounts-module hook at
    // `src/modules/accounts/screens/accounts/add_account/add_account.hook.ts`,
    // which has no transition state): complete.isLoading is React state and lags a
    // render, so two taps in one frame both pass it. begin() checks and sets
    // `busy` in one call, and clears the status track for the new attempt —
    // every writer of that track clears it when its own attempt starts.
    const session = useReadyTransitionState.getState().begin();
    if (session === null) return;

    try {
      await complete();
    } catch {
      // complete.isError is already set by useAsync and rendered through
      // state.statusMessage below. The CTA is the retry; no second button
      // appears.
    } finally {
      // In BOTH paths, or `busy` latches true after a failure and every later
      // tap is swallowed — the CTA must stay a live retry.
      useReadyTransitionState.getState().settle(session);
    }
  };

  const onBack = async () => {
    // No `if (complete.isLoading) return` guard: begin() below returns null
    // while a completion holds `busy`, which makes back-during-completion
    // inert through the same one re-entry guard.
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
      // backStatusMessage takes precedence: begin() clears it at the start of
      // every back attempt AND of every completion attempt — so it is non-empty
      // only in the window where the back write is the one that actually
      // failed, and a completion attempted afterwards correctly overwrites it
      // with n4CompleteError instead of leaving it pointing at the chevron.
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
