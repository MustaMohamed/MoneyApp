import { useAddTransactionState } from '@/screens/transactions/transaction_form/add_transaction.state';

beforeEach(() => useAddTransactionState.getState().reset());

describe('useAddTransactionState — initial state', () => {
  it('every flag starts false', () => {
    const s = useAddTransactionState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useAddTransactionState — open / close', () => {
  it('open flips visible to true', () => {
    useAddTransactionState.getState().open();
    expect(useAddTransactionState.getState().state.visible).toBe(true);
  });

  it('close resets every flag', () => {
    useAddTransactionState.setState({
      state: {
        visible: true,
        saving: true,
        showAccountPicker: true,
        showToPicker: true,
        showCategoryPicker: true,
        rateOverride: true,
      },
    });
    useAddTransactionState.getState().close();
    const s = useAddTransactionState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useAddTransactionState — setters', () => {
  it('setSaving toggles saving independently', () => {
    useAddTransactionState.getState().setSaving(true);
    expect(useAddTransactionState.getState().state.saving).toBe(true);
    useAddTransactionState.getState().setSaving(false);
    expect(useAddTransactionState.getState().state.saving).toBe(false);
  });

  it('setShowAccountPicker toggles only that flag', () => {
    useAddTransactionState.getState().setShowAccountPicker(true);
    const s = useAddTransactionState.getState().state;
    expect(s.showAccountPicker).toBe(true);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
  });

  it('setShowToPicker toggles only that flag', () => {
    useAddTransactionState.getState().setShowToPicker(true);
    const s = useAddTransactionState.getState().state;
    expect(s.showToPicker).toBe(true);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
  });

  it('setShowCategoryPicker toggles only that flag', () => {
    useAddTransactionState.getState().setShowCategoryPicker(true);
    const s = useAddTransactionState.getState().state;
    expect(s.showCategoryPicker).toBe(true);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });

  it('setRateOverride toggles rateOverride independently', () => {
    useAddTransactionState.getState().setRateOverride(true);
    expect(useAddTransactionState.getState().state.rateOverride).toBe(true);
    useAddTransactionState.getState().setRateOverride(false);
    expect(useAddTransactionState.getState().state.rateOverride).toBe(false);
  });
});

describe('useAddTransactionState — reset', () => {
  it('clears every flag', () => {
    useAddTransactionState.setState({
      state: {
        visible: true,
        saving: true,
        showAccountPicker: true,
        showToPicker: true,
        showCategoryPicker: true,
        rateOverride: true,
      },
    });
    useAddTransactionState.getState().reset();
    const s = useAddTransactionState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});
