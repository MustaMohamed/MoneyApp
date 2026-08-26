import { act, renderHook, waitFor } from '@testing-library/react-native';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { BudgetEditTargetVM } from '@/modules/budget/screens/budget/budget.hook';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  useSetBudgetSheet,
  useSetBudgetSheetSave,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.hook';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { MoneyTextMappingError, parseRequiredMoneyText } from '@/utils/money_text';

// `useSetBudgetSheet` (unlike `useSetBudgetSheetSave` above) calls
// `useBottomSheetAwareHandlers`, which needs a mounted bottom-sheet context
// this headless `renderHook` does not provide -- same mock the `.tsx` render
// suite for this sheet uses.
jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
}));

// A blanket `jest.mock` would break `formatStoredMoneyText`, which this
// hook's own prefill (`resetForm`'s `limitText`, tested elsewhere) and this
// file's new desync case both depend on staying real. Spread the actual
// module and wrap only the parse under test (moneyapp-testing mock boundary).
jest.mock('@/utils/money_text', () => {
  const actual = jest.requireActual('@/utils/money_text');
  return { ...actual, parseRequiredMoneyText: jest.fn(actual.parseRequiredMoneyText) };
});
const mockedParseRequiredMoneyText = parseRequiredMoneyText as jest.Mock;

const categories: Category[] = [
  {
    id: 'housing',
    name: 'Housing',
    type: CategoryType.Expense,
    icon: 'home',
    color: '#6fa8dc',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
];

const existingBudget: BudgetEditTargetVM = {
  id: 'budget-trip-food',
  categoryId: 'housing',
  categoryName: 'Housing',
  categoryGroup: BudgetGroup.Need,
  name: 'Alexandria Trip Food',
  planned: 1500,
  spent: 0,
  left: 1500,
  usedPct: 0,
  categorySharePct: 1,
  usedLabel: '0%',
  shareLabel: '100% of category',
  spentPlannedLabel: '0 / 1,500 spent',
  balanceAmountLabel: '1,500',
  balanceMetaLabel: 'EGP left',
  ringColor: '#4CAF82',
  accessibilityLabel: 'Alexandria Trip Food',
  menuAccessibilityLabel: 'Actions for Alexandria Trip Food',
  limit: 1500,
  icon: 'home',
  color: '#6fa8dc',
};

beforeEach(() => {
  useSetBudgetSheetState.getState().reset();
  useBudgetState.getState().reset();
  mockedParseRequiredMoneyText.mockClear();
});

describe('useSetBudgetSheetSave', () => {
  it('reports rejection and preserves sheet selection for retry', async () => {
    useSetBudgetSheetState.getState().initAddMode('cat_food');
    const { result } = await renderHook(() => useSetBudgetSheetSave());

    let saved = true;
    await act(async () => {
      saved = await result.current.runSave(jest.fn().mockRejectedValue(new Error('write failed')));
    });

    expect(saved).toBe(false);
    expect(useSetBudgetSheetState.getState()).toMatchObject({
      selectedCategoryId: 'cat_food',
      saving: false,
      errorMessage: 'Could not save budget. Please try again.',
    });
  });

  it('prevents duplicate save operations while a save is running', async () => {
    let resolveSave: () => void = () => {};
    const pendingSave = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const operation = jest.fn(() => pendingSave);
    const { result } = await renderHook(() => useSetBudgetSheetSave());

    let firstSave!: Promise<boolean>;
    await act(() => {
      firstSave = result.current.runSave(operation);
    });
    await act(async () => {
      expect(await result.current.runSave(operation)).toBe(false);
    });
    expect(operation).toHaveBeenCalledTimes(1);

    await act(async () => resolveSave());
    await expect(firstSave).resolves.toBe(true);
  });
});

// W2E c2, §4/§8.7. `budgetFormSchema`'s refine and `submit` share
// `parsePositiveDecimal`, so there is no `setValue` on this hook's public
// surface to drive an invalid-but-schema-accepted submit directly -- the
// edit-mode prefill (`resetForm` off `editingRow.limit`, already schema-valid
// text) is what lets these two cases run through the real `useZodForm`
// without rendering the `.tsx` sheet.
describe('useSetBudgetSheet', () => {
  it('parses the limit exactly once on a valid edit-mode submit', async () => {
    const setBudget = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setBudget });
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit(existingBudget.id);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({ budgetableCategories: categories, editingRow: existingBudget }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());

    await act(async () => result.current.submit());

    expect(setBudget).toHaveBeenCalledTimes(1);
    const [input] = setBudget.mock.calls[0] as [{ limit: number }];
    expect(input.limit).toBe(1500);
  });

  // Reds if `parsePositiveDecimal(values.limitText) ?? Number.NaN` is
  // restored: the mocked helper would never be called, `setBudget` would run
  // with NaN, and both assertions below would fail.
  it('surfaces the save error and does not save on a schema/submit desync', async () => {
    const setBudget = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setBudget });
    mockedParseRequiredMoneyText.mockImplementationOnce(() => {
      throw new MoneyTextMappingError('limitText');
    });
    useBudgetState.getState().setSelectedMonth('2026-08');
    useBudgetState.getState().openEdit(existingBudget.id);
    const { result } = await renderHook(() =>
      useSetBudgetSheet({ budgetableCategories: categories, editingRow: existingBudget }),
    );
    await waitFor(() => expect(useSetBudgetSheetState.getState().sessionKey).toBeDefined());

    await act(async () => result.current.submit());

    expect(setBudget).not.toHaveBeenCalled();
    expect(useSetBudgetSheetState.getState().errorMessage).toBe(Strings.budgetSaveError);
  });
});
