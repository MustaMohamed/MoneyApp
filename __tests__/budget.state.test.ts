import { act, renderHook } from '@testing-library/react-native';

import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

afterEach(() => {
  const { result, unmount } = renderHook(() => useBudgetState());
  act(() => result.current.reset());
  unmount();
});

describe('useBudgetState', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useBudgetState());
    const { state } = result.current;

    expect(state.sheetVisible.value).toBe(false);
    expect(state.mode.value).toBe('add');
    expect(state.targetCategoryId.value).toBeUndefined();
  });

  it('openAdd opens in add mode with no target', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.openEdit('cat_food');
      result.current.openAdd();
    });

    expect(result.current.state.sheetVisible.value).toBe(true);
    expect(result.current.state.mode.value).toBe('add');
    expect(result.current.state.targetCategoryId.value).toBeUndefined();
  });

  it('openEdit opens in edit mode targeting a category', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => result.current.openEdit('cat_food'));

    expect(result.current.state.sheetVisible.value).toBe(true);
    expect(result.current.state.mode.value).toBe('edit');
    expect(result.current.state.targetCategoryId.value).toBe('cat_food');
  });

  it('close hides the sheet', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.openAdd();
      result.current.close();
    });

    expect(result.current.state.sheetVisible.value).toBe(false);
  });

  it('reset clears the sheet state', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.openEdit('cat_food');
      result.current.reset();
    });

    expect(result.current.state.sheetVisible.value).toBe(false);
    expect(result.current.state.mode.value).toBe('add');
    expect(result.current.state.targetCategoryId.value).toBeUndefined();
  });
});
