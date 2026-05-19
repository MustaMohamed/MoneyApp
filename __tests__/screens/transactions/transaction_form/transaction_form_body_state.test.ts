import { useTransactionFormBodyState } from '@/screens/transactions/transaction_form/transaction_form_body.state';

describe('useTransactionFormBodyState', () => {
  beforeEach(() => {
    useTransactionFormBodyState.getState().reset();
  });

  it('initializes with keyboardVisible=false and showIosDatePicker=false', () => {
    const s = useTransactionFormBodyState.getState().state;
    expect(s).toEqual({
      keyboardVisible: false,
      showIosDatePicker: false,
      showAndroidDatePicker: false,
    });
  });

  it('setKeyboardVisible(true) flips only that flag', () => {
    useTransactionFormBodyState.getState().setKeyboardVisible(true);
    const s = useTransactionFormBodyState.getState().state;
    expect(s.keyboardVisible).toBe(true);
    expect(s.showIosDatePicker).toBe(false);
  });

  it('setShowIosDatePicker(true) flips only that flag', () => {
    useTransactionFormBodyState.getState().setShowIosDatePicker(true);
    expect(useTransactionFormBodyState.getState().state.showIosDatePicker).toBe(true);
  });

  it('setShowAndroidDatePicker(true) flips only that flag', () => {
    useTransactionFormBodyState.getState().setShowAndroidDatePicker(true);
    expect(useTransactionFormBodyState.getState().state.showAndroidDatePicker).toBe(true);
  });

  it('reset() restores all flags to false', () => {
    useTransactionFormBodyState.getState().setKeyboardVisible(true);
    useTransactionFormBodyState.getState().setShowIosDatePicker(true);
    useTransactionFormBodyState.getState().reset();
    expect(useTransactionFormBodyState.getState().state).toEqual({
      keyboardVisible: false,
      showIosDatePicker: false,
      showAndroidDatePicker: false,
    });
  });
});
