import { useAddTransactionState } from '@/screens/transactions/transaction_form/add_transaction.state';

describe('useAddTransactionState', () => {
  beforeEach(() => {
    useAddTransactionState.getState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const s = useAddTransactionState.getState().state;
    expect(s).toEqual({
      visible: false,
      pendingOpen: false,
      saving: false,
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      rateOverride: false,
    });
  });

  it('open() sets visible=true', () => {
    useAddTransactionState.getState().open();
    expect(useAddTransactionState.getState().state.visible).toBe(true);
  });

  it('requestOpen() sets pendingOpen=true without showing the sheet', () => {
    useAddTransactionState.getState().requestOpen();
    const s = useAddTransactionState.getState().state;
    expect(s.pendingOpen).toBe(true);
    expect(s.visible).toBe(false);
  });

  it('open() consumes a pending request (visible=true, pendingOpen=false)', () => {
    useAddTransactionState.getState().requestOpen();
    useAddTransactionState.getState().open();
    const s = useAddTransactionState.getState().state;
    expect(s.visible).toBe(true);
    expect(s.pendingOpen).toBe(false);
  });

  it('close() resets to initial', () => {
    useAddTransactionState.getState().open();
    useAddTransactionState.getState().setSaving(true);
    useAddTransactionState.getState().close();
    expect(useAddTransactionState.getState().state).toEqual({
      visible: false,
      pendingOpen: false,
      saving: false,
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      rateOverride: false,
    });
  });

  it('setShowAccountPicker(true) flips only that flag', () => {
    useAddTransactionState.getState().setShowAccountPicker(true);
    const s = useAddTransactionState.getState().state;
    expect(s.showAccountPicker).toBe(true);
    expect(s.showToPicker).toBe(false);
  });

  it('setRateOverride toggles independently of other flags', () => {
    useAddTransactionState.getState().setRateOverride(true);
    expect(useAddTransactionState.getState().state.rateOverride).toBe(true);
    useAddTransactionState.getState().setRateOverride(false);
    expect(useAddTransactionState.getState().state.rateOverride).toBe(false);
  });
});
