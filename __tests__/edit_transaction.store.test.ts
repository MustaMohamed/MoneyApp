import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import { makeTestBudget, makeTestTransaction } from '@/test_helpers/transaction';

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
      .loadFromTx(makeTestTransaction({ amount: 99.5, budget_id: 'budget-food' }));

    expect(useEditTransactionStore.getState()).toMatchObject({
      amountStr: '99.5',
      budgetId: 'budget-food',
    });
  });

  // §8.9 (W2E c3, #301): the prefill has to equal what is stored, digit for
  // digit, through `formatStoredMoneyText` rather than a bare `String(tx.amount)`.
  // `0.005` is the legacy sub-cent case #301 is about — it must reach the field
  // as '0.005' so Save fails loudly with the floor message, not silently as
  // '0.01' (formatAmount) or as unparseable exponential text ('1e-7').
  it.each([
    [0.005, '0.005'],
    [1e-7, '0.0000001'],
  ])('loads a stored amount of %p as the prefill text %p', (amount, expected) => {
    useEditTransactionStore.getState().loadFromTx(makeTestTransaction({ amount }));

    expect(useEditTransactionStore.getState().amountStr).toBe(expected);
  });

  it('stores available budgets and a selected budget', () => {
    const budget = makeTestBudget({ id: 'budget-food' });
    useEditTransactionStore.getState().setAvailableBudgets([budget]);
    useEditTransactionStore.getState().setBudgetId(budget.id);

    expect(useEditTransactionStore.getState()).toMatchObject({
      availableBudgets: [budget],
      budgetId: budget.id,
    });
  });

  it('clears the inactive draft on reset', () => {
    useEditTransactionStore.getState().loadFromTx(makeTestTransaction());
    useEditTransactionStore.getState().reset();

    expect(useEditTransactionStore.getState()).toMatchObject({
      amountStr: '',
      availableBudgets: [],
      budgetId: undefined,
    });
  });
});
