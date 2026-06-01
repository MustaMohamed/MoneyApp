import { useTransactionFormBodyState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body.state';

describe('useTransactionFormBodyState', () => {
  beforeEach(() => {
    useTransactionFormBodyState().reset();
  });

  it('initializes with keyboardVisible=false and showIosDatePicker=false', () => {
    const { state } = useTransactionFormBodyState();
    expect(state.keyboardVisible.value).toBe(false);
    expect(state.showIosDatePicker.value).toBe(false);
    expect(state.showAndroidDatePicker.value).toBe(false);
  });

  it('setKeyboardVisible(true) flips only that flag', () => {
    useTransactionFormBodyState().setKeyboardVisible(true);
    const { state } = useTransactionFormBodyState();
    expect(state.keyboardVisible.value).toBe(true);
    expect(state.showIosDatePicker.value).toBe(false);
  });

  it('setShowIosDatePicker(true) flips only that flag', () => {
    useTransactionFormBodyState().setShowIosDatePicker(true);
    expect(useTransactionFormBodyState().state.showIosDatePicker.value).toBe(true);
  });

  it('setShowAndroidDatePicker(true) flips only that flag', () => {
    useTransactionFormBodyState().setShowAndroidDatePicker(true);
    expect(useTransactionFormBodyState().state.showAndroidDatePicker.value).toBe(true);
  });

  it('reset() restores all flags to false', () => {
    useTransactionFormBodyState().setKeyboardVisible(true);
    useTransactionFormBodyState().setShowIosDatePicker(true);
    useTransactionFormBodyState().reset();
    const { state } = useTransactionFormBodyState();
    expect(state.keyboardVisible.value).toBe(false);
    expect(state.showIosDatePicker.value).toBe(false);
    expect(state.showAndroidDatePicker.value).toBe(false);
  });
});
