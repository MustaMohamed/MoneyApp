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

  // Belt and braces for an entry path that does not go through the runner —
  // invalidate() already clears this on every successful exit, but a fresh
  // mount (including the add-more re-entry via `replace`) should never be
  // able to show a message from a previous visit.
  useInit(() => useAddAccountTransitionState.getState().reset());

  const { form, submit, state } = useAccountForm({
    initialCurrency: baseCurrency,
    saveErrorMessage: Strings.n2SaveError,
    onSaved: async () => {
      // D4: a back that started inside the CTA's validation window is not
      // covered by handleSave's pre-submit check. Return, do not throw —
      // this is exactly today's isCurrent() -> `return undefined`: the row
      // stays on disk, no step is written, nothing navigates, no error is
      // shown, and resolveOnboardingStep heals the step on next launch.
      if (useAddAccountTransitionState.getState().busy) return;

      // resolve AFTER the insert — useAccountForm calls onSaved only past
      // markInserted(), so accounts.length already includes the new row.
      // Reading it earlier reproduces MA-005 Decision 2 row 2's hard loop.
      const resolved = isAddingMore
        ? OnboardingStep.N3
        : resolveOnboardingStep(OnboardingStep.N3, useAccountStore.getState().accounts.length);

      // Add-more: the persisted step never moved off N3, so there is nothing
      // to write and only the route changes — identical to
      // add_account.hook.ts:106 before this task.
      if (!isAddingMore) await setStep(resolved);

      // No catch: a rejecting setStep propagates to useAccountForm's catch,
      // which calls failSave(Strings.n2SaveError) and leaves `inserted`
      // latched. Persist-before-navigate is structural — the replace below
      // is unreachable from a failed write.
      useAddAccountTransitionState.getState().invalidate(); // MA-005 Decision 3
      router.replace(ONBOARDING_STEP_HREF[resolved]);
    },
  });

  const handleSave = async () => {
    // D3: the back path's guard, checked before validation so nothing moves.
    if (useAddAccountTransitionState.getState().busy) return;
    // D2: mirror of ready.hook.ts:57-61 — every writer of the single status
    // track clears it when its own attempt starts. beginSave() clears only
    // the form's channel, and the merge below always prefers the transition
    // channel, so without this a failed back stays pinned over a failed
    // save. Safe: the early return above means no back transition is live.
    useAddAccountTransitionState.getState().reset();
    await submit();
  };

  const onBack = async () => {
    // D3: spec.md:81 — back is inert during the write.
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
    handleSave,
    onBack,
    state: { statusMessage: transitionStatusMessage || state.errorMessage, saving: state.saving },
  };
}
