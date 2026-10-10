import { Strings } from '@/constants/strings';

// Not `TransactionLoadErrorVariant` in `../transactions.presentation.ts`, which picks the banner.
export type TransactionLoadErrorTitleVariant =
  | 'initial'
  | 'refresh'
  | 'totals'
  | 'accounts'
  | 'pagination';

const TRANSACTION_LOAD_ERROR_TITLES: Record<TransactionLoadErrorTitleVariant, string> = {
  initial: Strings.transactionsLoadError,
  refresh: Strings.transactionsRefreshError,
  totals: Strings.transactionsTotalsLoadError,
  accounts: Strings.transactionsAccountLookupError,
  pagination: Strings.transactionsLoadMoreError,
};

export function resolveTransactionLoadErrorTitle(
  variant: TransactionLoadErrorTitleVariant,
): string {
  return TRANSACTION_LOAD_ERROR_TITLES[variant];
}

export type TransactionLoadErrorAlertProps =
  | { mode: 'inline'; tinted: true; flatRetry: true }
  | { mode: 'floating'; floatingOffset: 'tabBar'; tinted: true; flatRetry: true };

const INLINE_ALERT_PROPS: TransactionLoadErrorAlertProps = {
  mode: 'inline',
  tinted: true,
  flatRetry: true,
};

const FLOATING_ALERT_PROPS: TransactionLoadErrorAlertProps = {
  mode: 'floating',
  floatingOffset: 'tabBar',
  tinted: true,
  flatRetry: true,
};

/** `undefined` for the first load, which draws the error-state block and no alert. */
export function resolveTransactionLoadErrorAlertProps(
  variant: TransactionLoadErrorTitleVariant,
): TransactionLoadErrorAlertProps | undefined {
  if (variant === 'initial') return undefined;
  return variant === 'pagination' ? INLINE_ALERT_PROPS : FLOATING_ALERT_PROPS;
}
