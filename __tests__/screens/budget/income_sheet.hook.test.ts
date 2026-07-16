import { act, renderHook } from '@testing-library/react-native';

import { useIncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet.hook';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';

beforeEach(() => {
  useIncomeSheetState.getState().reset();
});

describe('useIncomeSheet', () => {
  it('saves income for the month captured when the sheet opened', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, 12000, '2026-07', 'July 2026');
    const { result } = renderHook(() => useIncomeSheet());

    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-07', 12000);
    expect(result.current.state.isOpen).toBe(false);
  });

  it('ignores a duplicate save while persistence is in flight', async () => {
    const resolveSaves: Array<() => void> = [];
    const setExpectedIncome = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSaves.push(resolve);
        }),
    );
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, 12000, '2026-07', 'July 2026');
    const { result } = renderHook(() => useIncomeSheet());

    let firstSave: Promise<void> | undefined;
    let duplicateSave: Promise<void> | undefined;
    act(() => {
      firstSave = result.current.save();
      duplicateSave = result.current.save();
    });

    expect(setExpectedIncome).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSaves.forEach((resolve) => resolve());
      await Promise.all([firstSave, duplicateSave]);
    });
  });

  it('shows an error and preserves the amount after persistence rejects', async () => {
    const setExpectedIncome = jest.fn().mockRejectedValue(new Error('write failed'));
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-06', 'June 2026');
    const { result } = renderHook(() => useIncomeSheet());

    act(() => result.current.setAmountText('12000'));
    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-06', 12000);
    expect(result.current.state.errorMessage).toBe(
      'Could not save expected income. Please try again.',
    );
    expect(result.current.state.amountText).toBe('12000');
    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.yearMonth).toBe('2026-06');
    expect(result.current.state.monthLabel).toBe('June 2026');
  });
});
