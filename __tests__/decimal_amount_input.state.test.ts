import { renderHook, act } from '@testing-library/react-native';

import { useDecimalInputState } from '@/modules/commitments/screens/commitments/components/decimal_amount_input.state';

describe('useDecimalInputState', () => {
  it('initializes text from initialText', async () => {
    const { result } = await renderHook(() => useDecimalInputState('12.5'));
    expect(result.current.state.text).toBe('12.5');
  });

  it('initializes empty when initialText is empty string', async () => {
    const { result } = await renderHook(() => useDecimalInputState(''));
    expect(result.current.state.text).toBe('');
  });

  it('setText updates the text', async () => {
    const { result } = await renderHook(() => useDecimalInputState('1'));
    await act(() => result.current.setText('1.2'));
    expect(result.current.state.text).toBe('1.2');
  });

  it('syncToValue replaces text with the new value', async () => {
    const { result } = await renderHook(() => useDecimalInputState('1'));
    await act(() => result.current.setText('999'));
    await act(() => result.current.syncToValue('42'));
    expect(result.current.state.text).toBe('42');
  });

  it('separate hook instances have independent state', async () => {
    const a = await renderHook(() => useDecimalInputState('1'));
    const b = await renderHook(() => useDecimalInputState('2'));
    await act(() => a.result.current.setText('11'));
    expect(a.result.current.state.text).toBe('11');
    expect(b.result.current.state.text).toBe('2');
  });
});
