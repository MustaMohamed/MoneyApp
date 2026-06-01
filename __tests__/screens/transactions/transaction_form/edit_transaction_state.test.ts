import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';

describe('useEditTransactionState', () => {
  beforeEach(() => {
    useEditTransactionState().reset();
  });

  it('initializes with all UI booleans false', () => {
    const { state } = useEditTransactionState();
    expect(state.visible.value).toBe(false);
    expect(state.saving.value).toBe(false);
    expect(state.showCategoryPicker.value).toBe(false);
    expect(state.rateOverride.value).toBe(false);
  });

  it('open() sets visible=true', () => {
    useEditTransactionState().open({ id: 't1' } as any);
    expect(useEditTransactionState().state.visible.value).toBe(true);
  });

  it('close() resets to initial', () => {
    useEditTransactionState().open({ id: 't1' } as any);
    useEditTransactionState().setSaving(true);
    useEditTransactionState().close();
    expect(useEditTransactionState().state.visible.value).toBe(false);
    expect(useEditTransactionState().state.saving.value).toBe(false);
  });
});
