import { act, renderHook } from '@testing-library/react-native';

import { useIncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet.hook';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';

function deferred() {
  let resolve: (() => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve: () => resolve?.(),
    reject: (reason?: unknown) => reject?.(reason),
  };
}

beforeEach(() => {
  useIncomeSheetState.getState().reset();
});

describe('useIncomeSheet', () => {
  it('saves income for the month captured when the sheet opened', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, 12000, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-07', 12000);
    expect(result.current.state.isOpen).toBe(false);
  });

  // This test asserted the opposite until MA-020: that a typed '5,000'
  // normalised to 5000 on save. That normalisation is the 1000x bug -- on an
  // ar-EG or de-DE keyboard the comma is a DECIMAL separator, so the user who
  // typed one-and-a-half thousand got fifteen hundred. D9 refuses the comma at
  // the keystroke instead, on all four MA-020 money fields. Accepted
  // regression (row 11): the character does not appear, which is loud and
  // visible, where the old behaviour was silently wrong.
  //
  // The draft is read before save() because a successful save resets it -- this
  // one is blocked, but the ordering is the rule, not the exception.
  it('refuses a comma keystroke, leaving the field empty and the save blocked', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('5,000'));

    expect(result.current.state.amountText).toBe('');
    expect(useIncomeSheetState.getState().amountText).toBe('');

    await act(async () => result.current.save());

    expect(setExpectedIncome).not.toHaveBeenCalled();
    expect(result.current.state.validationMessage).toBe('Enter your monthly income');
  });

  it('shows validation feedback and does not save malformed income', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('12000abc'));
    await act(async () => result.current.save());

    expect(setExpectedIncome).not.toHaveBeenCalled();
    // The floor message until MA-020, when '12000abc' still reached the schema.
    // The mask refuses those letters at the keystroke, so the field is empty at
    // save and `.min(1)` answers first.
    expect(result.current.state.validationMessage).toBe('Enter your monthly income');
    expect(result.current.state.isOpen).toBe(true);
  });

  it('blocks close, reopen, and a new save until a successful save clears loading and closes', async () => {
    const pendingSave = deferred();
    const setExpectedIncome = jest.fn(() => pendingSave.promise);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, 12000, '2026-06', 'June 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    let savePromise: Promise<void> | undefined;
    await act(async () => {
      savePromise = result.current.save();
      await Promise.resolve();
      result.current.close();
      useIncomeSheetState.getState().open(null, 9000, '2026-07', 'July 2026');
      void result.current.save();
      await Promise.resolve();
    });

    expect(setExpectedIncome).toHaveBeenCalledTimes(1);
    expect(useIncomeSheetState.getState()).toMatchObject({
      isOpen: true,
      saving: true,
      amountText: '12000',
      yearMonth: '2026-06',
    });

    await act(async () => {
      pendingSave.resolve();
      await savePromise;
    });

    expect(useIncomeSheetState.getState().saving).toBe(false);
    expect(useIncomeSheetState.getState().isOpen).toBe(false);
  });

  it('blocks stale transitions and preserves the original draft when a deferred save rejects', async () => {
    const pendingSave = deferred();
    const setExpectedIncome = jest.fn(() => pendingSave.promise);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-06', 'June 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('12000'));
    let savePromise: Promise<void> | undefined;
    await act(async () => {
      savePromise = result.current.save();
      await Promise.resolve();
      result.current.close();
      useIncomeSheetState.getState().open(null, 9000, '2026-07', 'July 2026');
      void result.current.save();
      await Promise.resolve();
    });

    expect(setExpectedIncome).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingSave.reject(new Error('write failed'));
      await savePromise;
    });

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-06', 12000);
    expect(result.current.state.errorMessage).toBe(
      'Could not save expected income. Please try again.',
    );
    expect(result.current.state.amountText).toBe('12000');
    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.yearMonth).toBe('2026-06');
    expect(result.current.state.monthLabel).toBe('June 2026');
  });
});
