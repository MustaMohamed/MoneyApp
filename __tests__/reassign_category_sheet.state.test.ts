import { useReassignCategorySheetState } from '@/modules/categories/screens/settings/categories/components/reassign_category_sheet.state';

beforeEach(() => useReassignCategorySheetState.getState().reset());

describe('useReassignCategorySheetState initial state', () => {
  it('starts with default values', () => {
    const s = useReassignCategorySheetState.getState();
    expect(s.selectedId).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.errorMessage).toBeUndefined();
  });
});

describe('useReassignCategorySheetState setters', () => {
  it('setSelectedId updates selected id with a string', () => {
    useReassignCategorySheetState.getState().setSelectedId('cat-123');
    expect(useReassignCategorySheetState.getState().selectedId).toBe('cat-123');
  });

  it('setSelectedId accepts null to clear selection', () => {
    useReassignCategorySheetState.getState().setSelectedId('cat-123');
    useReassignCategorySheetState.getState().setSelectedId(null);
    expect(useReassignCategorySheetState.getState().selectedId).toBeNull();
  });

  it('setIsLoading toggles loading flag', () => {
    useReassignCategorySheetState.getState().setIsLoading(true);
    expect(useReassignCategorySheetState.getState().isLoading).toBe(true);
    useReassignCategorySheetState.getState().setIsLoading(false);
    expect(useReassignCategorySheetState.getState().isLoading).toBe(false);
  });

  it('stores a reassignment error for the sheet to display', () => {
    useReassignCategorySheetState.getState().setErrorMessage('Plans overlap');
    expect(useReassignCategorySheetState.getState().errorMessage).toBe('Plans overlap');
  });
});

describe('useReassignCategorySheetState reset', () => {
  it('returns to defaults', () => {
    useReassignCategorySheetState.setState({
      selectedId: 'cat-456',
      isLoading: true,
      errorMessage: 'Plans overlap',
    });
    useReassignCategorySheetState.getState().reset();
    const s = useReassignCategorySheetState.getState();
    expect(s.selectedId).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.errorMessage).toBeUndefined();
  });
});
