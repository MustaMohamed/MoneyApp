import { act, renderHook } from '@testing-library/react-native';

import { useAdjustBalanceSheetState } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state';

describe('useAdjustBalanceSheetState initial state', () => {
  it('starts with empty input and error', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    expect(result.current.state.input.value).toBe('');
    expect(result.current.state.error.value).toBe('');
  });
});

describe('useAdjustBalanceSheetState setters', () => {
  it('setInput updates input value', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => result.current.setInput('123.45'));

    expect(result.current.state.input.value).toBe('123.45');
  });

  it('setInput preserves error when only changing input', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => {
      result.current.setError('boom');
      result.current.setInput('42');
    });

    expect(result.current.state.input.value).toBe('42');
    expect(result.current.state.error.value).toBe('boom');
  });

  it('setError updates error value', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => result.current.setError('invalid'));

    expect(result.current.state.error.value).toBe('invalid');
  });

  it('setError preserves input when only changing error', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => {
      result.current.setInput('99');
      result.current.setError('nope');
    });

    expect(result.current.state.input.value).toBe('99');
    expect(result.current.state.error.value).toBe('nope');
  });
});

describe('useAdjustBalanceSheetState initialize', () => {
  it('sets input from current balance and clears error', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => {
      result.current.setError('previous error');
      result.current.initialize(1500);
    });

    expect(result.current.state.input.value).toBe('1500');
    expect(result.current.state.error.value).toBe('');
  });

  it('handles zero balance', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => result.current.initialize(0));

    expect(result.current.state.input.value).toBe('0');
  });

  it('handles decimal balance', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => result.current.initialize(123.45));

    expect(result.current.state.input.value).toBe('123.45');
  });

  it('handles negative balance', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => result.current.initialize(-50));

    expect(result.current.state.input.value).toBe('-50');
  });
});

describe('useAdjustBalanceSheetState reset', () => {
  it('returns to defaults', () => {
    const { result } = renderHook(() => useAdjustBalanceSheetState());

    act(() => {
      result.current.setInput('999');
      result.current.setError('something');
      result.current.reset();
    });

    expect(result.current.state.input.value).toBe('');
    expect(result.current.state.error.value).toBe('');
  });
});
