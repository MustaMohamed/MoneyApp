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

  // Belt and braces for an entry path that does not go through the runner —
  // invalidate() already clears this on every successful exit, but a fresh
  // mount should never be able to show a message from a previous visit.
  useInit(() => useMoreAccountsTransitionState.getState().reset());

  const handleAddAnother = () => {
    const state = useMoreAccountsTransitionState.getState();
    // Same re-entry gate every other control on this screen uses: while
    // handleContinue's N3->N4 step write is in flight, this must not open a
    // route that write can then replace out from under the user (D1).
    if (state.busy) return;
    // Decision 3's invariant — invalidate() immediately before every
    // navigate — applied here too, so a completion that was already in
    // flight before this tap (there is none, given the busy guard above,
    // but a future caller reaching this navigate some other way) cannot
    // land on a stale session.
    state.invalidate();

    // replace, not push — the only remaining push inside the group would
    // otherwise leave [more_accounts, add_account] on the stack, and the
    // add-more N2's own back (which must replace to more_accounts) would
    // stack a second more_accounts on top of it.
    router.replace({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  };

  // E3's CTA — the zero-account dead end. Deliberately not handleAddAnother:
  // no isAddingMore param, because add_account.hook.ts compares === 'true' and
  // an absent param takes the first-account branch, which is the correct one
  // when no account exists; and no setStep, because nothing on N3 may write a
  // step outside handleContinue/onBack (S14, S15).
  const handleAddFirstAccount = () => {
    const state = useMoreAccountsTransitionState.getState();
    // E3 keeps the header and its back chevron (S14), so a transition can be
    // in flight when this is tapped — the same D1 re-entry gate as above.
    if (state.busy) return;
    // Decision 3's invariant: invalidate() immediately before every navigate.
    state.invalidate();

    router.replace('/(onboarding)/add_account');
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
    handleAddAnother,
    handleAddFirstAccount,
    handleContinue,
    onBack,
    state: { statusMessage, busy },
  };
}
