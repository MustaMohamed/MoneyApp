import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

beforeEach(() => useBudgetState.getState().reset());

describe('useBudgetState', () => {
  it('starts closed', () => {
    const s = useBudgetState.getState().state;
    expect(s.sheetVisible).toBe(false);
    expect(s.mode).toBe('add');
    expect(s.targetCategoryId).toBeUndefined();
  });

  it('openAdd opens in add mode with no target', () => {
    useBudgetState.getState().openEdit('cat_food');
    useBudgetState.getState().openAdd();
    const s = useBudgetState.getState().state;
    expect(s.sheetVisible).toBe(true);
    expect(s.mode).toBe('add');
    expect(s.targetCategoryId).toBeUndefined();
  });

  it('openEdit opens in edit mode targeting a category', () => {
    useBudgetState.getState().openEdit('cat_food');
    const s = useBudgetState.getState().state;
    expect(s.sheetVisible).toBe(true);
    expect(s.mode).toBe('edit');
    expect(s.targetCategoryId).toBe('cat_food');
  });

  it('close hides the sheet', () => {
    useBudgetState.getState().openAdd();
    useBudgetState.getState().close();
    expect(useBudgetState.getState().state.sheetVisible).toBe(false);
  });
});
