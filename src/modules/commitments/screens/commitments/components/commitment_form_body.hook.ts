import { useEffect, useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { mergeAccountsById } from '@/modules/accounts/store/account_lookup.helpers';

import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

export function useCommitmentFormBodyPickers() {
  const owner = useId();
  const { categoryPickerVisible, showStartDatePicker, showEndDatePicker } =
    useCommitmentFormBodyState(useShallow((s) => s.entries[owner] ?? INITIAL_PICKER_ENTRY));
  const claim = useCommitmentFormBodyState.getState().claim;
  const release = useCommitmentFormBodyState.getState().release;

  useEffect(() => {
    claim(owner);
    return () => release(owner);
  }, [owner, claim, release]);

  const setters = useMemo(() => {
    const state = useCommitmentFormBodyState.getState();
    return {
      setCategoryPickerVisible: (v: boolean) => state.setCategoryPickerVisible(owner, v),
      setShowStartDatePicker: (v: boolean) => state.setShowStartDatePicker(owner, v),
      setShowEndDatePicker: (v: boolean) => state.setShowEndDatePicker(owner, v),
    };
  }, [owner]);

  return {
    state: { categoryPickerVisible, showStartDatePicker, showEndDatePicker },
    ...setters,
  };
}

/** Every account the strip can name: active, archived, and the commitment's own when it was deleted. */
export function useCommitmentFormStripAccounts(
  accountId: string | undefined,
): ReadonlyMap<string, Account> {
  const { accounts, archivedAccounts, accountLookupById } = useAccountStore(
    useShallow((s) => ({
      accounts: s.accounts,
      archivedAccounts: s.archivedAccounts,
      accountLookupById: s.accountLookupById,
    })),
  );

  useEffect(() => {
    // A failure sets the store's `accountLookupError`; the chip reads `Unknown account` meanwhile.
    if (accountId !== undefined) {
      void useAccountStore
        .getState()
        .loadAccountLookup([accountId])
        .catch(() => {});
    }
  }, [accountId]);

  return useMemo(
    () => mergeAccountsById(accounts, archivedAccounts, accountLookupById),
    [accounts, archivedAccounts, accountLookupById],
  );
}
