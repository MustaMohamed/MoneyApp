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
  /** Currency the draft starts on; the form never reads the onboarding store itself. */
  initialCurrency: Currency;
  saveErrorMessage: string;
  /** Runs after the row is written; return `false` to decline and keep the session retryable. */
  onSaved: () => boolean | void | Promise<boolean | void>;
}

export interface AccountFormApi {
  form: UseFormReturn<AddAccountFormData>;
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
    // Terminal: without it the `inserted` bypass below re-runs `onSaved` after a successful save.
    if (latch.completed) return;

    // Re-validating now fails `errNameDuplicate` against the row this form just created.
    if (latch.inserted) return onValid(form.getValues());
    return handleSubmit();
  };

  return { form, submit, state: { saving, errorMessage } };
}
