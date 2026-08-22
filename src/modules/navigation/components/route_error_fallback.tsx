import { type ErrorBoundaryProps } from 'expo-router';

import { Strings } from '@/constants/strings';

import { ErrorState } from './error_state';

export function RouteErrorFallback({ retry }: ErrorBoundaryProps) {
  return (
    <ErrorState
      iconName="alert-circle-outline"
      title={Strings.renderErrorTitle}
      description={Strings.renderErrorDescription}
      actionLabel={Strings.renderErrorRetry}
      actionAccessibilityLabel={Strings.renderErrorRetry}
      onAction={() => {
        void retry();
      }}
      testID="route-error"
    />
  );
}
