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

  // `DECIMAL_PATTERN` reads a comma as a thousands separator, so '5,000' parses
  // to 5000 here and MA-020 leaves that alone: the field is `number-pad`, whose
  // soft keyboard emits no comma, and the app-wide question of what a comma
  // means at a money field belongs to `parse_decimal.ts` and its own ticket.
  it('normalizes a formatted income amount before saving', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('5,000'));
    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-07', 5000);
  });

  // The suggestion note is the only thing on the sheet that says "this number
  // is ours, not yours", and it renders off a string comparison. Nothing renders
  // this component in the suite -- budget_screen.test.tsx mocks IncomeSheet as
  // `() => null` -- so the flag is pinned at the hook, where it now lives.
  it('flags a prefill the exponent-form suggestion produced', async () => {
    useIncomeSheetState.getState().open(1e-7, null, '2026-07', 'July 2026');

    const { result } = await renderHook(() => useIncomeSheet());

    // `String(1e-7)` is '1e-7'; the prefill writes '0.0000001'. Comparing
    // against anything but `formatStoredMoneyText` drops the note here.
    expect(result.current.state.amountText).toBe('0.0000001');
    expect(result.current.state.isPrefilledFromSuggestion).toBe(true);
  });

  // `formatStoredMoneyText(null)` is '', so without the `suggestion !== null`
  // guard an untouched empty field matches a suggestion that does not exist.
  it('does not flag an untouched empty field on a month with no suggestion', async () => {
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');

    const { result } = await renderHook(() => useIncomeSheet());

    expect(result.current.state.amountText).toBe('');
    expect(result.current.state.suggestion).toBeNull();
    expect(result.current.state.isPrefilledFromSuggestion).toBe(false);
  });

  it('shows validation feedback and does not save malformed income', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('12000abc'));
    await act(async () => result.current.save());

    expect(setExpectedIncome).not.toHaveBeenCalled();
    expect(result.current.state.validationMessage).toBe('Amount must be at least 0.01');
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
