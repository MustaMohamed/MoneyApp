import { act, renderHook, waitFor } from '@testing-library/react-native';

import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { BudgetNameTakenError } from '@/modules/budget/repositories/budget.repository';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  useSetBudgetSheet,
  useSetBudgetSheetSave,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.hook';
import {
  BUDGET_TAB_SHEET_OWNER,
  useSetBudgetSheetState,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { makeTestBudgetEditTarget, makeTestBudgetableCategory } from '@/test_helpers/budget';
import { deferred } from '@/test_helpers/deferred';
import { MoneyTextMappingError, parseRequiredMoneyText } from '@/utils/money_text';

// `useBottomSheetAwareHandlers` needs a mounted sheet context `renderHook` does not provide.
jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
}));

// A blanket mock would break `formatStoredMoneyText`, which the prefill needs real.
jest.mock('@/utils/money_text', () => {
  const actual = jest.requireActual('@/utils/money_text');
  return { ...actual, parseRequiredMoneyText: jest.fn(actual.parseRequiredMoneyText) };
});
const mockedParseRequiredMoneyText = parseRequiredMoneyText as jest.Mock;

const mockToast = { show: jest.fn() };
// The wrapper, not HeroUI, so `show` sees exactly what the call site passed.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
}));

const categories = [makeTestBudgetableCategory()];

const existingBudget = makeTestBudgetEditTarget();

beforeEach(() => {
  useSetBudgetSheetState.getState().reset();
  useBudgetState.getState().reset();
  useSetBudgetSheetState.getState().openFor(BUDGET_TAB_SHEET_OWNER);
  mockedParseRequiredMoneyText.mockClear();
  mockToast.show.mockClear();
});

describe('useSetBudgetSheetSave', () => {
  it('reports rejection and preserves sheet selection for retry', async () => {
    useSetBudgetSheetState.getState().initAddMode(BUDGET_TAB_SHEET_OWNER, 'cat_food');
    const { result } = await renderHook(() => useSetBudgetSheetSave());

    let saved = true;
    await act(async () => {
      saved = await result.current.runSave(jest.fn().mockRejectedValue(new Error('write failed')));
    });

    expect(saved).toBe(false);
    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_food',
      saving: false,
      errorMessage: Strings.budgetSaveError,
    });
  });

  it('prevents duplicate save operations while a save is running', async () => {
    const pendingSave = deferred();
    const operation = jest.fn(() => pendingSave.promise);
    const { result } = await renderHook(() => useSetBudgetSheetSave());

    let firstSave!: Promise<boolean>;
    await act(() => {
      firstSave = result.current.runSave(operation);
    });
    await act(async () => {
      expect(await result.current.runSave(operation)).toBe(false);
    });
    expect(operation).toHaveBeenCalledTimes(1);

    await act(async () => pendingSave.resolve());
    await expect(firstSave).resolves.toBe(true);
  });
});

describe('useSetBudgetSheet', () => {
  it('parses the limit exactly once on a valid edit-mode submit', async () => {
    const setBudget = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setBudget });
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit(existingBudget.id);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: categories,
        editingRow: existingBudget,
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());

    await act(async () => result.current.submit());

    expect(setBudget).toHaveBeenCalledTimes(1);
    const [input] = setBudget.mock.calls[0] as [{ limit: number }];
    expect(input.limit).toBe(1500);
  });

  it('surfaces the save error and does not save on a schema/submit desync', async () => {
    const setBudget = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setBudget });
    mockedParseRequiredMoneyText.mockImplementationOnce(() => {
      throw new MoneyTextMappingError('limitText');
    });
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit(existingBudget.id);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: categories,
        editingRow: existingBudget,
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());

    await act(async () => {
      await expect(result.current.submit()).resolves.toBeUndefined();
    });

    expect(setBudget).not.toHaveBeenCalled();
    expect(useSetBudgetSheetState.getState().errorMessage).toBe(Strings.budgetSaveError);
  });
});

describe('useSetBudgetSheet — MA-115 a half-typed limit', () => {
  type SetBudgetHookResult = { current: ReturnType<typeof useSetBudgetSheet> };

  const limitError = (result: SetBudgetHookResult) =>
    result.current.control.getFieldState('limitText').error?.message;

  // Lets the validation a keystroke started resolve before the next read.
  async function typeLimit(result: SetBudgetHookResult, text: string) {
    await act(async () => {
      result.current.setLimitText(text);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async function mountEdit(setBudget: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
    useBudgetStore.setState({ setBudget });
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit(existingBudget.id);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: categories,
        editingRow: existingBudget,
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());
    return { result, setBudget };
  }

  async function mountRefused() {
    const sheet = await mountEdit();
    await typeLimit(sheet.result, '');
    await act(async () => sheet.result.current.submit());
    expect(sheet.setBudget).not.toHaveBeenCalled();
    expect(limitError(sheet.result)).toBe(Strings.budgetAmountRequired);
    return sheet;
  }

  async function mountRejected() {
    const sheet = await mountEdit(jest.fn().mockRejectedValue(new Error('write failed')));
    await act(async () => sheet.result.current.submit());
    expect(sheet.setBudget).toHaveBeenCalledTimes(1);
    expect(useSetBudgetSheetState.getState().errorMessage).toBe(Strings.budgetSaveError);
    return sheet;
  }

  it.each(['48.', '0', '0.', '0.0'])(
    'after a refused Save the limit shows no fault at %p',
    async (text) => {
      const { result } = await mountRefused();

      await typeLimit(result, text);

      expect(limitError(result)).toBeUndefined();
    },
  );

  it.each(['48.', '0', '0.', '0.0'])(
    'after a rejected write the limit shows no fault at %p',
    async (text) => {
      const { result } = await mountRejected();

      await typeLimit(result, text);

      expect(limitError(result)).toBeUndefined();
    },
  );

  it('after a refused Save a complete limit under the floor shows its fault as typed', async () => {
    const { result } = await mountRefused();

    await typeLimit(result, '0.001');

    expect(limitError(result)).toBe(Strings.budgetAmountRequired);
  });

  it('before any Save "0.001" and a limit typed and then cleared raise nothing', async () => {
    const { result } = await mountEdit();

    await typeLimit(result, '0.001');
    expect(limitError(result)).toBeUndefined();

    await typeLimit(result, '');
    expect(limitError(result)).toBeUndefined();
  });

  it.each([
    ['48.', Strings.errAmountInvalid],
    ['0', Strings.budgetAmountRequired],
    ['0.0', Strings.budgetAmountRequired],
    ['', Strings.budgetAmountRequired],
  ])('Save with the limit %p reads %p and writes nothing', async (text, message) => {
    const { result, setBudget } = await mountEdit();
    await typeLimit(result, text);

    await act(async () => result.current.submit());

    expect(limitError(result)).toBe(message);
    expect(setBudget).not.toHaveBeenCalled();
  });

  it('a clear and "48." sent back to back leave no fault once the validation settles', async () => {
    const { result } = await mountRefused();
    await typeLimit(result, '5');
    expect(limitError(result)).toBeUndefined();

    await act(async () => {
      result.current.setLimitText('');
      result.current.setLimitText('48.');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(limitError(result)).toBeUndefined();
  });
});

describe('a duplicate-name refusal shows its own message on the sheet (MA-287)', () => {
  const health = makeTestBudgetableCategory({ id: 'cat_health', name: 'Health' });
  const mapTaken = (error: unknown) =>
    error instanceof BudgetNameTakenError ? `taken ${error.budgetName}` : undefined;

  it("runSave sets the refusal mapper's message for a BudgetNameTakenError and returns false", async () => {
    const { result } = await renderHook(() => useSetBudgetSheetSave());

    let saved = true;
    await act(async () => {
      saved = await result.current.runSave(
        jest.fn().mockRejectedValue(new BudgetNameTakenError('Gym')),
        mapTaken,
      );
    });

    expect(saved).toBe(false);
    expect(useSetBudgetSheetState.getState().errorMessage).toBe('taken Gym');
  });

  it('runSave falls back to the generic save error for an error the mapper does not map', async () => {
    const { result } = await renderHook(() => useSetBudgetSheetSave());

    await act(async () => {
      await result.current.runSave(
        jest.fn().mockRejectedValue(new BudgetNameTakenError('Gym')),
        mapTaken,
      );
    });
    expect(useSetBudgetSheetState.getState().errorMessage).toBe('taken Gym');

    await act(async () => {
      await result.current.runSave(
        jest.fn().mockRejectedValue(new Error('write failed')),
        mapTaken,
      );
    });
    expect(useSetBudgetSheetState.getState().errorMessage).toBe(Strings.budgetSaveError);
  });

  it('an edit-mode save refused for a taken name shows the category, name and month, and the sheet stays open', async () => {
    const editing = makeTestBudgetEditTarget({
      categoryId: 'cat_health',
      categoryName: 'Health',
      name: 'Yoga',
    });
    useBudgetStore.setState({
      setBudget: jest.fn().mockRejectedValue(new BudgetNameTakenError('Gym')),
    });
    useBudgetState.getState().setSelectedMonth('2026-11');
    useBudgetState.getState().openEdit(editing.id);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: [health],
        editingRow: editing,
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());

    await act(async () => result.current.submit());

    expect(useSetBudgetSheetState.getState().errorMessage).toBe(
      Strings.budgetNameTaken('Health', 'Gym', 'November'),
    );
    expect(result.current.state.nameTaken).toBe(true);
    expect(result.current.state.footerMessage).toBe(
      Strings.budgetNameTaken('Health', 'Gym', 'November'),
    );
    expect(useBudgetState.getState().sheetVisible).toBe(true);
  });

  it('an add-mode save refused for a taken name names the selected category, and the sheet stays open', async () => {
    useBudgetStore.setState({
      setBudget: jest.fn().mockRejectedValue(new BudgetNameTakenError('gym')),
    });
    useBudgetState.getState().setSelectedMonth('2026-11');
    useBudgetState.getState().openAdd();
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: [health],
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());
    expect(result.current.state.selectedCategoryId).toBe('cat_health');

    await act(async () => {
      await result.current.control
        .register('nameText')
        .onChange({ target: { name: 'nameText', value: ' gym ' }, type: 'change' });
      result.current.setLimitText('500');
    });
    await act(async () => result.current.submit());

    expect(useSetBudgetSheetState.getState().errorMessage).toBe(
      Strings.budgetNameTaken('Health', 'gym', 'November'),
    );
    expect(result.current.state.nameTaken).toBe(true);
    expect(result.current.state.footerMessage).toBe(
      Strings.budgetNameTaken('Health', 'gym', 'November'),
    );
    expect(useBudgetState.getState().sheetVisible).toBe(true);
  });
});

describe('the sheet starts on the group the category shows for the month (MA-287)', () => {
  const health = makeTestBudgetableCategory({
    id: 'cat_health',
    name: 'Health',
    budget_group: BudgetGroup.Need,
  });
  const food = makeTestBudgetableCategory({
    id: 'cat_food',
    name: 'Food',
    budget_group: BudgetGroup.Need,
  });
  const gifts = makeTestBudgetableCategory({
    id: 'cat_gifts',
    name: 'Gifts',
    budget_group: BudgetGroup.Want,
  });
  const shownGroupByCategoryId = {
    cat_health: BudgetGroup.Want,
    cat_food: BudgetGroup.Savings,
  };

  async function mountAdd(budgetableCategories = [health, food, gifts]) {
    const setBudget = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setBudget });
    useBudgetState.getState().setSelectedMonth('2026-11');
    useBudgetState.getState().openAdd();
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories,
        shownGroupByCategoryId,
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());
    return { result, setBudget };
  }

  it('add mode on a category whose month group is Want and default Need starts on Want', async () => {
    await mountAdd();

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_health',
      groupValue: BudgetGroup.Want,
    });
  });

  it('add mode on a category with no entry for the month starts not grouped', async () => {
    await mountAdd([gifts, health]);

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_gifts',
      groupValue: null,
    });
  });

  it("selectCategory moves the group to the chosen category's entry for the month", async () => {
    const { result } = await mountAdd();

    await act(async () => result.current.selectCategory(food));
    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_food',
      groupValue: BudgetGroup.Savings,
    });

    await act(async () => result.current.selectCategory(gifts));
    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_gifts',
      groupValue: null,
    });
  });

  it('a sheet opened from a 50/30/20 group keeps that group after selectCategory', async () => {
    useBudgetStore.setState({ setBudget: jest.fn().mockResolvedValue(undefined) });
    useBudgetState.getState().setSelectedMonth('2026-11');
    useBudgetState.getState().openAddWithContext(undefined, BudgetGroup.Need);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: [health, food],
        shownGroupByCategoryId,
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());
    expect(useSetBudgetSheetState.getState().groupValue).toBe(BudgetGroup.Need);

    await act(async () => result.current.selectCategory(health));

    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_health',
      groupValue: BudgetGroup.Need,
    });
  });

  it('a save without touching the group sends the group the category shows for the month', async () => {
    const { result, setBudget } = await mountAdd();

    await act(async () => {
      await result.current.control
        .register('nameText')
        .onChange({ target: { name: 'nameText', value: 'Gym' }, type: 'change' });
      result.current.setLimitText('500');
    });
    await act(async () => result.current.submit());

    expect(setBudget).toHaveBeenCalledTimes(1);
    expect(setBudget).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'cat_health',
        yearMonth: '2026-11',
        categoryGroup: BudgetGroup.Want,
      }),
    );
  });
});

describe('the sheet opens only for the screen that stamped it (MA-295, Invariant 9)', () => {
  it('two mounts: only the stamped owner opens, and the other mount leaves its session standing', async () => {
    const food = makeTestBudgetableCategory();
    useBudgetStore.setState({ setBudget: jest.fn().mockResolvedValue(undefined) });
    useBudgetState.getState().setSelectedMonth('2026-11');
    const a = await renderHook(() =>
      useSetBudgetSheet({ owner: 'a', budgetableCategories: [food], shownGroupByCategoryId: {} }),
    );
    const b = await renderHook(() =>
      useSetBudgetSheet({ owner: 'b', budgetableCategories: [food], shownGroupByCategoryId: {} }),
    );

    await act(async () => {
      useSetBudgetSheetState.getState().openFor('a');
      useBudgetState.getState().openAdd();
    });
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());

    expect(a.result.current.state.sheetVisible).toBe(true);
    expect(a.result.current.state.selectedCategoryId).toBe(food.id);
    expect(b.result.current.state.sheetVisible).toBe(false);
    expect(useSetBudgetSheetState.getState()).toMatchObject({
      owner: 'a',
      selectedCategoryId: food.id,
    });
  });
});

describe('the redrawn sheet resolves its title, month line, faults and footer (MA-295)', () => {
  const health = makeTestBudgetableCategory({ id: 'cat_health', name: 'Health' });

  async function typeNameAndLimit(
    result: { current: ReturnType<typeof useSetBudgetSheet> },
    name: string,
    limit: string,
  ) {
    await act(async () => {
      await result.current.control
        .register('nameText')
        .onChange({ target: { name: 'nameText', value: name }, type: 'change' });
      result.current.setLimitText(limit);
    });
  }

  async function mountAdd(setBudget: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
    useBudgetStore.setState({ setBudget });
    useBudgetState.getState().setSelectedMonth('2026-11');
    useBudgetState.getState().openAdd();
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: [health],
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());
    return { result, setBudget };
  }

  async function mountAddWithNoCategory() {
    const setBudget = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setBudget });
    useBudgetState.getState().setSelectedMonth('2026-11');
    useBudgetState.getState().openAddWithContext(undefined, BudgetGroup.Need);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: [health],
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());
    expect(result.current.state.selectedCategoryId).toBeUndefined();
    return { result, setBudget };
  }

  async function mountEditHealth(setBudget: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
    const editing = makeTestBudgetEditTarget({
      categoryId: 'cat_health',
      categoryName: 'Health',
      name: 'Yoga',
    });
    useBudgetStore.setState({ setBudget });
    useBudgetState.getState().setSelectedMonth('2026-11');
    useBudgetState.getState().openEdit(editing.id);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({
        owner: BUDGET_TAB_SHEET_OWNER,
        budgetableCategories: [health],
        editingRow: editing,
        shownGroupByCategoryId: {},
      }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());
    return { result, setBudget };
  }

  it('add mode is titled with the add title and the month line names the budget month', async () => {
    const { result } = await mountAdd();

    expect(result.current.state.title).toBe(Strings.budgetSetTitle);
    expect(result.current.state.monthLine).toBe(Strings.budgetMonthlyLimitLine('November 2026'));
  });

  it('edit mode is titled with the edit title and shows the edited category on the row', async () => {
    const { result } = await mountEditHealth();

    expect(result.current.state.title).toBe(Strings.budgetEditTitle);
    expect(result.current.state.rowCategory?.id).toBe('cat_health');
    expect(result.current.state.rowCategoryName).toBe('Health');
  });

  it('Save with no category, a blank name and no limit marks all three and writes nothing', async () => {
    const { result, setBudget } = await mountAddWithNoCategory();

    await act(async () => result.current.submit());

    expect(result.current.state.faults.category).toBeDefined();
    expect(result.current.state.faults.name).toBeDefined();
    expect(result.current.state.faults.limit).toBeDefined();
    expect(result.current.state.footerMessage).toBe(Strings.fixFieldsMarkedAbove(3));
    expect(setBudget).not.toHaveBeenCalled();
  });

  it('Save with a valid name and limit but no category marks one field and writes nothing', async () => {
    const { result, setBudget } = await mountAddWithNoCategory();
    await typeNameAndLimit(result, 'Gym', '500');

    await act(async () => result.current.submit());

    expect(result.current.state.faults).toMatchObject({ name: undefined, limit: undefined });
    expect(result.current.state.faults.category).toBeDefined();
    expect(result.current.state.footerMessage).toBe(Strings.fixFieldsMarkedAbove(1));
    expect(setBudget).not.toHaveBeenCalled();
  });

  it('a rejected write shows the save failure, keeps the sheet open, and a retry sends the same values', async () => {
    const setBudget = jest.fn().mockRejectedValueOnce(new Error('write failed'));
    const { result } = await mountAdd(setBudget);
    await typeNameAndLimit(result, 'Gym', '500');

    await act(async () => result.current.submit());

    expect(result.current.state.footerMessage).toBe(Strings.budgetSaveError);
    expect(result.current.state.nameTaken).toBe(false);
    expect(useBudgetState.getState().sheetVisible).toBe(true);
    expect(result.current.state.sheetVisible).toBe(true);

    setBudget.mockResolvedValueOnce(undefined);
    await act(async () => result.current.submit());

    expect(setBudget).toHaveBeenCalledTimes(2);
    expect(setBudget).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: 'cat_health', name: 'Gym', limit: 500 }),
    );
  });

  describe('a saved close shows its toast (MA-295)', () => {
    it('a saved add, once closed, shows the added toast once', async () => {
      const { result, setBudget } = await mountAdd();
      await typeNameAndLimit(result, 'Gym', '500');

      await act(async () => result.current.submit());
      expect(setBudget).toHaveBeenCalledTimes(1);
      expect(useBudgetState.getState().sheetVisible).toBe(false);
      await act(async () => result.current.handleCloseComplete());

      expect(mockToast.show).toHaveBeenCalledTimes(1);
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ label: Strings.budgetAddedToast }),
      );

      await act(async () => result.current.handleCloseComplete());
      expect(mockToast.show).toHaveBeenCalledTimes(1);
    });

    it('a saved edit, once closed, shows the updated toast', async () => {
      const { result, setBudget } = await mountEditHealth();

      await act(async () => result.current.submit());
      expect(setBudget).toHaveBeenCalledTimes(1);
      await act(async () => result.current.handleCloseComplete());

      expect(mockToast.show).toHaveBeenCalledTimes(1);
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ label: Strings.budgetUpdatedToast }),
      );
    });

    it('a close with no save shows nothing', async () => {
      const { result } = await mountAdd();

      await act(async () => result.current.onOpenChange(false));
      await act(async () => result.current.handleCloseComplete());

      expect(useBudgetState.getState().sheetVisible).toBe(false);
      expect(mockToast.show).not.toHaveBeenCalled();
    });

    it('a save refused for a taken name shows nothing', async () => {
      const { result } = await mountAdd(
        jest.fn().mockRejectedValue(new BudgetNameTakenError('Gym')),
      );
      await typeNameAndLimit(result, 'Gym', '500');

      await act(async () => result.current.submit());
      expect(result.current.state.nameTaken).toBe(true);
      await act(async () => result.current.handleCloseComplete());

      expect(mockToast.show).not.toHaveBeenCalled();
    });
  });
});
