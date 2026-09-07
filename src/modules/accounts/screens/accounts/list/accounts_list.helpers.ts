type AccountsListContentInput = {
  loadError: boolean;
  accountCount: number;
};

type AccountsListContent = 'error' | 'empty' | 'rows';

/** The error state wins over both empty states whenever the last read failed. */
export function resolveAccountsListContent({
  loadError,
  accountCount,
}: AccountsListContentInput): AccountsListContent {
  if (loadError) return 'error';
  return accountCount === 0 ? 'empty' : 'rows';
}
