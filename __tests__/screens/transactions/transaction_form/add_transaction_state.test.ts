import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';

describe('useAddTransactionState', () => {
  beforeEach(() => {
    useAddTransactionState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const { state } = useAddTransactionState();
    expect(state.visible.value).toBe(false);
    expect(state.pendingOpen.value).toBe(false);
    expect(state.saving.value).toBe(false);
    expect(state.showAccountPicker.value).toBe(false);
    expect(state.showToPicker.value).toBe(false);
    expect(state.showCategoryPicker.value).toBe(false);
    expect(state.rateOverride.value).toBe(false);
  });

  it('open() sets visible=true', () => {
    useAddTransactionState().open();
    expect(useAddTransactionState().state.visible.value).toBe(true);
  });

  it('requestOpen() sets pendingOpen=true without showing the sheet', () => {
    useAddTransactionState().requestOpen();
    const { state } = useAddTransactionState();
    expect(state.pendingOpen.value).toBe(true);
    expect(state.visible.value).toBe(false);
  });

  it('open() consumes a pending request (visible=true, pendingOpen=false)', () => {
    useAddTransactionState().requestOpen();
    useAddTransactionState().open();
    const { state } = useAddTransactionState();
    expect(state.visible.value).toBe(true);
    expect(state.pendingOpen.value).toBe(false);
  });

  it('close() resets to initial', () => {
    useAddTransactionState().open();
    useAddTransactionState().setSaving(true);
    useAddTransactionState().close();
    const { state } = useAddTransactionState();
    expect(state.visible.value).toBe(false);
    expect(state.pendingOpen.value).toBe(false);
    expect(state.saving.value).toBe(false);
    expect(state.showAccountPicker.value).toBe(false);
    expect(state.showToPicker.value).toBe(false);
    expect(state.showCategoryPicker.value).toBe(false);
    expect(state.rateOverride.value).toBe(false);
  });

  it('setShowAccountPicker(true) flips only that flag', () => {
    useAddTransactionState().setShowAccountPicker(true);
    const { state } = useAddTransactionState();
    expect(state.showAccountPicker.value).toBe(true);
    expect(state.showToPicker.value).toBe(false);
  });

  it('setRateOverride toggles independently of other flags', () => {
    useAddTransactionState().setRateOverride(true);
    expect(useAddTransactionState().state.rateOverride.value).toBe(true);
    useAddTransactionState().setRateOverride(false);
    expect(useAddTransactionState().state.rateOverride.value).toBe(false);
  });
});
