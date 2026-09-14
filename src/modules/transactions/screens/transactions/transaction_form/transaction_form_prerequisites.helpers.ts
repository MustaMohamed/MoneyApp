import { useAccountStore } from '@/modules/accounts/store/account.store';
import {
  findMissingAccountIds,
  getTransactionAccountIds,
  mergeAccountsById,
} from '@/modules/accounts/store/account_lookup.helpers';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import type { TransactionFormMode } from './transaction_form.types';

const MAX_LOAD_ATTEMPTS = 2;

export type TransactionFormPrerequisiteStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TransactionFormPrerequisiteController {
  status: TransactionFormPrerequisiteStatus;
  retry: () => void;
}

export async function ensureTransactionFormPrerequisite(
  isReady: () => boolean,
  load: () => Promise<void>,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_LOAD_ATTEMPTS; attempt += 1) {
    if (isReady()) return;
    await load();
  }
  if (!isReady()) throw new Error('Transaction form prerequisite did not publish its data');
}

export function getMissingTransactionFormAccountIds(tx: Transaction): string[] {
  const { accounts, archivedAccounts, accountLookupById } = useAccountStore.getState();
  const knownAccounts = mergeAccountsById(accounts, archivedAccounts, accountLookupById);
  return findMissingAccountIds(getTransactionAccountIds(tx), knownAccounts);
}

export function areTransactionFormPrerequisitesReady(
  mode: TransactionFormMode,
  editingTx: Transaction | null,
): boolean {
  if (!useAccountStore.getState().hasLoaded || !useCategoryStore.getState().hasLoaded) {
    return false;
  }
  if (mode === 'add') return true;
  return editingTx !== null && getMissingTransactionFormAccountIds(editingTx).length === 0;
}
