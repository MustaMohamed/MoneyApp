import { CategoryType } from '@/constants/enums';
import { AccountColors } from '@/constants/theme';
import { useAddEditCategorySheetState } from '@/modules/categories/screens/settings/categories/components/add_edit_category_sheet.state';

beforeEach(() => useAddEditCategorySheetState.getState().reset());

describe('useAddEditCategorySheetState initial state', () => {
  it('starts with default values', () => {
    const s = useAddEditCategorySheetState.getState().state;
    expect(s.type).toBe(CategoryType.Expense);
    expect(s.selectedIcon).toBeNull();
    expect(s.selectedColor).toBe(AccountColors[0]);
    expect(s.iconError).toBe('');
    expect(s.isLoading).toBe(false);
  });
});

describe('useAddEditCategorySheetState setters', () => {
  it('setType updates type', () => {
    useAddEditCategorySheetState.getState().setType(CategoryType.Income);
    expect(useAddEditCategorySheetState.getState().state.type).toBe(CategoryType.Income);
    useAddEditCategorySheetState.getState().setType(CategoryType.Expense);
    expect(useAddEditCategorySheetState.getState().state.type).toBe(CategoryType.Expense);
  });

  it('setSelectedIcon updates icon', () => {
    useAddEditCategorySheetState.getState().setSelectedIcon('home');
    expect(useAddEditCategorySheetState.getState().state.selectedIcon).toBe('home');
    useAddEditCategorySheetState.getState().setSelectedIcon(null);
    expect(useAddEditCategorySheetState.getState().state.selectedIcon).toBeNull();
  });

  it('setSelectedColor updates color', () => {
    useAddEditCategorySheetState.getState().setSelectedColor('#ff0000');
    expect(useAddEditCategorySheetState.getState().state.selectedColor).toBe('#ff0000');
  });

  it('setIconError updates error message', () => {
    useAddEditCategorySheetState.getState().setIconError('Icon required');
    expect(useAddEditCategorySheetState.getState().state.iconError).toBe('Icon required');
    useAddEditCategorySheetState.getState().setIconError('');
    expect(useAddEditCategorySheetState.getState().state.iconError).toBe('');
  });

  it('setIsLoading toggles loading flag', () => {
    useAddEditCategorySheetState.getState().setIsLoading(true);
    expect(useAddEditCategorySheetState.getState().state.isLoading).toBe(true);
    useAddEditCategorySheetState.getState().setIsLoading(false);
    expect(useAddEditCategorySheetState.getState().state.isLoading).toBe(false);
  });
});

describe('useAddEditCategorySheetState initialize', () => {
  it('sets type/icon/color and clears iconError + isLoading', () => {
    useAddEditCategorySheetState.getState().setIconError('previous error');
    useAddEditCategorySheetState.getState().setIsLoading(true);

    useAddEditCategorySheetState.getState().initialize({
      type: CategoryType.Income,
      icon: 'cart',
      color: '#abcdef',
    });

    const s = useAddEditCategorySheetState.getState().state;
    expect(s.type).toBe(CategoryType.Income);
    expect(s.selectedIcon).toBe('cart');
    expect(s.selectedColor).toBe('#abcdef');
    expect(s.iconError).toBe('');
    expect(s.isLoading).toBe(false);
  });

  it('accepts a null icon', () => {
    useAddEditCategorySheetState.getState().initialize({
      type: CategoryType.Expense,
      icon: null,
      color: AccountColors[0],
    });
    expect(useAddEditCategorySheetState.getState().state.selectedIcon).toBeNull();
  });
});

describe('useAddEditCategorySheetState reset', () => {
  it('returns to defaults', () => {
    useAddEditCategorySheetState.setState({
      state: {
        type: CategoryType.Income,
        selectedIcon: 'home',
        selectedColor: '#ff0000',
        iconError: 'err',
        isLoading: true,
      },
    });
    useAddEditCategorySheetState.getState().reset();
    const s = useAddEditCategorySheetState.getState().state;
    expect(s.type).toBe(CategoryType.Expense);
    expect(s.selectedIcon).toBeNull();
    expect(s.selectedColor).toBe(AccountColors[0]);
    expect(s.iconError).toBe('');
    expect(s.isLoading).toBe(false);
  });
});
