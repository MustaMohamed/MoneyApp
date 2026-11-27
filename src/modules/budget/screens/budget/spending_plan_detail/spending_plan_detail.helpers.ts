import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  buildTransactionRowPresentation,
  isCardCredit,
  primaryAmountFor,
  resolveCategoryGlyph,
  type TransactionRowPresentation,
} from '@/modules/transactions/components/transaction_row.helpers';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { formatCurrencyAmount } from '@/utils/format_amount';
import { formatShortWeekdayDate } from '@/utils/format_date';

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

export const SPENDING_PLAN_DETAIL_SPENDING_TEST_ID = 'spending-plan-detail-spending';

export interface PlanSpendingRowVM {
  id: string;
  presentation: TransactionRowPresentation;
}

export interface PlanSpendingCardVM {
  totalLabel: string;
  count: number;
  rows: PlanSpendingRowVM[];
  /** Present only when `rows` is empty. */
  emptyNote?: string;
}

interface PlanSpendingCardInput {
  plan: Pick<SpendingPlanRowVM, 'spent' | 'startDate' | 'timing' | 'detailCategoryRows'>;
  transactions: readonly Transaction[];
  accountsById: ReadonlyMap<string, Account>;
  categoriesById: ReadonlyMap<string, Category>;
  today: string;
}

function planSpendingRow(
  tx: Transaction,
  account: Account | undefined,
  category: Category | undefined,
  today: string,
): PlanSpendingRowVM {
  const date = formatShortWeekdayDate(tx.transaction_date, today);
  const categoryName = category?.name ?? Strings.uncategorized;
  const title = tx.note?.trim() || categoryName;
  const amount = primaryAmountFor(tx, isCardCredit(tx, account)).withCode;
  return {
    id: tx.id,
    presentation: {
      ...buildTransactionRowPresentation(
        { tx, account, category },
        { lead: date, time: categoryName },
      ),
      ...resolveCategoryGlyph(category),
      title,
      accessibilityLabel: Strings.budgetPlansDetailSpendingRowA11y(
        title,
        amount,
        date,
        categoryName,
      ),
    },
  };
}

function planSpendingEmptyNote(
  plan: PlanSpendingCardInput['plan'],
  categoriesById: ReadonlyMap<string, Category>,
  today: string,
): string {
  if (plan.timing.lifecycle === 'completed') return Strings.budgetPlansDetailSpendingEmptyEnded;
  const startDate = formatShortWeekdayDate(plan.startDate, today);
  if (plan.detailCategoryRows.length === 1) {
    return Strings.budgetPlansDetailSpendingEmptyOne(
      categoriesById.get(plan.detailCategoryRows[0].categoryId)?.name ?? Strings.uncategorized,
      startDate,
    );
  }
  return Strings.budgetPlansDetailSpendingEmptyMany(plan.detailCategoryRows.length, startDate);
}

/** The total is the hero's own `spent`, never a row sum: each category floors at 0. */
export function buildPlanSpendingCard({
  plan,
  transactions,
  accountsById,
  categoriesById,
  today,
}: PlanSpendingCardInput): PlanSpendingCardVM {
  const rows = transactions.map((tx) =>
    planSpendingRow(
      tx,
      accountsById.get(tx.account_id),
      tx.category_id === null ? undefined : categoriesById.get(tx.category_id),
      today,
    ),
  );
  return {
    totalLabel: formatCurrencyAmount(plan.spent, Currency.EGP),
    count: rows.length,
    rows,
    emptyNote: rows.length === 0 ? planSpendingEmptyNote(plan, categoriesById, today) : undefined,
  };
}
