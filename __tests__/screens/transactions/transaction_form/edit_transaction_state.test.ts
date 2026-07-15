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
});
