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
   */
  onSaved: () => void | Promise<void>;
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
      await onSaved();
      useAccountFormState.getState().finishSave();
    } catch (error) {
      console.error('[useAccountForm] save failed:', error);
      useAccountFormState.getState().failSave(saveErrorMessage);
    }
  };

  return { form, submit: form.handleSubmit(onValid), state: { saving, errorMessage } };
}
