import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  useSetBudgetSheet,
  useSetBudgetSheetSave,
} from '@/modules/budget/screens/budget/components/set_budget_sheet.hook';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { makeTestBudgetEditTarget, makeTestBudgetableCategory } from '@/test_helpers/budget';
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

const categories = [makeTestBudgetableCategory()];

const existingBudget = makeTestBudgetEditTarget();

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
      useSetBudgetSheet({ budgetableCategories: categories, editingRow: existingBudget }),
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

    expect(limitError(result)).toBe(Strings.budgetAmountInvalid);
  });

  it('a refused keystroke leaves the save error standing', async () => {
    const { result } = await mountRejected();

    await typeLimit(result, '1500x');

    expect(useSetBudgetSheetState.getState().errorMessage).toBe(Strings.budgetSaveError);
    expect(limitError(result)).toBeUndefined();
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
    ['0', Strings.budgetAmountInvalid],
    ['0.0', Strings.budgetAmountInvalid],
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
