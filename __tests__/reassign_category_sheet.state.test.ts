import { act, renderHook } from '@testing-library/react-native';

import { useReassignCategorySheetState } from '@/modules/categories/screens/settings/categories/components/reassign_category_sheet.state';

describe('useReassignCategorySheetState initial state', () => {
  it('starts with default values', () => {
    const { result } = renderHook(() => useReassignCategorySheetState());
    const { state } = result.current;
    expect(state.selectedId.value).toBeNull();
    expect(state.isLoading.value).toBe(false);
  });
});

describe('useReassignCategorySheetState setters', () => {
  it('setSelectedId updates selected id with a string', () => {
    const { result } = renderHook(() => useReassignCategorySheetState());
    act(() => result.current.setSelectedId('cat-123'));
    expect(result.current.state.selectedId.value).toBe('cat-123');
  });

  it('setSelectedId accepts null to clear selection', () => {
    const { result } = renderHook(() => useReassignCategorySheetState());
    act(() => result.current.setSelectedId('cat-123'));
    act(() => result.current.setSelectedId(null));
    expect(result.current.state.selectedId.value).toBeNull();
  });

  it('setIsLoading toggles loading flag', () => {
    const { result } = renderHook(() => useReassignCategorySheetState());
    act(() => result.current.setIsLoading(true));
    expect(result.current.state.isLoading.value).toBe(true);
    act(() => result.current.setIsLoading(false));
    expect(result.current.state.isLoading.value).toBe(false);
  });
});

describe('useReassignCategorySheetState reset', () => {
  it('returns to defaults', () => {
    const { result } = renderHook(() => useReassignCategorySheetState());
    act(() => {
      result.current.setSelectedId('cat-456');
      result.current.setIsLoading(true);
    });

    act(() => result.current.reset());

    const { state } = result.current;
    expect(state.selectedId.value).toBeNull();
    expect(state.isLoading.value).toBe(false);
  });
});
