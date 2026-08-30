import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

import {
  resolveTransactionLoadErrorTitle,
  type TransactionLoadErrorTitleVariant,
} from './transaction_load_error.helpers';

interface TransactionLoadErrorProps {
  variant: TransactionLoadErrorTitleVariant;
  onRetry: () => void;
}

export function TransactionLoadError({
  variant,
  onRetry,
}: TransactionLoadErrorProps): React.ReactElement {
  const title = resolveTransactionLoadErrorTitle(variant);

  if (variant === 'initial') {
    return (
      <LoadErrorAlert
        mode="fill"
        title={title}
        retryLabel={Strings.transactionsLoadRetry}
        onRetry={onRetry}
        testID="transaction-load-error"
      />
    );
  }

  if (variant === 'pagination') {
    return (
      <LoadErrorAlert
        mode="inline"
        title={title}
        retryLabel={Strings.transactionsLoadRetry}
        onRetry={onRetry}
        testID="transaction-load-error"
      />
    );
  }

  return (
    <LoadErrorAlert
      mode="floating"
      floatingOffset="tabBar"
      title={title}
      retryLabel={Strings.transactionsLoadRetry}
      onRetry={onRetry}
      testID="transaction-load-error"
    />
  );
}
