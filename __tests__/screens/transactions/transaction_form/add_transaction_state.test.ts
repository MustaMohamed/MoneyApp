import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';

describe('useAddTransactionState', () => {
  beforeEach(() => {
    useAddTransactionState.getState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const s = useAddTransactionState.getState();
    expect(s).toMatchObject({
      visible: false,
      pendingOpen: false,
      saving: false,
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
      budgetsLoading: false,
      budgetLookupVersion: 0,
      budgetLookupError: undefined,
      errorMessage: undefined,
      rateOverride: false,
    });
  });

  it('open() sets visible=true', () => {
    useAddTransactionState.getState().open();
    expect(useAddTransactionState.getState().visible).toBe(true);
  });

  it('requestOpen() sets pendingOpen=true without showing the sheet', () => {
    useAddTransactionState.getState().requestOpen();
    const s = useAddTransactionState.getState();
    expect(s.pendingOpen).toBe(true);
    expect(s.visible).toBe(false);
  });

  it('open() consumes a pending request (visible=true, pendingOpen=false)', () => {
    useAddTransactionState.getState().requestOpen();
    useAddTransactionState.getState().open();
    const s = useAddTransactionState.getState();
    expect(s.visible).toBe(true);
    expect(s.pendingOpen).toBe(false);
  });

  it('close() resets to initial', () => {
    useAddTransactionState.getState().open();
    useAddTransactionState.getState().setSaving(true);
    useAddTransactionState.getState().close();
    expect(useAddTransactionState.getState()).toMatchObject({
      visible: false,
      pendingOpen: false,
      saving: false,
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
      budgetsLoading: false,
      rateOverride: false,
    });
  });

  it('setShowAccountPicker(true) flips only that flag', () => {
    useAddTransactionState.getState().setShowAccountPicker(true);
    const s = useAddTransactionState.getState();
    expect(s.showAccountPicker).toBe(true);
    expect(s.showToPicker).toBe(false);
  });

  it('setRateOverride toggles independently of other flags', () => {
    useAddTransactionState.getState().setRateOverride(true);
    expect(useAddTransactionState.getState().rateOverride).toBe(true);
    useAddTransactionState.getState().setRateOverride(false);
    expect(useAddTransactionState.getState().rateOverride).toBe(false);
  });

  it('tracks lookup and save errors and clears them for retry or edits', () => {
    useAddTransactionState.getState().setBudgetLookupError('Lookup failed');
    useAddTransactionState.getState().setErrorMessage('Save failed');
    expect(useAddTransactionState.getState()).toMatchObject({
      budgetLookupError: 'Lookup failed',
      errorMessage: 'Save failed',
    });

    useAddTransactionState.getState().retryBudgetLookup();
    expect(useAddTransactionState.getState().budgetLookupVersion).toBe(1);
    expect(useAddTransactionState.getState().budgetLookupError).toBeUndefined();
    useAddTransactionState.getState().clearError();
    expect(useAddTransactionState.getState().errorMessage).toBeUndefined();
  });
});
