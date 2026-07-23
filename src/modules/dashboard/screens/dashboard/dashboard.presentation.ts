import type {
  DashboardSnapshot,
  DashboardSnapshotStatus,
} from '@/modules/dashboard/repositories/dashboard.repository';

export interface DashboardPresentation {
  hasSnapshot: boolean;
  showDashboardBody: boolean;
  showAccountsEmptyState: boolean;
  showInitialError: boolean;
  showRefreshError: boolean;
  cardLoading: boolean;
  isRefreshing: boolean;
}

export function selectDashboardPresentation(input: {
  status: DashboardSnapshotStatus;
  snapshot: DashboardSnapshot | undefined;
  requestedKey: string | undefined;
}): DashboardPresentation {
  const matchingSnapshot = input.snapshot?.key === input.requestedKey ? input.snapshot : undefined;
  const hasSnapshot = matchingSnapshot !== undefined;
  const showInitialError = !hasSnapshot && input.status === 'initialError';
  const showAccountsEmptyState =
    matchingSnapshot !== undefined && matchingSnapshot.accounts.length === 0;

  return {
    hasSnapshot,
    showDashboardBody: !showInitialError && !showAccountsEmptyState,
    showAccountsEmptyState,
    showInitialError,
    showRefreshError: hasSnapshot && input.status === 'refreshErrorWithData',
    cardLoading: !hasSnapshot && !showInitialError,
    isRefreshing: hasSnapshot && input.status === 'refreshing',
  };
}
