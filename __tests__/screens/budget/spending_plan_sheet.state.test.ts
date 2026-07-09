import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/components/spending_plan_sheet.state';

beforeEach(() => useSpendingPlanSheetState.getState().reset());

describe('useSpendingPlanSheetState', () => {
  it('initialises add mode dates and selected categories', () => {
    useSpendingPlanSheetState.getState().initAddMode({
      month: '2026-07',
      firstCategoryId: 'cat_food',
    });

    expect(useSpendingPlanSheetState.getState()).toEqual(
      expect.objectContaining({
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        selectedCategoryIds: ['cat_food'],
        allocateByCategory: false,
      }),
    );
  });

  it('toggles categories and clears removed allocations', () => {
    const state = useSpendingPlanSheetState.getState();
    state.initAddMode({ month: '2026-07', firstCategoryId: 'cat_food' });
    state.setAllocation('cat_food', 3000);
    state.toggleCategoryId('cat_food');

    expect(useSpendingPlanSheetState.getState().selectedCategoryIds).toEqual([]);
    expect(useSpendingPlanSheetState.getState().allocations).toEqual({});
  });

  it('resets sheet-local values', () => {
    useSpendingPlanSheetState
      .getState()
      .initAddMode({ month: '2026-07', firstCategoryId: 'cat_food' });
    useSpendingPlanSheetState.getState().reset();
    expect(useSpendingPlanSheetState.getState().selectedCategoryIds).toEqual([]);
  });
});
