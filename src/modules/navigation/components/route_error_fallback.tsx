import { type ErrorBoundaryProps } from 'expo-router';

import { Strings } from '@/constants/strings';

import { ErrorState } from './error_state';

export function RouteErrorFallback({ retry, error }: ErrorBoundaryProps) {
  console.error('[routeErrorFallback] render-phase error caught by boundary:', error);
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
