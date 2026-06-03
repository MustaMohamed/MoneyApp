import { act, renderHook } from '@testing-library/react-native';

import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';

function setup() {
  const hook = renderHook(() => useEditTransactionState());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useEditTransactionState', () => {
  it('initializes with all UI booleans false', () => {
    const { result } = setup();
    const { state } = result.current;

    expect(state.visible.value).toBe(false);
    expect(state.saving.value).toBe(false);
    expect(state.showCategoryPicker.value).toBe(false);
    expect(state.rateOverride.value).toBe(false);
  });

  it('open() sets visible=true', () => {
    const { result } = setup();

    act(() => result.current.open());

    expect(result.current.state.visible.value).toBe(true);
  });

  it('close() resets to initial', () => {
    const { result } = setup();

    act(() => result.current.open());
    act(() => result.current.setSaving(true));
    act(() => result.current.close());

    expect(result.current.state.visible.value).toBe(false);
    expect(result.current.state.saving.value).toBe(false);
  });
});
