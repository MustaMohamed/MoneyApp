import { Strings } from '@/constants/strings';

import { ErrorState } from './error_state';
import { resolveStartupRetryPresentation } from './startup_error.helpers';

interface StartupErrorProps {
  isRetrying?: boolean;
  onRetry: () => void;
}

export function StartupError({ isRetrying = false, onRetry }: StartupErrorProps) {
  const retryPresentation = resolveStartupRetryPresentation(isRetrying);

  return (
    <ErrorState
      iconName="database-alert-outline"
      title={Strings.startupErrorTitle}
      description={Strings.startupErrorDescription}
      actionLabel={retryPresentation.label}
      actionAccessibilityLabel={Strings.startupErrorRetry}
      onAction={onRetry}
      isActionLoading={isRetrying}
      isActionDisabled={retryPresentation.isDisabled}
      testID="startup-error"
    />
  );
}
