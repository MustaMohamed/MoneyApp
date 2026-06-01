import { act, renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { useCategoriesScreenState } from '@/modules/categories/screens/settings/categories/categories.state';

describe('useCategoriesScreenState', () => {
  it('starts with activeTab=expense and all sheets hidden', () => {
    const { result } = renderHook(() => useCategoriesScreenState());
    const { state } = result.current;
    expect(state.activeTab.value).toBe(CategoryType.Expense);
    expect(state.showAddSheet.value).toBe(false);
    expect(state.showDeleteConfirm.value).toBe(false);
    expect(state.showReassignSheet.value).toBe(false);
  });

  it('setActiveTab switches between expense and income', () => {
    const { result } = renderHook(() => useCategoriesScreenState());
    act(() => result.current.setActiveTab(CategoryType.Income));
    expect(result.current.state.activeTab.value).toBe(CategoryType.Income);
    act(() => result.current.setActiveTab(CategoryType.Expense));
    expect(result.current.state.activeTab.value).toBe(CategoryType.Expense);
  });

  it('setShowAddSheet toggles', () => {
    const { result } = renderHook(() => useCategoriesScreenState());
    act(() => result.current.setShowAddSheet(true));
    expect(result.current.state.showAddSheet.value).toBe(true);
    act(() => result.current.setShowAddSheet(false));
    expect(result.current.state.showAddSheet.value).toBe(false);
  });

  it('setShowDeleteConfirm toggles', () => {
    const { result } = renderHook(() => useCategoriesScreenState());
    act(() => result.current.setShowDeleteConfirm(true));
    expect(result.current.state.showDeleteConfirm.value).toBe(true);
    act(() => result.current.setShowDeleteConfirm(false));
    expect(result.current.state.showDeleteConfirm.value).toBe(false);
  });

  it('setShowReassignSheet toggles', () => {
    const { result } = renderHook(() => useCategoriesScreenState());
    act(() => result.current.setShowReassignSheet(true));
    expect(result.current.state.showReassignSheet.value).toBe(true);
    act(() => result.current.setShowReassignSheet(false));
    expect(result.current.state.showReassignSheet.value).toBe(false);
  });

  it('reset returns to defaults', () => {
    const { result } = renderHook(() => useCategoriesScreenState());
    act(() => {
      result.current.setActiveTab(CategoryType.Income);
      result.current.setShowAddSheet(true);
      result.current.setShowDeleteConfirm(true);
      result.current.setShowReassignSheet(true);
      result.current.setIsDeleting(true);
    });

    act(() => result.current.reset());

    const { state } = result.current;
    expect(state.activeTab.value).toBe(CategoryType.Expense);
    expect(state.showAddSheet.value).toBe(false);
    expect(state.showDeleteConfirm.value).toBe(false);
    expect(state.showReassignSheet.value).toBe(false);
    expect(state.isDeleting.value).toBe(false);
  });
});
