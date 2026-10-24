import type { Account } from '../entities/account.entity';

interface AccountLookupSources {
  accounts: readonly Account[];
  archivedAccounts: readonly Account[];
  accountLookupById: Readonly<Record<string, Account>>;
}

export interface AccountsByIdRead {
  accountsById: ReadonlyMap<string, Account>;
  lookupFailed: boolean;
}

// Later entries replace earlier ones, so the active and archived lists win over a cached copy.
function mergeAccountsById(
  accounts: readonly Account[],
  archivedAccounts: readonly Account[],
  lookupById: Readonly<Record<string, Account>>,
): Map<string, Account> {
  return new Map(
    [...Object.values(lookupById), ...archivedAccounts, ...accounts].map((account) => [
      account.id,
      account,
    ]),
  );
}

export function readAccountsById(sources: AccountLookupSources): Map<string, Account> {
  return mergeAccountsById(sources.accounts, sources.archivedAccounts, sources.accountLookupById);
}

export function getTransactionAccountIds(transaction: {
  account_id: string;
  to_account_id: string | null;
}): string[] {
  return transaction.to_account_id === null
    ? [transaction.account_id]
    : [transaction.account_id, transaction.to_account_id];
}

export function findMissingAccountIds(
  ids: readonly string[],
  accountsById: ReadonlyMap<string, Account>,
): string[] {
  return ids.filter((id) => !accountsById.has(id));
}

export function lookupLeavesUnresolved(read: AccountsByIdRead, ids: readonly string[]): boolean {
  return read.lookupFailed && findMissingAccountIds(ids, read.accountsById).length > 0;
}

// A delete is terminal, so a row of a deleted id that is not marked deleted was read before the delete.
export function dropCopiesReadBeforeDelete(
  rows: readonly Account[],
  deletedIds: ReadonlySet<string>,
): Account[] {
  return rows.filter((row) => row.is_deleted === 1 || !deletedIds.has(row.id));
}
