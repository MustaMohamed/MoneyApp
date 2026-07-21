import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

export function getMissingTransactionFormAccountIds(tx: Transaction): string[] {
  const accountState = useAccountStore.getState();
  const knownIds = new Set(
    [...accountState.accounts, ...accountState.accountLookup].map((account) => account.id),
  );
  return [tx.account_id, tx.to_account_id].filter(
    (id): id is string => id !== null && !knownIds.has(id),
  );
}

export function areTransactionFormV2PrerequisitesReady(
  mode: 'add' | 'edit',
  editingTx: Transaction | null,
): boolean {
  if (!useAccountStore.getState().hasLoaded || !useCategoryStore.getState().hasLoaded) {
    return false;
  }
  if (mode === 'add') return true;
  return editingTx !== null && getMissingTransactionFormAccountIds(editingTx).length === 0;
}
