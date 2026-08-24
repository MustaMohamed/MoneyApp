import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
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

  // @layla's table 1 on this field. A comma-decimal keyboard sends the comma
  // its separator key draws, and the four keystroke deliveries below are what
  // the OS actually produces once the native buffer has been resynced --
  // step 3 carries '1.5', not '1,5', because step 2 corrected the buffer to
  // '1.'. This test asserted the opposite twice: that '5,000' saved as 5000
  // (the 1000x bug), and then that a comma was refused outright, which froze
  // these same four keystrokes at '1'.
  it('carries a typed comma to a decimal point and saves the magnitude typed', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    // Asserted after EVERY step, not only at the end: with only a final
    // assertion the sequence passes against an implementation that refuses the
    // comma outright, because step 3 delivers a whole resynced '1.5' and the
    // field catches up. Step 2's held text is the one that separates them.
    for (const [delivered, held] of [
      ['1', '1'],
      ['1,', '1.'],
      ['1.5', '1.5'],
      ['1.50', '1.50'],
    ] as const) {
      await act(() => result.current.setAmountText(delivered));
      // The draft store is read alongside the RHF value because a refusal must
      // not desync them, and before save() because a successful save resets it.
      expect(result.current.state.amountText).toBe(held);
      expect(useIncomeSheetState.getState().amountText).toBe(held);
    }

    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-07', 1.5);
  });

  // @layla's table 2 on this field, both rows: a second separator is refused
  // whichever glyph produced it, because the rewritten candidate carries two of
  // them and the single-'.' pattern refuses it. Not a comma check.
  it.each([['1.5,'], ['1.5.']])(
    'refuses %p, a second separator, and holds 1.5',
    async (delivered) => {
      useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
      const { result } = await renderHook(() => useIncomeSheet());

      await act(() => result.current.setAmountText('1.5'));
      await act(() => result.current.setAmountText(delivered));

      expect(result.current.state.amountText).toBe('1.5');
      expect(useIncomeSheetState.getState().amountText).toBe('1.5');
    },
  );

  // @layla's table 3 on this field, and the branch where a misclassification is
  // a silent 1000x: routed to the keystroke branch, '1,500' would normalise to
  // '1.500' and save as 1.5. Refused by shape instead -- the field stays empty
  // and the save is blocked. '1,234.56' is the accepted cost of that refusal
  // (@sarah Q10 ruling 2): DECIMAL_PATTERN alone would have parsed it.
  it.each([['1,500'], ['1,234.56'], ['1,5']])(
    'refuses the comma-bearing paste %p and blocks the save',
    async (delivered) => {
      const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
      useBudgetStore.setState({ setExpectedIncome });
      useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
      const { result } = await renderHook(() => useIncomeSheet());

      await act(() => result.current.setAmountText(delivered));

      expect(result.current.state.amountText).toBe('');
      expect(useIncomeSheetState.getState().amountText).toBe('');

      await act(async () => result.current.save());

      expect(setExpectedIncome).not.toHaveBeenCalled();
      expect(result.current.state.validationMessage).toBe(Strings.incomeSheetAmountRequired);
    },
  );

  // The same shape without a comma is not refused -- the refusal is decided by
  // the comma, not by the delta being multi-character.
  it('accepts an ungrouped paste', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('1234.56'));
    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-07', 1234.56);
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

  // `formatStoredMoneyText(null)` is '', so without a blank guard an untouched
  // empty field matches a suggestion that does not exist.
  it('does not flag an untouched empty field on a month with no suggestion', async () => {
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');

    const { result } = await renderHook(() => useIncomeSheet());

    expect(result.current.state.amountText).toBe('');
    expect(result.current.state.suggestion).toBeNull();
    expect(result.current.state.isPrefilledFromSuggestion).toBe(false);
  });

  // The second producer of '', and the one a `suggestion !== null` guard cannot
  // see. `getTrailingIncomeSuggestion` averages `transactions.egp_amount`, a
  // bare `REAL NOT NULL` (004:9), so a negative average reaches the formatter,
  // which declines to render it rather than freezing the field on '-5'. The
  // suggestion is then non-null and its text is '', which an untouched empty
  // field matches -- the note would claim a number the sheet is not showing.
  // Red against `state.suggestion !== null && amountText === formatStoredMoneyText(...)`.
  it('does not flag an empty field on a suggestion the formatter declines', async () => {
    useIncomeSheetState.getState().open(-5, null, '2026-07', 'July 2026');

    const { result } = await renderHook(() => useIncomeSheet());

    expect(result.current.state.amountText).toBe('');
    expect(result.current.state.suggestion).toBe(-5);
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
    // The floor message until MA-020, then `errAmountInvalid` while the field
    // carried no mask. With the mask back, the letters never reach the schema
    // at all -- the delta is comma-free and untypeable, so it is refused, the
    // field is empty at save, and `.min(1)` answers first.
    expect(result.current.state.validationMessage).toBe(Strings.incomeSheetAmountRequired);
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
