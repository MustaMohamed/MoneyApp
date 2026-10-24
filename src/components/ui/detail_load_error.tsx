import { ErrorState } from '@/components/ui/error_state';
import { LoadErrorAlert } from '@/components/ui/load_error_alert';

import {
  type DetailLoadErrorCopy,
  resolveDetailLoadErrorAlertProps,
  resolveDetailLoadErrorTitle,
} from './detail_load_error.helpers';

interface DetailLoadErrorProps {
  copy: DetailLoadErrorCopy;
  testID: string;
  floating?: boolean;
  onRetry: () => void;
}

export function DetailLoadError({
  copy,
  testID,
  floating = false,
  onRetry,
}: DetailLoadErrorProps): React.ReactElement {
  const title = resolveDetailLoadErrorTitle(floating, copy);
  const alertProps = resolveDetailLoadErrorAlertProps(floating);

  if (alertProps === undefined) {
    return (
      <ErrorState
        edges={[]}
        flat
        iconName="alert-circle-outline"
        title={title}
        description={copy.description}
        actionLabel={copy.retryLabel}
        actionAccessibilityLabel={copy.retryLabel}
        onAction={onRetry}
        testID={testID}
      />
    );
  }

  return (
    <LoadErrorAlert
      {...alertProps}
      title={title}
      retryLabel={copy.retryLabel}
      onRetry={onRetry}
      testID={testID}
    />
  );
}
