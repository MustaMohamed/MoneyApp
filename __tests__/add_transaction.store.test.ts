import { TransactionType } from '@/constants/enums';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

beforeEach(() => useAddTransactionStore.getState().reset());

const budget = { id: 'budget-food' } as Budget;

describe('useAddTransactionStore', () => {
  it('starts with an empty amount for placeholder-based entry', () => {
    expect(useAddTransactionStore.getState()).toMatchObject({
      type: TransactionType.Expense,
      amountStr: '',
      availableBudgets: [],
      budgetId: undefined,
    });
  });

  it('preserves the amount while clearing incompatible budget state on type change', () => {
    useAddTransactionStore.getState().setAmountStr('125.50');
    useAddTransactionStore.getState().setAvailableBudgets([budget]);
    useAddTransactionStore.getState().setBudgetId(budget.id);

    useAddTransactionStore.getState().setType(TransactionType.Income);

    expect(useAddTransactionStore.getState()).toMatchObject({
      type: TransactionType.Income,
      amountStr: '125.50',
      availableBudgets: [],
      budgetId: undefined,
    });
  });

  it('restores the empty Add draft on reset', () => {
    useAddTransactionStore.getState().setType(TransactionType.Transfer);
    useAddTransactionStore.getState().setAmountStr('7');

    useAddTransactionStore.getState().reset();

    expect(useAddTransactionStore.getState()).toMatchObject({
      type: TransactionType.Expense,
      amountStr: '',
    });
  });
});
