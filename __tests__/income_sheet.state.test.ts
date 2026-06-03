import { act, renderHook } from '@testing-library/react-native';

import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';

afterEach(() => {
  const { result, unmount } = renderHook(() => useIncomeSheetState());
  act(() => result.current.reset());
  unmount();
});

describe('useIncomeSheetState', () => {
  it('initialises with closed sheet, empty text, null suggestion', () => {
    const { result } = renderHook(() => useIncomeSheetState());

    expect(result.current.state.isOpen.value).toBe(false);
    expect(result.current.state.amountText.value).toBe('');
    expect(result.current.state.suggestion.value).toBeNull();
  });

  it('open with suggestion pre-fills amountText from suggestion when no current income', () => {
    const { result } = renderHook(() => useIncomeSheetState());

    act(() => result.current.open(15000, null));

    expect(result.current.state.isOpen.value).toBe(true);
    expect(result.current.state.suggestion.value).toBe(15000);
    expect(result.current.state.amountText.value).toBe('15000');
  });

  it('open with current income pre-fills amountText from current income over suggestion', () => {
    const { result } = renderHook(() => useIncomeSheetState());

    act(() => result.current.open(15000, 20000));

    expect(result.current.state.amountText.value).toBe('20000');
  });

  it('open with neither suggestion nor current income leaves amountText empty', () => {
    const { result } = renderHook(() => useIncomeSheetState());

    act(() => result.current.open(null, null));

    expect(result.current.state.amountText.value).toBe('');
  });

  it('close sets isOpen to false', () => {
    const { result } = renderHook(() => useIncomeSheetState());

    act(() => {
      result.current.open(null, null);
      result.current.close();
    });

    expect(result.current.state.isOpen.value).toBe(false);
  });

  it('setAmountText updates the text', () => {
    const { result } = renderHook(() => useIncomeSheetState());

    act(() => result.current.setAmountText('9999'));

    expect(result.current.state.amountText.value).toBe('9999');
  });

  it('reset restores initial state', () => {
    const { result } = renderHook(() => useIncomeSheetState());

    act(() => {
      result.current.open(5000, 6000);
      result.current.reset();
    });

    expect(result.current.state.isOpen.value).toBe(false);
    expect(result.current.state.amountText.value).toBe('');
    expect(result.current.state.suggestion.value).toBeNull();
  });
});
