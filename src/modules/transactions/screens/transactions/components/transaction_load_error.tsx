import { ErrorState } from '@/components/ui/error_state';
import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

import {
  resolveTransactionLoadErrorAlertProps,
  resolveTransactionLoadErrorTitle,
  type TransactionLoadFailure,
} from './transaction_load_error.helpers';

interface TransactionLoadErrorProps {
  variant: TransactionLoadFailure;
  onRetry: () => void;
}

export function TransactionLoadError({
  variant,
  onRetry,
}: TransactionLoadErrorProps): React.ReactElement {
  const title = resolveTransactionLoadErrorTitle(variant);
  const alertProps = resolveTransactionLoadErrorAlertProps(variant);

  if (alertProps === undefined) {
    return (
      <ErrorState
        edges={[]}
        flat
        iconName="alert-circle-outline"
        title={title}
        description={Strings.transactionsLoadErrorDescription}
        actionLabel={Strings.transactionsLoadRetry}
        actionAccessibilityLabel={Strings.transactionsLoadRetry}
        onAction={onRetry}
        testID="transaction-load-error"
      />
    );
  }

  return (
    <LoadErrorAlert
      {...alertProps}
      title={title}
      retryLabel={Strings.transactionsLoadRetry}
      onRetry={onRetry}
      testID="transaction-load-error"
    />
  );
}
