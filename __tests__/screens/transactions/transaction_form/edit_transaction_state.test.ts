import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';

describe('useEditTransactionState', () => {
  beforeEach(() => useEditTransactionState.getState().reset());

  it('starts with only form-owned UI state', () => {
    expect(useEditTransactionState.getState()).toMatchObject({
      saving: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
      closingPickers: [],
      budgetsLoading: false,
      budgetLookupVersion: 0,
      budgetLookupError: undefined,
      errorMessage: undefined,
      preserveBudgetNull: false,
      rateOverride: false,
    });
  });

  it('tracks lookup and save errors and clears them for retry or edits', () => {
    useEditTransactionState.getState().setBudgetLookupError('Lookup failed');
    useEditTransactionState.getState().setErrorMessage('Save failed');

    useEditTransactionState.getState().retryBudgetLookup();
    useEditTransactionState.getState().clearError();

    expect(useEditTransactionState.getState()).toMatchObject({
      budgetLookupVersion: 1,
      budgetLookupError: undefined,
      errorMessage: undefined,
    });
  });

  it('retains a closing picker until its sheet transition completes', () => {
    useEditTransactionState.getState().setShowBudgetPicker(true);
    useEditTransactionState.getState().setShowBudgetPicker(false);

    expect(useEditTransactionState.getState()).toMatchObject({
      showBudgetPicker: false,
      closingPickers: ['budget'],
    });

    useEditTransactionState.getState().completePickerClose('budget');
    expect(useEditTransactionState.getState().closingPickers).toEqual([]);
  });

  it('keeps one picker mounted while a different picker opens', () => {
    useEditTransactionState.getState().setShowCategoryPicker(true);
    useEditTransactionState.getState().setShowCategoryPicker(false);

    useEditTransactionState.getState().setShowBudgetPicker(true);

    expect(useEditTransactionState.getState()).toMatchObject({
      showCategoryPicker: false,
      showBudgetPicker: true,
      closingPickers: ['category'],
    });
  });

  it('resets every form-owned flag after the host completes a session', () => {
    useEditTransactionState.getState().setSaving(true);
    useEditTransactionState.getState().setShowCategoryPicker(true);
    useEditTransactionState.getState().setPreserveBudgetNull(true);
    useEditTransactionState.getState().setRateOverride(true);

    useEditTransactionState.getState().reset();

    expect(useEditTransactionState.getState()).toMatchObject({
      saving: false,
      showCategoryPicker: false,
      preserveBudgetNull: false,
      rateOverride: false,
    });
  });
});
