import { useLocalSearchParams, useRouter } from 'expo-router';

import { OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountFormState } from '@/modules/accounts/components/account_form/account_form.state';
import { useAccountForm } from '@/modules/accounts/components/account_form/use_account_form.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import {
  ONBOARDING_STEP_HREF,
  resolveOnboardingStep,
} from '@/modules/onboarding/domain/onboarding_route';
import { runOnboardingTransition } from '@/modules/onboarding/domain/onboarding_transition';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useInit } from '@/utils/use_init.hook';

import { useAddAccountTransitionState } from './add_account.state';

export function useAddAccount() {
  const router = useRouter();
  const isAddingMore = useLocalSearchParams<{ isAddingMore?: string }>().isAddingMore === 'true';
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const setStep = useOnboardingStore.getState().setStep;
  const transitionStatusMessage = useAddAccountTransitionState.useState.statusMessage();

  // Redundant with `invalidate()` on exit; a fresh mount must not show a stale message.
  useInit(() => useAddAccountTransitionState.getState().reset());

  const { form, submit, state } = useAccountForm({
    initialCurrency: baseCurrency,
    saveErrorMessage: Strings.n2SaveError,
    onSaved: async () => {
      // `false`, not void, tells `useAccountForm` this was a decline, not a completion.
      if (useAddAccountTransitionState.getState().busy) return false;

      // Resolve after the insert: `onSaved` runs past `markInserted()`, so the new row is counted.
      const resolved = isAddingMore
        ? OnboardingStep.N3
        : resolveOnboardingStep(OnboardingStep.N3, useAccountStore.getState().accounts.length);

      // Add-more: the persisted step never moved off N3, so only the route changes.
      if (!isAddingMore) await setStep(resolved);

      // No catch: a `setStep` rejection propagates and the replace below never runs.
      useAddAccountTransitionState.getState().invalidate();
      router.replace(ONBOARDING_STEP_HREF[resolved]);
    },
  });

  const handleSave = async () => {
    // The back path's guard, checked before validation so nothing moves.
    if (useAddAccountTransitionState.getState().busy) return;
    // Clear the transition channel first: the merge below prefers it, so a failed back would pin.
    useAddAccountTransitionState.getState().reset();
    await submit();
  };

  const onBack = async () => {
    if (useAccountFormState.getState().saving) return;
    const session = useAddAccountTransitionState.getState().begin();
    if (session === null) return;

    await runOnboardingTransition({
      session,
      api: useAddAccountTransitionState.getState(),
      navigate: (href) => router.replace(href),
      desiredStep: isAddingMore ? OnboardingStep.N3 : OnboardingStep.N1,
      readAccountCount: () => useAccountStore.getState().accounts.length,
      persist: async (resolve) => {
        // Add-more: the persisted step never moved off N3, so only the route changes.
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
    handleSave,
    onBack,
    isAddingMore,
    state: { statusMessage: transitionStatusMessage || state.errorMessage, saving: state.saving },
  };
}
