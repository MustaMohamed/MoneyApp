import type { LoadErrorAlertProps } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

// Not `TransactionLoadErrorVariant` in `../transactions.presentation.ts`, which picks the banner.
export type TransactionLoadFailure = 'initial' | 'refresh' | 'totals' | 'accounts' | 'pagination';

const TRANSACTION_LOAD_ERROR_TITLES: Record<TransactionLoadFailure, string> = {
  initial: Strings.transactionsLoadError,
  refresh: Strings.transactionsRefreshError,
  totals: Strings.transactionsTotalsLoadError,
  accounts: Strings.transactionsAccountLookupError,
  pagination: Strings.transactionsLoadMoreError,
};

export function resolveTransactionLoadErrorTitle(variant: TransactionLoadFailure): string {
  return TRANSACTION_LOAD_ERROR_TITLES[variant];
}

// `satisfies`, since the JSX spread these reach the alert through runs no excess-key check.
const INLINE_ALERT_PROPS = {
  mode: 'inline',
  tinted: true,
  flatRetry: true,
} satisfies Partial<Extract<LoadErrorAlertProps, { mode: 'inline' }>>;

const FLOATING_ALERT_PROPS = {
  mode: 'floating',
  floatingOffset: 'tabBar',
  tinted: true,
  flatRetry: true,
} satisfies Partial<Extract<LoadErrorAlertProps, { mode: 'floating' }>>;

type TransactionLoadErrorAlertProps = typeof INLINE_ALERT_PROPS | typeof FLOATING_ALERT_PROPS;

const TRANSACTION_LOAD_ERROR_ALERT_PROPS: Record<
  TransactionLoadFailure,
  TransactionLoadErrorAlertProps | undefined
> = {
  initial: undefined,
  refresh: FLOATING_ALERT_PROPS,
  totals: FLOATING_ALERT_PROPS,
  accounts: FLOATING_ALERT_PROPS,
  pagination: INLINE_ALERT_PROPS,
};

/** `undefined` for the first load, which draws the error-state block and no alert. */
export function resolveTransactionLoadErrorAlertProps(
  variant: TransactionLoadFailure,
): TransactionLoadErrorAlertProps | undefined {
  return TRANSACTION_LOAD_ERROR_ALERT_PROPS[variant];
}
