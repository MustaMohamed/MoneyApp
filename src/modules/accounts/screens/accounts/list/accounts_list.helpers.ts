type AccountsListContentInput = {
  loadError: boolean;
  accountCount: number;
};

type AccountsListContent = 'error' | 'empty' | 'rows';

export function resolveAccountsListContent({
  loadError,
  accountCount,
}: AccountsListContentInput): AccountsListContent {
  if (loadError) return 'error';
  return accountCount === 0 ? 'empty' : 'rows';
}
