import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { ensureTransactionFormPrerequisite } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.helpers';

import type { TransactionFormMode } from './transaction_form.types';
import { useTransactionFormState } from './transaction_form_host.state';
import { getMissingTransactionFormAccountIds } from './transaction_form_prerequisites.helpers';

async function loadPrerequisites(
  mode: TransactionFormMode,
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
    () => getMissingTransactionFormAccountIds(editingTx).length === 0,
    () =>
      useAccountStore.getState().loadAccountLookup(getMissingTransactionFormAccountIds(editingTx)),
  );
}

export function useTransactionFormPrerequisites(
  sessionId: number,
  mode: TransactionFormMode,
  editingTx: Transaction | null,
) {
  const { prerequisiteGeneration, prerequisiteStatus } = useTransactionFormState(
    useShallow((state) => ({
      prerequisiteGeneration: state.prerequisiteGeneration,
      prerequisiteStatus: state.prerequisiteStatus,
    })),
  );
  const beginPrerequisites = useTransactionFormState.getState().beginPrerequisites;
  const completePrerequisites = useTransactionFormState.getState().completePrerequisites;
  const failPrerequisites = useTransactionFormState.getState().failPrerequisites;
  const retryPrerequisites = useTransactionFormState.getState().retryPrerequisites;

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
