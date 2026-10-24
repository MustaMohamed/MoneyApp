import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from './account.store';
import { type AccountsByIdRead, readAccountsById } from './account_lookup.helpers';

/** Every account a screen can name, active over archived over the lookup cache; loads nothing. */
export function useAccountsById(): AccountsByIdRead {
  const { accounts, archivedAccounts, accountLookupById, accountLookupError } = useAccountStore(
    useShallow((s) => ({
      accounts: s.accounts,
      archivedAccounts: s.archivedAccounts,
      accountLookupById: s.accountLookupById,
      accountLookupError: s.accountLookupError,
    })),
  );

  const accountsById = useMemo(
    () => readAccountsById({ accounts, archivedAccounts, accountLookupById }),
    [accounts, archivedAccounts, accountLookupById],
  );

  return useMemo(
    () => ({ accountsById, lookupFailed: accountLookupError }),
    [accountsById, accountLookupError],
  );
}
