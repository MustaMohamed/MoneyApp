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
    expect(s.targetBudgetId).toBeUndefined();
    expect(s.selectedMonth).toBe('2026-07');
    expect(s.copySourceMonth).toBe('2026-06');
    expect(s.copySelectedBudgetIds).toEqual([]);
    expect(s.copyBusy).toBe(false);
    expect(s.copyError).toBe(false);
    expect(s).not.toHaveProperty('incomeSuggestion');
    jest.useRealTimers();
  });

  it('openAdd opens in add mode with no target', () => {
    useBudgetState.getState().openEdit('budget-food');
    useBudgetState.getState().openAdd();
    const s = useBudgetState.getState();
    expect(s.sheetVisible).toBe(true);
    expect(s.mode).toBe('add');
    expect(s.targetBudgetId).toBeUndefined();
  });

  it('openEdit opens in edit mode targeting a budget', () => {
    useBudgetState.getState().openEdit('budget-food');
    const s = useBudgetState.getState();
    expect(s.sheetVisible).toBe(true);
    expect(s.mode).toBe('edit');
    expect(s.targetBudgetId).toBe('budget-food');
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
    expect(useBudgetState.getState().copySourceMonth).toBe('2026-05');

    useBudgetState.getState().resetSelectedMonthToCurrent();
    expect(useBudgetState.getState().selectedMonth).toBe('2026-07');
    expect(useBudgetState.getState().copySourceMonth).toBe('2026-06');
    jest.useRealTimers();
  });

  it('controls one expanded category and clears it when the month changes', () => {
    useBudgetState.getState().setExpandedCategoryId('cat_food');
    expect(useBudgetState.getState().expandedCategoryId).toBe('cat_food');

    useBudgetState.getState().setSelectedMonth('2026-08');
    expect(useBudgetState.getState().expandedCategoryId).toBeUndefined();
  });

  it('stores and resets the copy source month', () => {
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().setCopySourceMonth('2026-05');
    expect(useBudgetState.getState().copySourceMonth).toBe('2026-05');

    useBudgetState.getState().closeCopy();
    expect(useBudgetState.getState().copySourceMonth).toBe('2026-07');
  });

  it('opens copy sheet with selected source budgets by default', () => {
    useBudgetState.getState().openCopy(['budget-food', 'budget-car']);
    const s = useBudgetState.getState();
    expect(s.copySheetVisible).toBe(true);
    expect(s.copySelectedBudgetIds).toEqual(['budget-food', 'budget-car']);
  });

  it('toggles and clears copy budget selection', () => {
    useBudgetState.getState().openCopy(['budget-food', 'budget-car']);
    useBudgetState.getState().toggleCopyBudgetId('budget-food');
    expect(useBudgetState.getState().copySelectedBudgetIds).toEqual(['budget-car']);

    useBudgetState.getState().toggleCopyBudgetId('budget-rent');
    expect(useBudgetState.getState().copySelectedBudgetIds).toEqual(['budget-car', 'budget-rent']);

    useBudgetState.getState().clearCopySelection();
    expect(useBudgetState.getState().copySelectedBudgetIds).toEqual([]);
  });

  it('closes copy sheet and clears copy selection', () => {
    useBudgetState.getState().openCopy(['budget-food']);
    useBudgetState.getState().setCopyBusy(true);
    useBudgetState.getState().setCopyError(true);
    useBudgetState.getState().closeCopy();
    const s = useBudgetState.getState();
    expect(s.copySheetVisible).toBe(false);
    expect(s.copySelectedBudgetIds).toEqual([]);
    expect(s.copyBusy).toBe(false);
    expect(s.copyError).toBe(false);
  });
});
