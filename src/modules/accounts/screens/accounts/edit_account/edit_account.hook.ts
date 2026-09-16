import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { toUpdateAccountInput } from '../../../components/account_form/account_form.helpers';
import { useAccountStore } from '../../../store/account.store';
import {
  createEditAccountFormSchema,
  type EditAccountFormData,
} from '../../../utils/edit_account.schema';
import {
  buildEditAccountDraft,
  countFieldErrors,
  resolveEditStatusMessage,
} from './edit_account.helpers';
import { INITIAL_UI_ENTRY, useEditAccountState } from './edit_account.state';

const ACCOUNTS_LIST = '/accounts' as const;

const accountDetailRoute = (accountId: string): `/accounts/${string}` => `/accounts/${accountId}`;

export function useEditAccount() {
  const owner = useId();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const accounts = useAccountStore((s) => s.accounts);
  const archivedAccounts = useAccountStore((s) => s.archivedAccounts);
  const updateAccount = useAccountStore.getState().updateAccount;
  const { saving, saveError } = useEditAccountState(
    useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY),
  );
  const claim = useEditAccountState.getState().claim;
  const setSaving = useEditAccountState.getState().setSaving;
  const setSaveError = useEditAccountState.getState().setSaveError;
  const release = useEditAccountState.getState().release;

  // Archived and deleted rows are absent from `accounts`, so one lookup covers every missing id.
  const account = useMemo(() => accounts.find((a) => a.id === id), [accounts, id]);

  useEffect(() => {
    if (!account) router.back();
  }, [account, router]);

  useEffect(() => {
    claim(owner);
    return () => release(owner);
  }, [owner, claim, release]);

  // The placeholder only stands in on the render the effect above pops.
  const schema = useMemo(
    () =>
      createEditAccountFormSchema(
        accounts,
        archivedAccounts,
        account ?? { id, type: AccountType.Bank, current_balance: 0 },
      ),
    [accounts, archivedAccounts, account, id],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: account ? buildEditAccountDraft(account) : undefined,
  });

  async function onValid(data: EditAccountFormData) {
    // Read off the store: two taps in one frame both see the render's `saving` as false.
    if (!account || useEditAccountState.getState().entries[owner]?.saving) return;
    setSaveError(owner, undefined);
    setSaving(owner, true);
    try {
      await updateAccount(account.id, toUpdateAccountInput(data, account));
    } catch (error) {
      console.error('[editAccount] updateAccount failed:', error);
      setSaveError(owner, Strings.editAccountSaveError);
      return;
    } finally {
      setSaving(owner, false);
    }
    // The detail never reads `loadError`, so a landed write over a failed reload pops to the list that does.
    if (useAccountStore.getState().loadError) router.dismissTo(ACCOUNTS_LIST);
    // POP_TO selects by route, so it steps over a duplicate edit a double tap pushed and never pops the detail.
    else router.dismissTo(accountDetailRoute(account.id));
  }

  const statusMessage = resolveEditStatusMessage({
    errorCount: countFieldErrors(form.formState.errors),
    saveError,
  });

  return {
    state: { account, saving, statusMessage },
    form,
    submit: form.handleSubmit(onValid),
    onBack: () => router.back(),
  };
}
