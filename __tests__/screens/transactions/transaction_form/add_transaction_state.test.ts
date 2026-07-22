import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';

describe('useAddTransactionState', () => {
  beforeEach(() => useAddTransactionState.getState().reset());

  it('starts with only form-owned UI state', () => {
    expect(useAddTransactionState.getState()).toMatchObject({
      saving: false,
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
      closingPickers: [],
      budgetsLoading: false,
      budgetLookupVersion: 0,
      budgetLookupError: undefined,
      errorMessage: undefined,
      rateOverride: false,
    });
  });

  it('keeps picker flags independent', () => {
    useAddTransactionState.getState().setShowAccountPicker(true);
    expect(useAddTransactionState.getState()).toMatchObject({
      showAccountPicker: true,
      showToPicker: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
    });
  });

  it('retains a closing picker until its sheet transition completes', () => {
    useAddTransactionState.getState().setShowCategoryPicker(true);
    useAddTransactionState.getState().setShowCategoryPicker(false);

    expect(useAddTransactionState.getState()).toMatchObject({
      showCategoryPicker: false,
      closingPickers: ['category'],
    });

    useAddTransactionState.getState().completePickerClose('category');
    expect(useAddTransactionState.getState().closingPickers).toEqual([]);
  });

  it('keeps one picker mounted while a different picker opens', () => {
    useAddTransactionState.getState().setShowCategoryPicker(true);
    useAddTransactionState.getState().setShowCategoryPicker(false);

    useAddTransactionState.getState().setShowBudgetPicker(true);

    expect(useAddTransactionState.getState()).toMatchObject({
      showCategoryPicker: false,
      showBudgetPicker: true,
      closingPickers: ['category'],
    });
  });

  it('tracks lookup and save errors and clears them for retry or edits', () => {
    useAddTransactionState.getState().setBudgetLookupError('Lookup failed');
    useAddTransactionState.getState().setErrorMessage('Save failed');

    useAddTransactionState.getState().retryBudgetLookup();
    useAddTransactionState.getState().clearError();

    expect(useAddTransactionState.getState()).toMatchObject({
      budgetLookupVersion: 1,
      budgetLookupError: undefined,
      errorMessage: undefined,
    });
  });

  it('resets every form-owned flag after the host completes a session', () => {
    useAddTransactionState.getState().setSaving(true);
    useAddTransactionState.getState().setShowCategoryPicker(true);
    useAddTransactionState.getState().setRateOverride(true);

    useAddTransactionState.getState().reset();

    expect(useAddTransactionState.getState()).toMatchObject({
      saving: false,
      showCategoryPicker: false,
      rateOverride: false,
    });
  });
});
