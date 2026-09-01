import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useIncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet.hook';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { MoneyTextMappingError, parseRequiredMoneyText } from '@/utils/money_text';

// Spread the real module and wrap only `parseRequiredMoneyText`; other tests drive the rest.
jest.mock('@/utils/money_text', () => {
  const actual = jest.requireActual('@/utils/money_text');
  return { ...actual, parseRequiredMoneyText: jest.fn(actual.parseRequiredMoneyText) };
});
const mockedParseRequiredMoneyText = parseRequiredMoneyText as jest.Mock;

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
  mockedParseRequiredMoneyText.mockClear();
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

  // A comma-decimal keyboard sends a comma; the OS resyncs the buffer, so step 3 delivers '1.5'.
  it('carries a typed comma to a decimal point and saves the magnitude typed', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    // Assert after every step; a final-only assertion also passes when the comma is refused.
    for (const [delivered, held] of [
      ['1', '1'],
      ['1,', '1.'],
      ['1.5', '1.5'],
      ['1.50', '1.50'],
    ] as const) {
      await act(() => result.current.setAmountText(delivered));
      // The draft store is checked too: a refusal must not desync it, and `save()` resets it.
      expect(result.current.state.amountText).toBe(held);
      expect(useIncomeSheetState.getState().amountText).toBe(held);
    }

    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-07', 1.5);
  });

  // A second separator is refused whichever glyph typed it; the candidate then holds two.
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

  // A comma-bearing paste is refused by shape; '1,500' taken as a keystroke would save 1.5.
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

  // The comma decides the refusal, not the delta being multi-character.
  it('accepts an ungrouped paste', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('1234.56'));
    await act(async () => result.current.save());

    expect(setExpectedIncome).toHaveBeenCalledWith('2026-07', 1234.56);
  });

  it('flags a prefill the exponent-form suggestion produced', async () => {
    useIncomeSheetState.getState().open(1e-7, null, '2026-07', 'July 2026');

    const { result } = await renderHook(() => useIncomeSheet());

    // `String(1e-7)` is '1e-7'; only `formatStoredMoneyText` writes the '0.0000001' here.
    expect(result.current.state.amountText).toBe('0.0000001');
    expect(result.current.state.isPrefilledFromSuggestion).toBe(true);
  });

  // `formatStoredMoneyText(null)` is '', so a blank field would match a missing suggestion.
  it('does not flag an untouched empty field on a month with no suggestion', async () => {
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');

    const { result } = await renderHook(() => useIncomeSheet());

    expect(result.current.state.amountText).toBe('');
    expect(result.current.state.suggestion).toBeNull();
    expect(result.current.state.isPrefilledFromSuggestion).toBe(false);
  });

  // A negative suggestion formats to '', so a non-null guard alone would flag an empty field.
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
    // The mask refuses the letters, so the field is empty at save and `.min(1)` answers first.
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

  // Schema and submit share the parser, so the desync is only reachable by mocking the throw.
  it('surfaces the save error and does not save on a schema/submit desync', async () => {
    const setExpectedIncome = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setExpectedIncome });
    mockedParseRequiredMoneyText.mockImplementationOnce(() => {
      throw new MoneyTextMappingError('amountText');
    });
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const { result } = await renderHook(() => useIncomeSheet());

    await act(() => result.current.setAmountText('12000'));
    await act(async () => result.current.save());

    expect(setExpectedIncome).not.toHaveBeenCalled();
    expect(result.current.state.errorMessage).toBe(Strings.incomeSheetSaveError);
  });
});
