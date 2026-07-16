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

  it('initialises a contextual category and group together', () => {
    useSetBudgetSheetState.getState().initAddMode('cat_food', BudgetGroup.Need);

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_food',
      groupValue: BudgetGroup.Need,
    });
  });

  it('initialises edit mode with the current monthly group', () => {
    useSetBudgetSheetState.getState().initEditMode(BudgetGroup.Savings);

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: undefined,
      groupValue: BudgetGroup.Savings,
      pickerExpanded: false,
    });
  });

  it('tracks save state and clears a visible error when the form is edited', () => {
    useSetBudgetSheetState.getState().setSaving(true);
    useSetBudgetSheetState.getState().setErrorMessage('Save failed');
    expect(useSetBudgetSheetState.getState()).toMatchObject({
      saving: true,
      errorMessage: 'Save failed',
    });

    useSetBudgetSheetState.getState().clearError();
    expect(useSetBudgetSheetState.getState().errorMessage).toBeUndefined();
  });

  it('contains state transitions only', () => {
    expect(useSetBudgetSheetState.getState()).not.toHaveProperty('runSave');
  });
});
