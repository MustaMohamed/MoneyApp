import { ErrorState } from '@/components/ui/error_state';
import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

import {
  resolveDetailLoadErrorAlertProps,
  resolveDetailLoadErrorTitle,
} from './detail_load_error.helpers';

interface DetailLoadErrorProps {
  floating?: boolean;
  onRetry: () => void;
}

export function DetailLoadError({
  floating = false,
  onRetry,
}: DetailLoadErrorProps): React.ReactElement {
  const alertProps = resolveDetailLoadErrorAlertProps(floating);

  if (alertProps === undefined) {
    return (
      <ErrorState
        edges={[]}
        flat
        iconName="alert-circle-outline"
        title={resolveDetailLoadErrorTitle(false)}
        description={Strings.detailLoadErrorDescription}
        actionLabel={Strings.detailLoadRetry}
        actionAccessibilityLabel={Strings.detailLoadRetry}
        onAction={onRetry}
        testID="detail-load-error"
      />
    );
  }

  return (
    <LoadErrorAlert
      {...alertProps}
      title={resolveDetailLoadErrorTitle(floating)}
      retryLabel={Strings.detailLoadRetry}
      onRetry={onRetry}
      testID="detail-load-error"
    />
  );
}
