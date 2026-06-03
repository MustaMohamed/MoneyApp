import { act, renderHook } from '@testing-library/react-native';

import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

afterEach(() => {
  const { result, unmount } = renderHook(() => useBudgetState());
  act(() => result.current.reset());
  unmount();
});

describe('useBudgetState — lensTab', () => {
  it('initialises lensTab to categories', () => {
    const { result } = renderHook(() => useBudgetState());

    expect(result.current.state.lensTab.value).toBe('categories');
  });

  it('setLensTab updates to fiftythirty', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => result.current.setLensTab('fiftythirty'));

    expect(result.current.state.lensTab.value).toBe('fiftythirty');
  });

  it('setLensTab updates back to categories', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.setLensTab('fiftythirty');
      result.current.setLensTab('categories');
    });

    expect(result.current.state.lensTab.value).toBe('categories');
  });

  it('reset clears lensTab to categories', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.setLensTab('fiftythirty');
      result.current.reset();
    });

    expect(result.current.state.lensTab.value).toBe('categories');
  });
});
