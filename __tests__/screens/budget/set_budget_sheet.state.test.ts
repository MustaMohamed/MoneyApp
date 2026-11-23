import { BudgetGroup } from '@/constants/enums';
import {
  BUDGET_TAB_SHEET_OWNER,
  useSetBudgetSheetState,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.state';

beforeEach(() => useSetBudgetSheetState.getState().reset());

describe('useSetBudgetSheetState', () => {
  it('initialises add mode category and clears sheet-local values', () => {
    useSetBudgetSheetState.getState().setGroupValue(BudgetGroup.Need);
    useSetBudgetSheetState.getState().initAddMode(BUDGET_TAB_SHEET_OWNER, 'cat_food');

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
    useSetBudgetSheetState
      .getState()
      .initAddMode(BUDGET_TAB_SHEET_OWNER, 'cat_food', BudgetGroup.Need);

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_food',
      groupValue: BudgetGroup.Need,
    });
  });

  it('initialises edit mode with the current monthly group', () => {
    useSetBudgetSheetState.getState().initEditMode(BUDGET_TAB_SHEET_OWNER, BudgetGroup.Savings);

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

describe('the sheet slot is keyed by the screen that opens it (MA-295, Invariant 9)', () => {
  const sheet = () => useSetBudgetSheetState.getState();

  it('only openFor writes the open owner: release and initAddMode by another mount leave it', () => {
    sheet().initAddMode('a', 'cat_food', null, 'a:add');
    sheet().openFor('b');

    sheet().release('a');
    expect(sheet().openOwner).toBe('b');

    sheet().initAddMode('a', 'cat_food', null, 'a:add:2');
    expect(sheet().openOwner).toBe('b');
  });

  it('release by another owner leaves the session, the selection and the owed toast standing', () => {
    sheet().initAddMode('a', 'cat_food', null, 'a:add');
    sheet().completeSave('a', 'added');

    sheet().release('b');

    expect(sheet()).toMatchObject({
      owner: 'a',
      sessionKey: 'a:add',
      selectedCategoryId: 'cat_food',
      closeOutcome: 'added',
    });
  });

  it('release by the holder clears the selection and the error but keeps the owed toast', () => {
    sheet().initAddMode('a', 'cat_food', null, 'a:add');
    sheet().setErrorMessage('refused', true);
    sheet().completeSave('a', 'updated');

    sheet().release('a');

    expect(sheet()).toMatchObject({
      selectedCategoryId: undefined,
      errorMessage: undefined,
      nameTaken: false,
      closeOutcome: 'updated',
    });
  });

  it('a second init with the same owner and session key is refused, another owner is not', () => {
    expect(sheet().initAddMode('a', 'cat_food', null, 'k')).toBe(true);
    expect(sheet().initAddMode('a', 'cat_food', null, 'k')).toBe(false);
    expect(sheet().initEditMode('b', null, 'k')).toBe(true);
    expect(sheet().owner).toBe('b');
  });

  it('completeClose returns the outcome once, then undefined, and undefined to another owner', () => {
    sheet().initAddMode('a', 'cat_food', null, 'a:add');
    sheet().completeSave('a', 'added');

    expect(sheet().completeClose('b')).toBeUndefined();
    expect(sheet().completeClose('a')).toBe('added');
    expect(sheet().completeClose('a')).toBeUndefined();
  });

  it('completeSave by another owner owes no toast', () => {
    sheet().initAddMode('a', 'cat_food', null, 'a:add');

    sheet().completeSave('b', 'added');

    expect(sheet().completeClose('a')).toBeUndefined();
  });

  it('a new init clears an owed toast', () => {
    sheet().initAddMode('a', 'cat_food', null, 'a:add');
    sheet().completeSave('a', 'added');

    sheet().initEditMode('a', null, 'a:edit');

    expect(sheet().completeClose('a')).toBeUndefined();
  });

  it('clearError clears a taken-name mark with its message', () => {
    sheet().setErrorMessage('taken', true);
    expect(sheet().nameTaken).toBe(true);

    sheet().clearError();

    expect(sheet()).toMatchObject({ errorMessage: undefined, nameTaken: false });
  });

  it('setErrorMessage without the flag leaves nameTaken false', () => {
    sheet().setErrorMessage('taken', true);
    sheet().setErrorMessage('write failed');

    expect(sheet()).toMatchObject({ errorMessage: 'write failed', nameTaken: false });
  });

  it('a group change clears the taken-name mark', () => {
    sheet().setErrorMessage('taken', true);

    sheet().setGroupValue(BudgetGroup.Want);

    expect(sheet().nameTaken).toBe(false);
  });

  it('a category change clears the taken-name mark', () => {
    sheet().setErrorMessage('taken', true);

    sheet().setSelectedCategoryId('cat_other');

    expect(sheet().nameTaken).toBe(false);
  });
});
