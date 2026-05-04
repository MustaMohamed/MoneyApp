import { useReassignCategorySheetState } from '@/screens/settings/categories/components/reassign_category_sheet.state';

beforeEach(() => useReassignCategorySheetState.getState().reset());

describe('useReassignCategorySheetState initial state', () => {
  it('starts with default values', () => {
    const s = useReassignCategorySheetState.getState().state;
    expect(s.selectedId).toBeNull();
    expect(s.isLoading).toBe(false);
  });
});

describe('useReassignCategorySheetState setters', () => {
  it('setSelectedId updates selected id with a string', () => {
    useReassignCategorySheetState.getState().setSelectedId('cat-123');
    expect(useReassignCategorySheetState.getState().state.selectedId).toBe('cat-123');
  });

  it('setSelectedId accepts null to clear selection', () => {
    useReassignCategorySheetState.getState().setSelectedId('cat-123');
    useReassignCategorySheetState.getState().setSelectedId(null);
    expect(useReassignCategorySheetState.getState().state.selectedId).toBeNull();
  });

  it('setIsLoading toggles loading flag', () => {
    useReassignCategorySheetState.getState().setIsLoading(true);
    expect(useReassignCategorySheetState.getState().state.isLoading).toBe(true);
    useReassignCategorySheetState.getState().setIsLoading(false);
    expect(useReassignCategorySheetState.getState().state.isLoading).toBe(false);
  });
});

describe('useReassignCategorySheetState reset', () => {
  it('returns to defaults', () => {
    useReassignCategorySheetState.setState({
      state: { selectedId: 'cat-456', isLoading: true },
    });
    useReassignCategorySheetState.getState().reset();
    const s = useReassignCategorySheetState.getState().state;
    expect(s.selectedId).toBeNull();
    expect(s.isLoading).toBe(false);
  });
});
