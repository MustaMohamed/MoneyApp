import { act, renderHook } from '@testing-library/react-native';

import { useTransactionFormBodyState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body.state';

function setup() {
  const hook = renderHook(() => useTransactionFormBodyState());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useTransactionFormBodyState', () => {
  it('initializes with keyboardVisible=false and picker flags=false', () => {
    const { result } = setup();
    const { state } = result.current;

    expect(state.keyboardVisible.value).toBe(false);
    expect(state.showIosDatePicker.value).toBe(false);
    expect(state.showAndroidDatePicker.value).toBe(false);
  });

  it('setKeyboardVisible(true) flips only that flag', () => {
    const { result } = setup();

    act(() => result.current.setKeyboardVisible(true));

    expect(result.current.state.keyboardVisible.value).toBe(true);
    expect(result.current.state.showIosDatePicker.value).toBe(false);
  });

  it('setShowIosDatePicker(true) flips only that flag', () => {
    const { result } = setup();

    act(() => result.current.setShowIosDatePicker(true));

    expect(result.current.state.showIosDatePicker.value).toBe(true);
  });

  it('setShowAndroidDatePicker(true) flips only that flag', () => {
    const { result } = setup();

    act(() => result.current.setShowAndroidDatePicker(true));

    expect(result.current.state.showAndroidDatePicker.value).toBe(true);
  });

  it('reset() restores all flags to false', () => {
    const { result } = setup();

    act(() => result.current.setKeyboardVisible(true));
    act(() => result.current.setShowIosDatePicker(true));
    act(() => result.current.reset());

    expect(result.current.state.keyboardVisible.value).toBe(false);
    expect(result.current.state.showIosDatePicker.value).toBe(false);
    expect(result.current.state.showAndroidDatePicker.value).toBe(false);
  });
});
