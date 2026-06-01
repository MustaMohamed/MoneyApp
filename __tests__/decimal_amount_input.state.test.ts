import { renderHook, act } from '@testing-library/react-native';

import { useDecimalInputState } from '@/modules/commitments/screens/commitments/components/decimal_amount_input.state';

describe('useDecimalInputState', () => {
  it('initializes text from initialText', () => {
    const { result } = renderHook(() => useDecimalInputState('12.5'));
    expect(result.current.state.text.value).toBe('12.5');
  });

  it('initializes empty when initialText is empty string', () => {
    const { result } = renderHook(() => useDecimalInputState(''));
    expect(result.current.state.text.value).toBe('');
  });

  it('setText updates the text', () => {
    const { result } = renderHook(() => useDecimalInputState('1'));
    act(() => result.current.setText('1.2'));
    expect(result.current.state.text.value).toBe('1.2');
  });

  it('syncToValue replaces text with the new value', () => {
    const { result } = renderHook(() => useDecimalInputState('1'));
    act(() => result.current.setText('999'));
    act(() => result.current.syncToValue('42'));
    expect(result.current.state.text.value).toBe('42');
  });

  it('separate hook instances have independent state', () => {
    const a = renderHook(() => useDecimalInputState('1'));
    const b = renderHook(() => useDecimalInputState('2'));
    act(() => a.result.current.setText('11'));
    expect(a.result.current.state.text.value).toBe('11');
    expect(b.result.current.state.text.value).toBe('2');
  });
});
