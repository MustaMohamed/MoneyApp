import { Strings } from '@/constants/strings';

// Named distinctly from the pre-existing `TransactionLoadErrorVariant` in
// `../transactions.presentation.ts:5` ('none' | 'refresh' | 'totals') — that
// one drives which error banner the list shows; this one is this
// component's own render-mode/title selector ('initial' | 'pagination'
// included, 'none' excluded). The two cross at `transactions/index.tsx:221`
// where the presentation type's value is passed in as this component's
// `variant` prop; same-named-but-different was the trap, not the crossing.
export type TransactionLoadErrorTitleVariant = 'initial' | 'refresh' | 'totals' | 'pagination';

const TRANSACTION_LOAD_ERROR_TITLES: Record<TransactionLoadErrorTitleVariant, string> = {
  initial: Strings.transactionsLoadError,
  refresh: Strings.transactionsRefreshError,
  totals: Strings.transactionsTotalsLoadError,
  pagination: Strings.transactionsLoadMoreError,
};

export function resolveTransactionLoadErrorTitle(
  variant: TransactionLoadErrorTitleVariant,
): string {
  return TRANSACTION_LOAD_ERROR_TITLES[variant];
}
