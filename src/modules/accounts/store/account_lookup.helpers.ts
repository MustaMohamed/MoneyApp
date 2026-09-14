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
