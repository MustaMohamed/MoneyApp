import { act, renderHook } from '@testing-library/react-native';

import { useSetBudgetSheetSave } from '@/modules/budget/screens/budget/components/set_budget_sheet.hook';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';

beforeEach(() => useSetBudgetSheetState.getState().reset());

describe('useSetBudgetSheetSave', () => {
  it('reports rejection and preserves sheet selection for retry', async () => {
    useSetBudgetSheetState.getState().initAddMode('cat_food');
    const { result } = renderHook(() => useSetBudgetSheetSave());

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
    const { result } = renderHook(() => useSetBudgetSheetSave());

    let firstSave!: Promise<boolean>;
    act(() => {
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
