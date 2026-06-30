import { useAdjustBalanceSheetState } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state';

describe('useAdjustBalanceSheetState initial state', () => {
  beforeEach(() => {
    useAdjustBalanceSheetState.getState().reset();
  });

  it('starts with empty input and error', () => {
    const state = useAdjustBalanceSheetState.getState();

    expect(state.input).toBe('');
    expect(state.error).toBe('');
  });
});

describe('useAdjustBalanceSheetState setters', () => {
  beforeEach(() => {
    useAdjustBalanceSheetState.getState().reset();
  });

  it('setInput updates input value', () => {
    useAdjustBalanceSheetState.getState().setInput('123.45');

    expect(useAdjustBalanceSheetState.getState().input).toBe('123.45');
  });

  it('setInput preserves error when only changing input', () => {
    useAdjustBalanceSheetState.getState().setError('boom');
    useAdjustBalanceSheetState.getState().setInput('42');

    const state = useAdjustBalanceSheetState.getState();
    expect(state.input).toBe('42');
    expect(state.error).toBe('boom');
  });

  it('setError updates error value', () => {
    useAdjustBalanceSheetState.getState().setError('invalid');

    expect(useAdjustBalanceSheetState.getState().error).toBe('invalid');
  });

  it('setError preserves input when only changing error', () => {
    useAdjustBalanceSheetState.getState().setInput('99');
    useAdjustBalanceSheetState.getState().setError('nope');

    const state = useAdjustBalanceSheetState.getState();
    expect(state.input).toBe('99');
    expect(state.error).toBe('nope');
  });
});

describe('useAdjustBalanceSheetState initialize', () => {
  beforeEach(() => {
    useAdjustBalanceSheetState.getState().reset();
  });

  it('sets input from current balance and clears error', () => {
    useAdjustBalanceSheetState.getState().setError('previous error');
    useAdjustBalanceSheetState.getState().initialize(1500);

    const state = useAdjustBalanceSheetState.getState();
    expect(state.input).toBe('1500');
    expect(state.error).toBe('');
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
  beforeEach(() => {
    useAdjustBalanceSheetState.getState().reset();
  });

  it('returns to defaults', () => {
    useAdjustBalanceSheetState.getState().setInput('999');
    useAdjustBalanceSheetState.getState().setError('something');
    useAdjustBalanceSheetState.getState().reset();

    const state = useAdjustBalanceSheetState.getState();
    expect(state.input).toBe('');
    expect(state.error).toBe('');
  });
});
