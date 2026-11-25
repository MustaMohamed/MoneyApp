import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { Strings } from '@/constants/strings';

import type { SpendingPlanDetailLoadStatus } from './spending_plan_detail.state';

export type SpendingPlanDetailViewState =
  | 'loading'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData'
  | 'ready';

interface SpendingPlanDetailViewStateInput {
  /** The data entry for the route's id holds a plan. */
  hasPlan: boolean;
  /** The UI entry's load belongs to the plan now on the route. */
  ownsStatus: boolean;
  status: SpendingPlanDetailLoadStatus;
  refreshError: boolean;
}

export function resolveSpendingPlanDetailViewState({
  hasPlan,
  ownsStatus,
  status,
  refreshError,
}: SpendingPlanDetailViewStateInput): SpendingPlanDetailViewState {
  if (!ownsStatus || status === 'loading') return hasPlan ? 'ready' : 'loading';
  if (status === 'firstLoadError') return hasPlan ? 'refreshErrorWithData' : 'firstLoadError';
  if (!hasPlan) return 'notFound';
  if (refreshError) return 'refreshErrorWithData';
  return 'ready';
}

export function spendingPlanDetailShowsBody(viewState: SpendingPlanDetailViewState): boolean {
  return viewState === 'ready' || viewState === 'refreshErrorWithData';
}

export const SPENDING_PLAN_DETAIL_LOAD_ERROR_COPY: DetailLoadErrorCopy = {
  loadTitle: Strings.budgetPlansDetailLoadErrorTitle,
  refreshTitle: Strings.budgetPlansDetailRefreshErrorTitle,
  description: Strings.budgetPlansDetailLoadErrorDescription,
  retryLabel: Strings.budgetPlansDetailRetry,
};

export const SPENDING_PLAN_DETAIL_LOAD_ERROR_TEST_ID = 'spending-plan-detail-load-error';

export const SPENDING_PLAN_DETAIL_HERO_TEST_ID = 'spending-plan-detail-hero';
