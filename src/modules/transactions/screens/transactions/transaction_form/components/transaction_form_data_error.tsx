import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

interface Props {
  onRetry: () => void;
}

export function TransactionFormDataError({ onRetry }: Props): React.ReactElement {
  return (
    <LoadErrorAlert
      mode="fill"
      title={Strings.addTxDataLoadError}
      retryLabel={Strings.addTxDataLoadRetry}
      onRetry={onRetry}
      testID="transaction-form-data-error"
    />
  );
}
