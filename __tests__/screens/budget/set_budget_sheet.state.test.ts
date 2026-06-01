import { act, renderHook } from '@testing-library/react-native';

import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';

describe('useSetBudgetSheetState', () => {
  it('starts with no selected category and collapsed picker', () => {
    const { result } = renderHook(() => useSetBudgetSheetState());

    expect(result.current.state.selectedCategoryId.value).toBeUndefined();
    expect(result.current.state.pickerExpanded.value).toBe(false);
  });

  it('initAddMode selects the first category and collapses the picker', () => {
    const { result } = renderHook(() => useSetBudgetSheetState());

    act(() => {
      result.current.togglePicker();
      result.current.initAddMode('cat-food');
    });

    expect(result.current.state.selectedCategoryId.value).toBe('cat-food');
    expect(result.current.state.pickerExpanded.value).toBe(false);
  });

  it('setSelectedCategoryId updates selection and collapses the picker', () => {
    const { result } = renderHook(() => useSetBudgetSheetState());

    act(() => {
      result.current.togglePicker();
      result.current.setSelectedCategoryId('cat-rent');
    });

    expect(result.current.state.selectedCategoryId.value).toBe('cat-rent');
    expect(result.current.state.pickerExpanded.value).toBe(false);
  });

  it('togglePicker flips picker visibility', () => {
    const { result } = renderHook(() => useSetBudgetSheetState());

    act(() => result.current.togglePicker());
    expect(result.current.state.pickerExpanded.value).toBe(true);

    act(() => result.current.togglePicker());
    expect(result.current.state.pickerExpanded.value).toBe(false);
  });

  it('collapsePicker hides the picker', () => {
    const { result } = renderHook(() => useSetBudgetSheetState());

    act(() => {
      result.current.togglePicker();
      result.current.collapsePicker();
    });

    expect(result.current.state.pickerExpanded.value).toBe(false);
  });

  it('reset restores the initial state', () => {
    const { result } = renderHook(() => useSetBudgetSheetState());

    act(() => {
      result.current.setSelectedCategoryId('cat-rent');
      result.current.togglePicker();
      result.current.reset();
    });

    expect(result.current.state.selectedCategoryId.value).toBeUndefined();
    expect(result.current.state.pickerExpanded.value).toBe(false);
  });
});
