import { act, renderHook } from '@testing-library/react-native';

import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';

function setup() {
  const hook = renderHook(() => useAddTransactionState());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useAddTransactionState', () => {
  it('initializes with all UI booleans false', () => {
    const { result } = setup();
    const { state } = result.current;

    expect(state.visible.value).toBe(false);
    expect(state.pendingOpen.value).toBe(false);
    expect(state.saving.value).toBe(false);
    expect(state.showAccountPicker.value).toBe(false);
    expect(state.showToPicker.value).toBe(false);
    expect(state.showCategoryPicker.value).toBe(false);
    expect(state.rateOverride.value).toBe(false);
  });

  it('open() sets visible=true', () => {
    const { result } = setup();

    act(() => result.current.open());

    expect(result.current.state.visible.value).toBe(true);
  });

  it('requestOpen() sets pendingOpen=true without showing the sheet', () => {
    const { result } = setup();

    act(() => result.current.requestOpen());

    expect(result.current.state.pendingOpen.value).toBe(true);
    expect(result.current.state.visible.value).toBe(false);
  });

  it('open() consumes a pending request (visible=true, pendingOpen=false)', () => {
    const { result } = setup();

    act(() => result.current.requestOpen());
    act(() => result.current.open());

    expect(result.current.state.visible.value).toBe(true);
    expect(result.current.state.pendingOpen.value).toBe(false);
  });

  it('close() resets to initial', () => {
    const { result } = setup();

    act(() => result.current.open());
    act(() => result.current.setSaving(true));
    act(() => result.current.close());

    const { state } = result.current;
    expect(state.visible.value).toBe(false);
    expect(state.pendingOpen.value).toBe(false);
    expect(state.saving.value).toBe(false);
    expect(state.showAccountPicker.value).toBe(false);
    expect(state.showToPicker.value).toBe(false);
    expect(state.showCategoryPicker.value).toBe(false);
    expect(state.rateOverride.value).toBe(false);
  });

  it('setShowAccountPicker(true) flips only that flag', () => {
    const { result } = setup();

    act(() => result.current.setShowAccountPicker(true));

    expect(result.current.state.showAccountPicker.value).toBe(true);
    expect(result.current.state.showToPicker.value).toBe(false);
  });

  it('setRateOverride toggles independently of other flags', () => {
    const { result } = setup();

    act(() => result.current.setRateOverride(true));
    expect(result.current.state.rateOverride.value).toBe(true);
    act(() => result.current.setRateOverride(false));
    expect(result.current.state.rateOverride.value).toBe(false);
  });
});
