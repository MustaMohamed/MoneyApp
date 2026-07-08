import { BudgetGroup } from '@/constants/enums';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';

beforeEach(() => useSetBudgetSheetState.getState().reset());

describe('useSetBudgetSheetState', () => {
  it('initialises add mode category and clears sheet-local values', () => {
    useSetBudgetSheetState.getState().setGroupValue(BudgetGroup.Need);
    useSetBudgetSheetState.getState().initAddMode('cat_food');

    const s = useSetBudgetSheetState.getState();
    expect(s.selectedCategoryId).toBe('cat_food');
    expect(s.pickerExpanded).toBe(false);
    expect(s.groupValue).toBeNull();
  });

  it('stores group selection outside the sheet component', () => {
    useSetBudgetSheetState.getState().setGroupValue(BudgetGroup.Want);
    expect(useSetBudgetSheetState.getState().groupValue).toBe(BudgetGroup.Want);

    useSetBudgetSheetState.getState().setGroupValue(null);
    expect(useSetBudgetSheetState.getState().groupValue).toBeNull();
  });
});
