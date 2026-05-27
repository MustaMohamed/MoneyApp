import { useAdjustBalanceSheetState } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state';

beforeEach(() => useAdjustBalanceSheetState.getState().reset());

describe('useAdjustBalanceSheetState initial state', () => {
  it('starts with empty input and error', () => {
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('');
    expect(s.error).toBe('');
  });
});

describe('useAdjustBalanceSheetState setters', () => {
  it('setInput updates input value', () => {
    useAdjustBalanceSheetState.getState().setInput('123.45');
    expect(useAdjustBalanceSheetState.getState().input).toBe('123.45');
  });

  it('setInput preserves error when only changing input', () => {
    useAdjustBalanceSheetState.getState().setError('boom');
    useAdjustBalanceSheetState.getState().setInput('42');
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('42');
    expect(s.error).toBe('boom');
  });

  it('setError updates error value', () => {
    useAdjustBalanceSheetState.getState().setError('invalid');
    expect(useAdjustBalanceSheetState.getState().error).toBe('invalid');
  });

  it('setError preserves input when only changing error', () => {
    useAdjustBalanceSheetState.getState().setInput('99');
    useAdjustBalanceSheetState.getState().setError('nope');
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('99');
    expect(s.error).toBe('nope');
  });
});

describe('useAdjustBalanceSheetState initialize', () => {
  it('sets input from current balance and clears error', () => {
    useAdjustBalanceSheetState.getState().setError('previous error');
    useAdjustBalanceSheetState.getState().initialize(1500);
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('1500');
    expect(s.error).toBe('');
  });

  it('handles zero balance', () => {
    useAdjustBalanceSheetState.getState().initialize(0);
    expect(useAdjustBalanceSheetState.getState().input).toBe('0');
  });

  it('handles decimal balance', () => {
    useAdjustBalanceSheetState.getState().initialize(123.45);
    expect(useAdjustBalanceSheetState.getState().input).toBe('123.45');
  });

  it('handles negative balance', () => {
    useAdjustBalanceSheetState.getState().initialize(-50);
    expect(useAdjustBalanceSheetState.getState().input).toBe('-50');
  });
});

describe('useAdjustBalanceSheetState reset', () => {
  it('returns to defaults', () => {
    useAdjustBalanceSheetState.setState({ input: '999', error: 'something' });
    useAdjustBalanceSheetState.getState().reset();
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('');
    expect(s.error).toBe('');
  });
});
