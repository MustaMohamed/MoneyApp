import { useRouter } from 'expo-router';

import { OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useAsync } from '@/utils/use_async.hook';
import { useInit } from '@/utils/use_init.hook';

import { computeTotalBalance } from './ready.helpers';
import { useReadyTransitionState } from './ready.state';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReady() {
  const router = useRouter();
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const completeOnboarding = useOnboardingStore.getState().completeOnboarding;
  const setStep = useOnboardingStore.getState().setStep;
  const complete = useAsync(completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);
  const backStatusMessage = useReadyTransitionState.useState.statusMessage();
  const busy = useReadyTransitionState.useState.busy();

  // Belt and braces for an entry path that does not go through the runner —
  // invalidate() already clears this on every successful exit, but a fresh
  // mount should never be able to show a message from a previous visit.
  useInit(() => useReadyTransitionState.getState().reset());

  const total = computeTotalBalance(accounts);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);

  // 3-row summary — Security row is dropped (spec §2.6)
  const rows: SummaryRow[] = [
    {
      label: Strings.o6Currency,
      value: baseCurrency,
      gold: true,
    },
    {
      label: Strings.o6Accounts,
      value: `${accounts.length} ${Strings.o6AccountsUnit}`,
      gold: false,
    },
    {
      label: Strings.o6TotalBalance,
      value: `${formattedTotal} ${baseCurrency}`,
      gold: true,
    },
  ];

  const handleComplete = async () => {
    if (complete.isLoading) return;
    // Same contract as begin(): every writer of the status track clears it
    // when its own attempt starts. useAsync does this for isError at
    // use_async.hook.ts:23; a stale backStatusMessage needs the mirror, or a
    // completion attempted after a failed back keeps naming the chevron.
    useReadyTransitionState.getState().reset();
    try {
      await complete();
    } catch {
      // complete.isError is already set by useAsync (use_async.hook.ts:39)
      // and rendered via state.statusMessage below. The CTA is the retry;
      // no second button appears.
    }
  };

  const onBack = async () => {
    // A live back button during the completion write is a race this task's
    // own back chevron would otherwise introduce.
    if (complete.isLoading) return;

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
      rows,
      completing: complete.isLoading,
      // backStatusMessage takes precedence: begin() clears it on every back
      // attempt, and handleComplete's own reset() now clears it at the start
      // of every completion attempt too — so it is non-empty only in the
      // window where the back write is the one that actually failed, and a
      // completion attempted afterwards correctly overwrites it with
      // n4CompleteError instead of leaving it pointing at the chevron.
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
