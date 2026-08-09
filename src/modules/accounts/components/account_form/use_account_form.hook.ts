import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { Currency } from '@/constants/enums';
import { useInit } from '@/utils/use_init.hook';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAccountStore } from '../../store/account.store';
import { createAddAccountSchema, type AddAccountFormData } from '../../utils/add_account.schema';
import { createAccountFormDefaults, toNewAccountInput } from './account_form.helpers';
import { useAccountFormState } from './account_form.state';

export interface UseAccountFormOptions {
  /**
   * Currency the draft starts on. Settings passes Currency.EGP; onboarding
   * (MA-008) passes useOnboardingStore.baseCurrency. The form never reads the
   * onboarding store itself — spec.md:463.
   */
  initialCurrency: Currency;
  /**
   * Copy the host renders when a save fails. Settings passes
   * Strings.errAccountSaveFailed; onboarding (MA-008) passes
   * Strings.n2SaveError and renders it in OnboardingShell's status track.
   */
  saveErrorMessage: string;
  /**
   * Runs after the account row is written, inside the same guarded path.
   * May be async and MAY REJECT: a rejection is reported through
   * state.errorMessage and the next submit() re-runs only this callback —
   * addAccount is never called twice. That is MA-008's post-save checkpoint
   * (its Details § "The post-save checkpoint"); Settings' implementation is
   * `router.back()`, which cannot reject, so the branch is unreachable from
   * this task's host and is covered by unit test instead.
   *
   * Return `false` to DECLINE (MA-008 D10): the row stays, nothing is
   * reported as an error, and the session stays retryable — use this when
   * onSaved backed out without completing (e.g. a competing transition won
   * the race). Anything else — `undefined`, `void`, `true` — COMPLETES the
   * session: submit() then treats every further tap as a no-op, because a
   * completed session's host is already navigating away.
   */
  onSaved: () => boolean | void | Promise<boolean | void>;
}

export interface AccountFormApi {
  form: UseFormReturn<AddAccountFormData>;
  /** Wire to the host's CTA. Validates, then saves under the guard. */
  submit: () => Promise<void>;
  state: { saving: boolean; errorMessage: string | undefined };
}

export function useAccountForm({
  initialCurrency,
  saveErrorMessage,
  onSaved,
}: UseAccountFormOptions): AccountFormApi {
  const accounts = useAccountStore((s) => s.accounts);
  const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);
  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: createAccountFormDefaults(initialCurrency),
  });
  const saving = useAccountFormState.useState.saving();
  const errorMessage = useAccountFormState.useState.errorMessage();

  useInit(() => useAccountFormState.getState().reset());

  const onValid = async (data: AddAccountFormData) => {
    const state = useAccountFormState.getState();
    if (!state.beginSave()) return; // synchronous re-entry guard

    try {
      if (!useAccountFormState.getState().inserted) {
        const sortOrder = useAccountStore.getState().accounts.length;
        await useAccountStore.getState().addAccount(toNewAccountInput(data, { sortOrder }));
        useAccountFormState.getState().markInserted();
      }
      const declined = (await onSaved()) === false;
      if (declined) useAccountFormState.getState().declineSave();
      else useAccountFormState.getState().finishSave();
    } catch (error) {
      console.error('[useAccountForm] save failed:', error);
      useAccountFormState.getState().failSave(saveErrorMessage);
    }
  };

  const handleSubmit = form.handleSubmit(onValid);

  const submit = async () => {
    const latch = useAccountFormState.getState();
    // A completed session is terminal: onSaved ran to the end, which on both
    // hosts means the screen is already navigating away. Only a fresh mount
    // re-arms the form. Without this the D9 bypass below re-runs onSaved
    // after a SUCCESSFUL save (MA-008 impl review round 1, D-1) — two
    // router.back() calls on Settings, a duplicate setStep+replace on N2.
    if (latch.completed) return;

    // Post-save checkpoint (MA-008 D9). Once the row is on disk the draft has
    // already passed validation once, and the schema has since been rebuilt
    // from an accounts array that CONTAINS that row — re-validating fails
    // errNameDuplicate against the account this form itself created, and the
    // retry can never reach onSaved. Re-enter the guarded tail directly;
    // onValid's `inserted` check is what keeps addAccount from running twice.
    if (latch.inserted) return onValid(form.getValues());
    return handleSubmit();
  };

  return { form, submit, state: { saving, errorMessage } };
}
