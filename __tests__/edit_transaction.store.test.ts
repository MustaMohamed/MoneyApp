import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 150,
    currency: Currency.EGP,
    egp_amount: 150,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    budget_id: null,
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
    revolving_balance_delta: overrides.revolving_balance_delta ?? null,
  };
}

beforeEach(() => useEditTransactionStore.getState().reset());

describe('useEditTransactionStore', () => {
  it('starts with an empty inactive draft', () => {
    expect(useEditTransactionStore.getState()).toMatchObject({
      amountStr: '',
      availableBudgets: [],
      budgetId: undefined,
    });
  });

  it('loads the amount and named-budget assignment from the edit target', () => {
    useEditTransactionStore
      .getState()
      .loadFromTx(makeTx({ amount: 99.5, budget_id: 'budget-food' }));

    expect(useEditTransactionStore.getState()).toMatchObject({
      amountStr: '99.5',
      budgetId: 'budget-food',
    });
  });

  it('stores available budgets and a selected budget', () => {
    const budget = { id: 'budget-food' } as Budget;
    useEditTransactionStore.getState().setAvailableBudgets([budget]);
    useEditTransactionStore.getState().setBudgetId(budget.id);

    expect(useEditTransactionStore.getState()).toMatchObject({
      availableBudgets: [budget],
      budgetId: budget.id,
    });
  });

  it('clears the inactive draft on reset', () => {
    useEditTransactionStore.getState().loadFromTx(makeTx());
    useEditTransactionStore.getState().reset();

    expect(useEditTransactionStore.getState()).toMatchObject({
      amountStr: '',
      availableBudgets: [],
      budgetId: undefined,
    });
  });
});
