import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { Strings } from '@/constants/strings';

export type CategoryDetailViewState =
  | 'loading'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData'
  | 'ready';

export interface CategoryDetailViewStateInput {
  hasLoaded: boolean;
  hasCategory: boolean;
  loadError: boolean;
}

export function resolveCategoryDetailViewState({
  hasLoaded,
  hasCategory,
  loadError,
}: CategoryDetailViewStateInput): CategoryDetailViewState {
  if (!hasLoaded) return loadError ? 'firstLoadError' : 'loading';
  // An error with nothing to show draws flat, as the commitment detail does.
  if (!hasCategory) return loadError ? 'firstLoadError' : 'notFound';
  return loadError ? 'refreshErrorWithData' : 'ready';
}

export function categoryDetailShowsBody(viewState: CategoryDetailViewState): boolean {
  return viewState === 'ready' || viewState === 'refreshErrorWithData';
}

export const BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY: DetailLoadErrorCopy = {
  loadTitle: Strings.budgetCategoryDetailLoadErrorTitle,
  refreshTitle: Strings.budgetCategoryDetailRefreshErrorTitle,
  description: Strings.budgetCategoryDetailLoadErrorDescription,
  retryLabel: Strings.budgetLoadRetry,
};

export const BUDGET_CATEGORY_DETAIL_LOAD_ERROR_TEST_ID = 'budget-category-detail-load-error';

export const BUDGET_CATEGORY_DETAIL_NOT_FOUND_TEST_ID = 'budget-category-detail-not-found';
