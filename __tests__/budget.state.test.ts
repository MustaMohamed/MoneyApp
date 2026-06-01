import { act, renderHook } from '@testing-library/react-native';

import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

describe('useBudgetState', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useBudgetState());
    const s = result.current.state;

    expect(s.sheetVisible.value).toBe(false);
    expect(s.mode.value).toBe('add');
    expect(s.targetCategoryId.value).toBeUndefined();
  });

  it('openAdd opens in add mode with no target', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.openEdit('cat_food');
      result.current.openAdd();
    });

    const s = result.current.state;
    expect(s.sheetVisible.value).toBe(true);
    expect(s.mode.value).toBe('add');
    expect(s.targetCategoryId.value).toBeUndefined();
  });

  it('openEdit opens in edit mode targeting a category', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => result.current.openEdit('cat_food'));

    const s = result.current.state;
    expect(s.sheetVisible.value).toBe(true);
    expect(s.mode.value).toBe('edit');
    expect(s.targetCategoryId.value).toBe('cat_food');
  });

  it('close hides the sheet', () => {
    const { result } = renderHook(() => useBudgetState());

    act(() => {
      result.current.openAdd();
      result.current.close();
    });

    expect(result.current.state.sheetVisible.value).toBe(false);
  });
});
