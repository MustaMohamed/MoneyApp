export type AccountsListEmptyState = 'none' | 'archivedOnly' | 'noAccounts';

export function resolveAccountsListEmptyState(input: {
  activeCount: number;
  archivedCount: number;
}): AccountsListEmptyState {
  if (input.activeCount > 0) return 'none';
  return input.archivedCount > 0 ? 'archivedOnly' : 'noAccounts';
}
