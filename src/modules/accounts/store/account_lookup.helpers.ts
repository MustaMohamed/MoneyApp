import type { Account } from '../entities/account.entity';

// Later entries replace earlier ones, so the active and archived lists win over a cached copy.
export function mergeAccountsById(
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
