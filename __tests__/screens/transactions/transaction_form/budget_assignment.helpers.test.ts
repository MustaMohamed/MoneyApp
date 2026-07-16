import type { Budget } from '@/modules/budget/entities/budget.entity';
import {
  isSameBudgetEligibility,
  resolveBudgetAssignment,
} from '@/modules/transactions/screens/transactions/transaction_form/budget_assignment.helpers';

const NOW = '2026-07-01T00:00:00.000Z';

function budget(id: string): Budget {
  return {
    id,
    category_id: 'c1',
    name: id,
    limit_amount: 500,
    effective_from: '2026-07',
    created_at: NOW,
    updated_at: NOW,
  };
}

describe('resolveBudgetAssignment', () => {
  it('hides and clears assignment when no budget matches', () => {
    expect(
      resolveBudgetAssignment({ budgets: [], currentBudgetId: undefined, preserveNull: false }),
    ).toEqual({ budgetId: undefined, requiresSelection: false, isVisible: false });
  });

  it('auto-selects the only matching budget', () => {
    expect(
      resolveBudgetAssignment({
        budgets: [budget('one')],
        currentBudgetId: undefined,
        preserveNull: false,
      }),
    ).toEqual({ budgetId: 'one', requiresSelection: false, isVisible: true });
  });

  it('requires a choice for a new expense with multiple budgets', () => {
    expect(
      resolveBudgetAssignment({
        budgets: [budget('a'), budget('b')],
        currentBudgetId: undefined,
        preserveNull: false,
      }),
    ).toEqual({ budgetId: undefined, requiresSelection: true, isVisible: true });
  });

  it('preserves a historical null on an unchanged edit', () => {
    expect(
      resolveBudgetAssignment({
        budgets: [budget('a'), budget('b')],
        currentBudgetId: undefined,
        preserveNull: true,
      }),
    ).toEqual({ budgetId: undefined, requiresSelection: false, isVisible: true });
  });

  it('preserves a historical null even when only one budget now matches', () => {
    expect(
      resolveBudgetAssignment({
        budgets: [budget('one')],
        currentBudgetId: undefined,
        preserveNull: true,
      }),
    ).toEqual({ budgetId: undefined, requiresSelection: false, isVisible: true });
  });

  it('retains a current selection only while it remains available', () => {
    expect(
      resolveBudgetAssignment({
        budgets: [budget('a'), budget('b')],
        currentBudgetId: 'b',
        preserveNull: false,
      }).budgetId,
    ).toBe('b');
    expect(
      resolveBudgetAssignment({
        budgets: [budget('a'), budget('b')],
        currentBudgetId: 'missing',
        preserveNull: false,
      }).budgetId,
    ).toBeUndefined();
  });
});

describe('isSameBudgetEligibility', () => {
  it('compares category and calendar month', () => {
    const transaction = { category_id: 'c1', transaction_date: '2026-07-10' };
    expect(isSameBudgetEligibility(transaction, 'c1', '2026-07-25')).toBe(true);
    expect(isSameBudgetEligibility(transaction, 'c2', '2026-07-25')).toBe(false);
    expect(isSameBudgetEligibility(transaction, 'c1', '2026-08-01')).toBe(false);
  });
});
