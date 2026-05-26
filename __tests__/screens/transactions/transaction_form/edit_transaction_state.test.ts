import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';

describe('useEditTransactionState', () => {
  beforeEach(() => {
    useEditTransactionState.getState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const s = useEditTransactionState.getState().state;
    expect(s).toEqual({
      visible: false,
      saving: false,
      showCategoryPicker: false,
      rateOverride: false,
    });
  });

  it('open() sets visible=true', () => {
    useEditTransactionState.getState().open({ id: 't1' } as any);
    expect(useEditTransactionState.getState().state.visible).toBe(true);
  });

  it('close() resets to initial', () => {
    useEditTransactionState.getState().open({ id: 't1' } as any);
    useEditTransactionState.getState().setSaving(true);
    useEditTransactionState.getState().close();
    expect(useEditTransactionState.getState().state.visible).toBe(false);
    expect(useEditTransactionState.getState().state.saving).toBe(false);
  });
});
