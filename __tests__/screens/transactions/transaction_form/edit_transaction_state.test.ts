import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';

describe('useEditTransactionState', () => {
  beforeEach(() => {
    useEditTransactionState.getState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const s = useEditTransactionState.getState();
    expect(s).toMatchObject({
      visible: false,
      saving: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
      budgetsLoading: false,
      budgetLookupVersion: 0,
      budgetLookupError: undefined,
      errorMessage: undefined,
      preserveBudgetNull: false,
      rateOverride: false,
    });
  });

  it('open() sets visible=true', () => {
    useEditTransactionState.getState().open({ id: 't1' } as any);
    expect(useEditTransactionState.getState().visible).toBe(true);
  });

  it('close() resets to initial', () => {
    useEditTransactionState.getState().open({ id: 't1' } as any);
    useEditTransactionState.getState().setSaving(true);
    useEditTransactionState.getState().close();
    expect(useEditTransactionState.getState().visible).toBe(false);
    expect(useEditTransactionState.getState().saving).toBe(false);
  });

  it('tracks lookup and save errors and clears them for retry or edits', () => {
    useEditTransactionState.getState().setBudgetLookupError('Lookup failed');
    useEditTransactionState.getState().setErrorMessage('Save failed');
    expect(useEditTransactionState.getState()).toMatchObject({
      budgetLookupError: 'Lookup failed',
      errorMessage: 'Save failed',
    });

    useEditTransactionState.getState().retryBudgetLookup();
    expect(useEditTransactionState.getState().budgetLookupVersion).toBe(1);
    expect(useEditTransactionState.getState().budgetLookupError).toBeUndefined();
    useEditTransactionState.getState().clearError();
    expect(useEditTransactionState.getState().errorMessage).toBeUndefined();
  });
});
