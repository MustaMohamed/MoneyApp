import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

export interface BudgetAssignmentResolution {
  budgetId: string | undefined;
  requiresSelection: boolean;
  isVisible: boolean;
}

export function resolveBudgetAssignment(input: {
  budgets: Budget[];
  currentBudgetId: string | undefined;
  preserveNull: boolean;
}): BudgetAssignmentResolution {
  if (input.budgets.length === 0) {
    return { budgetId: undefined, requiresSelection: false, isVisible: false };
  }

  if (
    input.currentBudgetId &&
    input.budgets.some((budget) => budget.id === input.currentBudgetId)
  ) {
    return { budgetId: input.currentBudgetId, requiresSelection: false, isVisible: true };
  }

  if (input.preserveNull) {
    return { budgetId: undefined, requiresSelection: false, isVisible: true };
  }

  if (input.budgets.length === 1) {
    return { budgetId: input.budgets[0].id, requiresSelection: false, isVisible: true };
  }

  return {
    budgetId: undefined,
    requiresSelection: true,
    isVisible: true,
  };
}

export function isSameBudgetEligibility(
  transaction: Pick<Transaction, 'category_id' | 'transaction_date'>,
  categoryId: string,
  date: string,
): boolean {
  return (
    transaction.category_id === categoryId &&
    transaction.transaction_date.slice(0, 7) === date.slice(0, 7)
  );
}
