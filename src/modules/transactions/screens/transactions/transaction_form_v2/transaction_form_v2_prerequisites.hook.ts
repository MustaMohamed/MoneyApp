import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { ensureTransactionFormPrerequisite } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.helpers';

import { type TransactionFormV2Mode, useTransactionFormV2State } from './transaction_form_v2.state';

function getMissingAccountIds(tx: Transaction): string[] {
  const accountState = useAccountStore.getState();
  const knownIds = new Set(
    [...accountState.accounts, ...accountState.accountLookup].map((account) => account.id),
  );
  return [tx.account_id, tx.to_account_id].filter(
    (id): id is string => id !== null && !knownIds.has(id),
  );
}

async function loadPrerequisites(
  mode: TransactionFormV2Mode,
  editingTx: Transaction | null,
): Promise<void> {
  await Promise.all([
    ensureTransactionFormPrerequisite(
      () => useAccountStore.getState().hasLoaded,
      useAccountStore.getState().loadAccounts,
    ),
    ensureTransactionFormPrerequisite(
      () => useCategoryStore.getState().hasLoaded,
      useCategoryStore.getState().loadCategories,
    ),
  ]);

  if (mode !== 'edit' || editingTx === null) return;

  await ensureTransactionFormPrerequisite(
    () => getMissingAccountIds(editingTx).length === 0,
    () => useAccountStore.getState().loadAccountLookup(getMissingAccountIds(editingTx)),
  );
}

export function useTransactionFormV2Prerequisites(
  sessionId: number,
  mode: TransactionFormV2Mode,
  editingTx: Transaction | null,
) {
  const { prerequisiteGeneration, prerequisiteStatus } = useTransactionFormV2State(
    useShallow((state) => ({
      prerequisiteGeneration: state.prerequisiteGeneration,
      prerequisiteStatus: state.prerequisiteStatus,
    })),
  );
  const beginPrerequisites = useTransactionFormV2State.getState().beginPrerequisites;
  const completePrerequisites = useTransactionFormV2State.getState().completePrerequisites;
  const failPrerequisites = useTransactionFormV2State.getState().failPrerequisites;
  const retryPrerequisites = useTransactionFormV2State.getState().retryPrerequisites;

  useEffect(() => {
    if (!beginPrerequisites(sessionId, prerequisiteGeneration)) return;

    void loadPrerequisites(mode, editingTx).then(
      () => completePrerequisites(sessionId, prerequisiteGeneration),
      () => failPrerequisites(sessionId, prerequisiteGeneration),
    );
  }, [
    beginPrerequisites,
    completePrerequisites,
    editingTx,
    failPrerequisites,
    mode,
    prerequisiteGeneration,
    sessionId,
  ]);

  return {
    status: prerequisiteStatus,
    retry: retryPrerequisites,
  };
}
