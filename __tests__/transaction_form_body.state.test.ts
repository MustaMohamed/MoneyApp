import { useTransactionFormBodyState } from '@/screens/transactions/transaction_form/transaction_form_body.state';

beforeEach(() => useTransactionFormBodyState.getState().reset());

describe('useTransactionFormBodyState', () => {
  it('starts with both pickers closed', () => {
    const s = useTransactionFormBodyState.getState().state;
    expect(s.showIosDatePicker).toBe(false);
    expect(s.showIosTimePicker).toBe(false);
  });

  it('setShowIosDatePicker toggles', () => {
    useTransactionFormBodyState.getState().setShowIosDatePicker(true);
    expect(useTransactionFormBodyState.getState().state.showIosDatePicker).toBe(true);
    useTransactionFormBodyState.getState().setShowIosDatePicker(false);
    expect(useTransactionFormBodyState.getState().state.showIosDatePicker).toBe(false);
  });

  it('setShowIosTimePicker toggles', () => {
    useTransactionFormBodyState.getState().setShowIosTimePicker(true);
    expect(useTransactionFormBodyState.getState().state.showIosTimePicker).toBe(true);
    useTransactionFormBodyState.getState().setShowIosTimePicker(false);
    expect(useTransactionFormBodyState.getState().state.showIosTimePicker).toBe(false);
  });

  it('reset clears both flags', () => {
    useTransactionFormBodyState.setState({
      state: { showIosDatePicker: true, showIosTimePicker: true },
    });
    useTransactionFormBodyState.getState().reset();
    const s = useTransactionFormBodyState.getState().state;
    expect(s.showIosDatePicker).toBe(false);
    expect(s.showIosTimePicker).toBe(false);
  });
});
