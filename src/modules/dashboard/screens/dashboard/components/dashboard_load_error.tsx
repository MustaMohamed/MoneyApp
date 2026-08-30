import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

import {
  resolveDashboardLoadErrorTitle,
  type DashboardLoadErrorVariant,
} from './dashboard_load_error.helpers';

interface DashboardLoadErrorProps {
  variant: DashboardLoadErrorVariant;
  onRetry: () => void;
}

export function DashboardLoadError({
  variant,
  onRetry,
}: DashboardLoadErrorProps): React.ReactElement {
  const title = resolveDashboardLoadErrorTitle(variant);

  if (variant === 'initial') {
    return (
      <LoadErrorAlert
        mode="fill"
        title={title}
        retryLabel={Strings.dashboardLoadRetry}
        onRetry={onRetry}
        testID="dashboard-load-error"
      />
    );
  }

  return (
    <LoadErrorAlert
      mode="floating"
      floatingOffset="tabBar"
      title={title}
      retryLabel={Strings.dashboardLoadRetry}
      onRetry={onRetry}
      testID="dashboard-load-error"
    />
  );
}
