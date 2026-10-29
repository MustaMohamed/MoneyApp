import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  type AccountChipModel,
  buildAccountChips,
  pruneAccountFilter,
  toggleAccountFilter,
} from '@/components/ui/account_chips.helpers';

import { useAccountStore } from './account.store';

export interface AccountFilterStore<F> {
  getState: () => { appliedFilters: F; setAppliedFilters: (filters: F) => void };
}

export interface AccountChipFilter<F> {
  effectiveFilters: F;
  accountChips: AccountChipModel[];
  /** `undefined` is All accounts. */
  toggleAccountChip: (accountId: string | undefined) => void;
}

/** A list tab's account chips over its applied filter, which drops an account that left once accounts load. */
export function useAccountChipFilter<F extends { accountIds: string[] }>(
  appliedFilters: F,
  store: AccountFilterStore<F>,
): AccountChipFilter<F> {
  const { accounts, accountsLoaded } = useAccountStore(
    useShallow((s) => ({ accounts: s.accounts, accountsLoaded: s.hasLoaded })),
  );

  const effectiveFilters = useMemo(
    () => (accountsLoaded ? pruneAccountFilter(appliedFilters, accounts) : appliedFilters),
    [accounts, accountsLoaded, appliedFilters],
  );
  useEffect(() => {
    if (!accountsLoaded) return;
    // Prunes the store's current filter, never this render's, so a press that landed first survives.
    const { appliedFilters: current, setAppliedFilters } = store.getState();
    const pruned = pruneAccountFilter(current, accounts);
    if (pruned !== current) setAppliedFilters(pruned);
  }, [accounts, accountsLoaded, appliedFilters, store]);

  const accountChips = useMemo(
    () => buildAccountChips(accounts, effectiveFilters.accountIds),
    [accounts, effectiveFilters.accountIds],
  );

  const toggleAccountChip = useCallback(
    (accountId: string | undefined) => {
      const { appliedFilters: current, setAppliedFilters } = store.getState();
      setAppliedFilters(toggleAccountFilter(current, accountId));
    },
    [store],
  );

  return { effectiveFilters, accountChips, toggleAccountChip };
}
