import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state';
import { useSpendingPlanSheetStore } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.store';

beforeEach(() => {
  useSpendingPlanSheetState.getState().reset();
  useSpendingPlanSheetStore.getState().reset();
});

describe('spending plan sheet stores', () => {
  it('keeps form drafts in the data store', () => {
    useSpendingPlanSheetStore.getState().initAddMode({
      month: '2026-07',
      firstCategoryId: 'cat_food',
    });
    expect(useSpendingPlanSheetStore.getState()).toEqual(
      expect.objectContaining({
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        selectedCategoryIds: ['cat_food'],
        allocateByCategory: false,
      }),
    );
  });

  it('clears an allocation when its category is removed', () => {
    const store = useSpendingPlanSheetStore.getState();
    store.initAddMode({ month: '2026-07', firstCategoryId: 'cat_food' });
    store.setAllocation('cat_food', 3000);
    store.toggleCategoryId('cat_food');
    expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual([]);
    expect(useSpendingPlanSheetStore.getState().allocations).toEqual({});
  });

  it('keeps loading and picker visibility in the UI state store', () => {
    useSpendingPlanSheetState.getState().setSaving(true);
    useSpendingPlanSheetState.getState().openPicker();
    expect(useSpendingPlanSheetState.getState()).toEqual(
      expect.objectContaining({ saving: true, pickerExpanded: true }),
    );
  });
});
