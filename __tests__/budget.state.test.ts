import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

beforeEach(() => useBudgetState.getState().reset());

describe('useBudgetState', () => {
  it('starts with current month state and closed sheets', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T12:00:00'));
    useBudgetState.getState().reset();
    const s = useBudgetState.getState();
    expect(s.sheetVisible).toBe(false);
    expect(s.copySheetVisible).toBe(false);
    expect(s.mode).toBe('add');
    expect(s.targetCategoryId).toBeUndefined();
    expect(s.selectedMonth).toBe('2026-07');
    expect(s.copySelectedCategoryIds).toEqual([]);
    expect(s.incomeSuggestion).toBeNull();
    jest.useRealTimers();
  });

  it('openAdd opens in add mode with no target', () => {
    useBudgetState.getState().openEdit('cat_food');
    useBudgetState.getState().openAdd();
    const s = useBudgetState.getState();
    expect(s.sheetVisible).toBe(true);
    expect(s.mode).toBe('add');
    expect(s.targetCategoryId).toBeUndefined();
  });

  it('openEdit opens in edit mode targeting a category', () => {
    useBudgetState.getState().openEdit('cat_food');
    const s = useBudgetState.getState();
    expect(s.sheetVisible).toBe(true);
    expect(s.mode).toBe('edit');
    expect(s.targetCategoryId).toBe('cat_food');
  });

  it('close hides the sheet', () => {
    useBudgetState.getState().openAdd();
    useBudgetState.getState().close();
    expect(useBudgetState.getState().sheetVisible).toBe(false);
  });

  it('sets and resets the selected budget month', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T12:00:00'));
    useBudgetState.getState().setSelectedMonth('2026-06');
    expect(useBudgetState.getState().selectedMonth).toBe('2026-06');

    useBudgetState.getState().resetSelectedMonthToCurrent();
    expect(useBudgetState.getState().selectedMonth).toBe('2026-07');
    jest.useRealTimers();
  });

  it('opens copy sheet with selected source categories by default', () => {
    useBudgetState.getState().openCopy(['cat_food', 'cat_car']);
    const s = useBudgetState.getState();
    expect(s.copySheetVisible).toBe(true);
    expect(s.copySelectedCategoryIds).toEqual(['cat_food', 'cat_car']);
  });

  it('toggles and clears copy category selection', () => {
    useBudgetState.getState().openCopy(['cat_food', 'cat_car']);
    useBudgetState.getState().toggleCopyCategoryId('cat_food');
    expect(useBudgetState.getState().copySelectedCategoryIds).toEqual(['cat_car']);

    useBudgetState.getState().toggleCopyCategoryId('cat_rent');
    expect(useBudgetState.getState().copySelectedCategoryIds).toEqual(['cat_car', 'cat_rent']);

    useBudgetState.getState().clearCopySelection();
    expect(useBudgetState.getState().copySelectedCategoryIds).toEqual([]);
  });

  it('closes copy sheet and clears copy selection', () => {
    useBudgetState.getState().openCopy(['cat_food']);
    useBudgetState.getState().closeCopy();
    const s = useBudgetState.getState();
    expect(s.copySheetVisible).toBe(false);
    expect(s.copySelectedCategoryIds).toEqual([]);
  });

  it('stores the trailing income suggestion for the 50/30/20 lens', () => {
    useBudgetState.getState().setIncomeSuggestion(25000);
    expect(useBudgetState.getState().incomeSuggestion).toBe(25000);
    useBudgetState.getState().setIncomeSuggestion(null);
    expect(useBudgetState.getState().incomeSuggestion).toBeNull();
  });
});
