import { Strings } from '@/constants/strings';

export type DashboardLoadErrorVariant = 'initial' | 'refresh';

const DASHBOARD_LOAD_ERROR_TITLES: Record<DashboardLoadErrorVariant, string> = {
  initial: Strings.dashboardLoadError,
  refresh: Strings.dashboardRefreshError,
};

export function resolveDashboardLoadErrorTitle(variant: DashboardLoadErrorVariant): string {
  return DASHBOARD_LOAD_ERROR_TITLES[variant];
}
