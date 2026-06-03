import { act, renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { AccountColors } from '@/constants/theme';
import { useAddEditCategorySheetState } from '@/modules/categories/screens/settings/categories/components/add_edit_category_sheet.state';

describe('useAddEditCategorySheetState initial state', () => {
  it('starts with default values', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());
    const { state } = result.current;

    expect(state.type.value).toBe(CategoryType.Expense);
    expect(state.selectedIcon.value).toBeNull();
    expect(state.selectedColor.value).toBe(AccountColors[0]);
    expect(state.iconError.value).toBe('');
    expect(state.isLoading.value).toBe(false);
  });
});

describe('useAddEditCategorySheetState setters', () => {
  it('setType updates type', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() => result.current.setType(CategoryType.Income));
    expect(result.current.state.type.value).toBe(CategoryType.Income);

    act(() => result.current.setType(CategoryType.Expense));
    expect(result.current.state.type.value).toBe(CategoryType.Expense);
  });

  it('setSelectedIcon updates icon', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() => result.current.setSelectedIcon('home'));
    expect(result.current.state.selectedIcon.value).toBe('home');

    act(() => result.current.setSelectedIcon(null));
    expect(result.current.state.selectedIcon.value).toBeNull();
  });

  it('setSelectedColor updates color', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() => result.current.setSelectedColor('#ff0000'));

    expect(result.current.state.selectedColor.value).toBe('#ff0000');
  });

  it('setIconError updates error message', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() => result.current.setIconError('Icon required'));
    expect(result.current.state.iconError.value).toBe('Icon required');

    act(() => result.current.setIconError(''));
    expect(result.current.state.iconError.value).toBe('');
  });

  it('setIsLoading toggles loading flag', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() => result.current.setIsLoading(true));
    expect(result.current.state.isLoading.value).toBe(true);

    act(() => result.current.setIsLoading(false));
    expect(result.current.state.isLoading.value).toBe(false);
  });
});

describe('useAddEditCategorySheetState initialize', () => {
  it('sets type/icon/color and clears iconError + isLoading', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() => {
      result.current.setIconError('previous error');
      result.current.setIsLoading(true);
      result.current.initialize({
        type: CategoryType.Income,
        icon: 'cart',
        color: '#abcdef',
      });
    });

    const { state } = result.current;
    expect(state.type.value).toBe(CategoryType.Income);
    expect(state.selectedIcon.value).toBe('cart');
    expect(state.selectedColor.value).toBe('#abcdef');
    expect(state.iconError.value).toBe('');
    expect(state.isLoading.value).toBe(false);
  });

  it('accepts a null icon', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() =>
      result.current.initialize({
        type: CategoryType.Expense,
        icon: null,
        color: AccountColors[0],
      }),
    );

    expect(result.current.state.selectedIcon.value).toBeNull();
  });
});

describe('useAddEditCategorySheetState reset', () => {
  it('returns to defaults', () => {
    const { result } = renderHook(() => useAddEditCategorySheetState());

    act(() => {
      result.current.setType(CategoryType.Income);
      result.current.setSelectedIcon('home');
      result.current.setSelectedColor('#ff0000');
      result.current.setIconError('err');
      result.current.setIsLoading(true);
      result.current.reset();
    });

    const { state } = result.current;
    expect(state.type.value).toBe(CategoryType.Expense);
    expect(state.selectedIcon.value).toBeNull();
    expect(state.selectedColor.value).toBe(AccountColors[0]);
    expect(state.iconError.value).toBe('');
    expect(state.isLoading.value).toBe(false);
  });
});
