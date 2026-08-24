import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook';
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state';
import { useSpendingPlanSheetStore } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.store';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

const mockResetForm = jest.fn();
// `watch('totalText')` is settable per test: the total is what decides whether
// the running-total line renders at all, so it cannot stay hard-coded.
let mockTotalText = '500';
// RHF's `handleSubmit(onValid, onInvalid)` runs exactly one of its two
// arguments, and this flag is which. `false` is the Save RHF itself blocks --
// an empty name, a plan total that does not parse -- where `onValid` never
// runs at all. Without an onInvalid leg in the mock, every test here would be
// a valid-form test and the leg under it could not be reached.
let mockFormValid = true;
const mockHandleSubmit =
  (
    submit: (values: { nameText: string; totalText: string }) => Promise<void>,
    onInvalid?: () => void,
  ) =>
  async () => {
    if (!mockFormValid) {
      onInvalid?.();
      return;
    }
    await submit({ nameText: 'Trip', totalText: '500' });
  };

jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
}));
jest.mock('@/utils/use_zod_form.hook', () => ({
  useZodForm: () => ({
    control: {},
    handleSubmit: mockHandleSubmit,
    reset: mockResetForm,
    watch: () => mockTotalText,
  }),
}));

const category: Category = {
  id: 'cat_food',
  name: 'Food',
  type: CategoryType.Expense,
  icon: 'food',
  color: '#D4A44C',
  is_default: 0,
  sort_order: 0,
  budget_group: null,
  created_at: '',
  updated_at: '',
};
const categories = [category];

beforeEach(() => {
  mockTotalText = '500';
  mockFormValid = true;
  useBudgetState.getState().reset();
  useSpendingPlanSheetState.getState().reset();
  useSpendingPlanSheetStore.getState().reset();
  useBudgetState.getState().setSelectedMonth('2026-07');
  useBudgetState.getState().openAddPlan();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useSpendingPlanSheet', () => {
  it('notifies the owning detail screen after a successful save', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const onSaved = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories, onSaved }),
    );

    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    await act(async () => result.current.submit());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(useBudgetState.getState().planSheetVisible).toBe(false);
  });

  // datetimepicker 9 split the old single `onChange` into onValueChange + onDismiss.
  // Closing the picker used to be unconditional — it ran outside the
  // `event.type === 'set'` check — so both halves have to close it now. A dismiss
  // path that forgot would leave datePickerTarget set, which keeps the picker
  // mounted with no way back out.
  it('closes the date picker on dismiss without changing either date', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    const { startDate, endDate } = useSpendingPlanSheetStore.getState();

    await act(() => result.current.openDatePicker('end'));
    expect(useSpendingPlanSheetState.getState().datePickerTarget).toBe('end');

    await act(() => result.current.dismissDatePicker());

    expect(useSpendingPlanSheetState.getState().datePickerTarget).toBeUndefined();
    expect(useSpendingPlanSheetStore.getState()).toMatchObject({ startDate, endDate });
  });

  it('applies a selected date to the targeted field and closes the picker', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    const { startDate } = useSpendingPlanSheetStore.getState();

    await act(() => result.current.openDatePicker('end'));
    await act(() =>
      result.current.selectDate(
        'end',
        { nativeEvent: { timestamp: 0, utcOffset: 0 } },
        new Date(2026, 6, 21, 12),
      ),
    );

    expect(useSpendingPlanSheetStore.getState().endDate).toBe('2026-07-21');
    expect(useSpendingPlanSheetStore.getState().startDate).toBe(startDate);
    expect(useSpendingPlanSheetState.getState().datePickerTarget).toBeUndefined();
  });

  // MA-018 c8 follow-up: parseOptionalAmount used to route allocation text
  // through parseNonNegativeDecimal, which silently collapsed a sub-floor
  // value like '0.005' to undefined (unallocated) before it ever reached
  // spendingPlanInputSchema's own floor refine. MA-020 holds the raw text and
  // gates the submit on it, so the message lands on the row rather than at
  // the bottom of the sheet (scenario row 9, spec §5.7 / §6.1).
  it('rejects a sub-cent allocation at submit and leaves the plan unsaved (Layla row 19)', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    // Draft-store state is read BEFORE submit(): a successful save calls
    // closePlan(), which flips planSheetVisible, re-runs the hook's effect and
    // resets the draft store, so a read afterwards can report {} for state
    // that was genuinely there.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.005');

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(
      Strings.budgetPlanAllocationBelowMin,
    );
    // The row message is the specific one; the sheet-level one is what the user
    // sees when the row is scrolled out from under a fixed Save button. Red
    // against a pre-flight that returns without writing it.
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );
  });

  // Blank must still mean unallocated, not zero — the one way this fix could
  // do harm. parseOptionalAmount's blank guard runs before parseDecimalText,
  // so this path is untouched by the parser swap; asserted directly anyway.
  it('clears an allocation back to unallocated on blank text and saves it as such', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '10'));
    // Draft-store state is read BEFORE submit(), for the reason given above.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('10');
    await act(() => result.current.setAllocationText('cat_food', ''));
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('');

    await act(async () => result.current.submit());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    const [input] = setSpendingPlan.mock.calls[0] as [
      { categories: Array<{ categoryId: string; allocatedAmount?: number }> },
    ];
    expect(
      input.categories.find((c) => c.categoryId === 'cat_food')?.allocatedAmount,
    ).toBeUndefined();
    expect(useSpendingPlanSheetState.getState().submitError).toBeUndefined();
  });

  // Confirms the behaviour change @sarah is flagging in the PR body: a
  // pre-MA-018 plan whose allocated_amount was saved sub-cent (the old
  // parseLimit-era path let this through) now shows the field error on
  // save rather than silently persisting again. The stored 0.005 prefills
  // verbatim through formatStoredMoneyText -- never rounded to '0.01',
  // which would pass the floor and save a value nobody entered (@layla Q7).
  it('a legacy plan with a stored sub-cent allocation rejects at save, untouched', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const editingPlan = {
      id: 'plan-legacy',
      name: 'Legacy Plan',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      totalAmount: 500,
      categoryChips: [{ id: 'cat_food', name: 'Food', icon: 'food', color: '#000', spent: 0 }],
      allocationRows: [
        {
          categoryId: 'cat_food',
          categoryName: 'Food',
          icon: 'food',
          color: '#000',
          allocatedAmount: 0.005,
          spent: 0,
          left: 0,
          pct: 0,
          isOver: false,
        },
      ],
    } as unknown as Parameters<typeof useSpendingPlanSheet>[0]['editingPlan'];

    useBudgetState.getState().openEditPlan('plan-legacy');
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories, editingPlan }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.005'),
    );
    expect(useSpendingPlanSheetStore.getState().allocateByCategory).toBe(true);

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(
      Strings.budgetPlanAllocationBelowMin,
    );
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );
  });

  // The prefill hazard row 25 states, on the plan total rather than on an
  // allocation row: `String(1e21)` is '1e+21', which `DECIMAL_PATTERN` rejects,
  // so the sheet would open on a total it will not let the user save back. 1e21
  // is reachable by typing 22 digits into a field whose parser has no upper
  // bound. The literal is asserted rather than a predicate's verdict on it,
  // because a second assertion over the same string would be implied by this
  // line and could not fail on its own.
  it('prefills an edit-mode plan total as plain digits, never exponent notation', async () => {
    useBudgetStore.setState({ setSpendingPlan: jest.fn().mockResolvedValue(undefined) });
    const editingPlan = {
      id: 'plan-huge',
      name: 'Huge Plan',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      totalAmount: 1e21,
      categoryChips: [],
      allocationRows: [],
    } as unknown as Parameters<typeof useSpendingPlanSheet>[0]['editingPlan'];

    mockResetForm.mockClear();
    useBudgetState.getState().openEditPlan('plan-huge');
    await renderHook(() => useSpendingPlanSheet({ budgetableCategories: categories, editingPlan }));

    await waitFor(() => expect(mockResetForm).toHaveBeenCalled());
    const [prefill] = mockResetForm.mock.calls[0] as [{ nameText: string; totalText: string }];
    expect(prefill.totalText).toBe('1000000000000000000000');
  });

  // A total of '0' is not a total. Coercing it to 0 made the helper line shout
  // "over" on any allocation while Save reported the total itself as invalid --
  // two messages for one unentered field. Both halves belong in one assertion:
  // `allocationIsOver` is already false when nothing is allocated.
  it('hides the allocation helper line while no plan total has been entered', async () => {
    mockTotalText = '0';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '100'));

    // Read before any submit: a successful save closes the sheet, and the
    // hook's visibility effect resets the draft store, so every value derived
    // from it reads as if nothing was ever typed.
    expect(result.current.state.allocationHelperText).toBeUndefined();
    expect(result.current.state.allocationIsOver).toBe(false);
  });

  // Layla row 21: `cat_transport` is never selected by the fixture, so the 600
  // on it is an orphan. Fed the whole allocations record, the helper counted it
  // against the 500 total and the sheet warned about an allocation the user
  // cannot see. Written through `setAllocationText`, not the store, so the same
  // call survives the store turning to text.
  it('ignores an allocation on a category that is not selected', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_transport', '600'));

    // Read before any submit, for the reason given above.
    expect(result.current.state.allocationIsOver).toBe(false);
  });

  // Row 6 + D17 in one test, and it has to stay one test. On `main` an
  // allocation row renders no message at all and '1.' clears the field
  // outright, so "typing '1.' shows no error" is already true at base for an
  // unrelated reason -- a silence-only assertion is green in both states and
  // gates nothing. The store-retention half is what is false on `main`, and
  // the post-submit half is what proves the silence is a decision rather than
  // an absence.
  it('keeps a half-typed decimal in the field, silent until a Save is blocked', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '1.5'));
    await act(() => result.current.setAllocationText('cat_food', '1.'));

    // Draft-store state is read BEFORE submit(): a successful save calls
    // closePlan(), which resets the draft store, so a read afterwards can
    // report {} for state that was genuinely there.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1.');
    expect(result.current.state.allocationErrors.cat_food).toBeUndefined();

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

  // The other leg of the same rule (spec §5.6), and the one the test above
  // cannot reach: here RHF blocks the Save itself, so the submit never enters
  // the valid callback where the flag used to be set alone. The row is
  // incomplete either way and the user pressed Save either way, so it must
  // speak either way -- that is what "the same semantics RHF's `isSubmitted`
  // carries" means. Red against `handleSubmit(onValid)` with no second
  // argument: the error stays `undefined` and the half-typed row is mute
  // beside a sheet that is already reporting a failure.
  it('surfaces an incomplete row when RHF blocks the save before the valid callback', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '1.'));
    expect(result.current.state.allocationErrors.cat_food).toBeUndefined();

    mockFormValid = false;
    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

  // Row 10, rewritten for the mechanism that replaced the refusal. @layla's
  // table 1 on the allocation row: the four keystrokes a comma-decimal keyboard
  // sends for "one and a half" end at '1.50' and parse to 1.5. Before MA-020
  // the comma reached parseDecimalText and stored 1500 -- a 1000x error with
  // nothing on screen to show for it; under the reverted mask the same four
  // keystrokes froze the field at '1'.
  //
  // `previous` is read back from the store by the hook, not passed in, so this
  // chain is also the pin on that read: a hook that diffed against '' every
  // time would classify step 2 as a paste and refuse it.
  it('carries a typed comma on an allocation row to a decimal point', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    // Asserted after EVERY step. With only a final assertion the sequence
    // passes against an implementation that refuses the comma outright: step 3
    // delivers a whole resynced '1.5' and the row catches up. Step 2's held
    // text is the one that separates them.
    for (const [delivered, expected] of [
      ['1', '1'],
      ['1,', '1.'],
      ['1.5', '1.5'],
      ['1.50', '1.50'],
    ] as const) {
      await act(() => result.current.setAllocationText('cat_food', delivered));
      // Read before any submit, for the reason given above.
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(expected);
    }

    // The parse is over the held text rather than a literal, so it is the row's
    // own value that has to come out at 1.5 -- not 150, and not 1500.
    expect(parseNonNegativeDecimal(useSpendingPlanSheetStore.getState().allocations.cat_food)).toBe(
      1.5,
    );
  });

  // @layla's table 2 on this row, both glyphs. Neither passes by inspecting the
  // character typed: the rewritten candidate carries two separators and the
  // single-'.' pattern refuses it, which is what keeps the mechanism safe on a
  // keyboard exposing both keys at once.
  it.each([['1.5,'], ['1.5.']])(
    'refuses %p on an allocation row, a second separator',
    async (delivered) => {
      const { result } = await renderHook(() =>
        useSpendingPlanSheet({ budgetableCategories: categories }),
      );
      await waitFor(() =>
        expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
      );

      await act(() => result.current.setAllocateByCategory(true));
      await act(() => result.current.setAllocationText('cat_food', '1.5'));
      await act(() => result.current.setAllocationText('cat_food', delivered));

      // Read before any submit, for the reason given above.
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1.5');
    },
  );

  // @layla's table 3 on this row -- the silent-1000x branch. '1,500' arriving
  // as one delta is refused by shape before anything interprets it: read as a
  // keystroke it would normalise to '1.500' and store 1.5, and read by
  // DECIMAL_PATTERN it is 1500. Both are guesses, so neither is made.
  // '1,234.56' is refused too, which is @sarah Q10 ruling 2's accepted cost.
  it.each([['1,500'], ['1,234.56'], ['1,5']])(
    'refuses the comma-bearing paste %p, leaving the row on its last accepted text',
    async (delivered) => {
      const { result } = await renderHook(() =>
        useSpendingPlanSheet({ budgetableCategories: categories }),
      );
      await waitFor(() =>
        expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
      );

      await act(() => result.current.setAllocateByCategory(true));
      await act(() => result.current.setAllocationText('cat_food', '1'));
      await act(() => result.current.setAllocationText('cat_food', delivered));

      // Read before any submit, for the reason given above. Never '1500',
      // never '1.5' -- the row holds what it held.
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1');
    },
  );

  // '0.40' passes through '0.' on the way in. Rendering every failure on the
  // keystroke would flash a message once per amount the user enters, so the
  // intermediate states stay silent -- and the store assertions are what stop
  // this from asserting `main`'s unrelated silence.
  it('never flashes a message while a decimal amount is being typed', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    // Read before any submit, for the reason given above.
    for (const [text, expected] of [
      ['0', '0'],
      ['0.', '0.'],
      ['0.4', '0.4'],
      ['0.40', '0.40'],
    ] as const) {
      await act(() => result.current.setAllocationText('cat_food', text));
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(expected);
      expect(result.current.state.allocationErrors.cat_food).toBeUndefined();
    }
  });

  // D12, reopened by the keyboard change that made it reachable. Under
  // `decimal-pad` a leading point is a plausible first keystroke and the mask
  // accepts it, so '.5' is a state the user types INTO on the way to '0.5' --
  // not the malformed input the format branch is for. Classified as a hard
  // format failure it put the row red with 'Numbers only.' after two keystrokes
  // and blocked Save on digits and a decimal point.
  //
  // The post-submit half is what makes the silence a decision rather than an
  // absence, and it is also the whole of what did not change: '.5' still blocks
  // the Save, it just stops shouting mid-word. Red against
  // PARTIAL_DECIMAL_PATTERN as `/^\d*\.$/`: the row goes red at '.5'.
  it('stays silent while an amount is typed leading-point first', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    // Read before any submit, for the reason given above. The store half is
    // what stops this asserting the mask's refusal instead of the validator's
    // silence -- a mask that dropped the leading point would leave the field
    // empty and quiet too.
    for (const text of ['.', '.5', '.50']) {
      await act(() => result.current.setAllocationText('cat_food', text));
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(text);
      expect(result.current.state.allocationErrors.cat_food).toBeUndefined();
    }

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

  // Row 7, and the only two-row helper pin in the chunk. With a single row an
  // unparseable allocation contributing 0 is indistinguishable from a dropped
  // row or a hidden line; the sibling's 40 is what separates them. It is also
  // the only pin that catches an amounts array mapping '1.' to Number.NaN --
  // toCents(NaN) is NaN and the whole line would render 'NaN of 100.00'.
  it('counts a valid sibling while one row is mid-typing', async () => {
    mockTotalText = '100';
    const transport: Category = { ...category, id: 'cat_transport', name: 'Transport' };
    // Hoisted: the hook's seeding effect lists `budgetableCategories` in its
    // dependency array, so a fresh array literal per render re-seeds the store
    // forever.
    const twoCategories = [category, transport];
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: twoCategories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.toggleCategory(transport));
    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '1.'));
    await act(() => result.current.setAllocationText('cat_transport', '40'));

    // Read before any submit, for the reason given above.
    expect(result.current.state.allocationHelperText).toBe(
      '40.00 of 100.00 allocated · 60.00 buffer',
    );
    expect(result.current.state.allocationErrors.cat_food).toBeUndefined();
    expect(result.current.state.allocationErrors.cat_transport).toBeUndefined();
  });

  // Row 27, and it is a trap pin rather than a gate: green on `main` and green
  // here, because the submit already builds `categories` from
  // selectedCategoryIds. It goes red against a pre-flight that iterates
  // Object.keys(allocations) instead -- which would reach the orphan's
  // '0.005', fail the floor and block Save with an error attached to no row on
  // screen. The orphan's text must be INVALID for that to fire; an orphan
  // holding '600' passes the wrong implementation too.
  it('does not let an allocation on an unselected category block the save', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '40'));
    await act(() => result.current.setAllocationText('cat_transport', '0.005'));

    await act(async () => result.current.submit());

    // The call count lives on the spy, which no reset touches; submitError
    // corroborates it.
    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(useSpendingPlanSheetState.getState().submitError).toBeUndefined();
  });

  // Row 15. `grep -rn budgetPlanSaveError __tests__/` returned nothing before
  // this: the catch branch had no net, and this step rewrites submit
  // substantially. Explicitly a regression pin, not a gate.
  it('reports a repository failure at the sheet bottom and stops saving', async () => {
    const setSpendingPlan = jest.fn().mockRejectedValue(new Error('disk is on fire'));
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.submit());

    expect(useSpendingPlanSheetState.getState().submitError).toBe(Strings.budgetPlanSaveError);
    expect(useSpendingPlanSheetState.getState().saving).toBe(false);
  });

  // The stale half of the same finding, and the leg the two pre-flight tests
  // above cannot reach: they start from a clean sheet, where "no message" and
  // "the wrong message" are the same assertion. Here the sheet is already
  // reporting a repository failure when a row is made invalid, so the second
  // Save has something to replace. Red against a pre-flight that returns
  // without writing submitError: 'Could not save plan. Try again.' stays on
  // screen, describing a save that is no longer what is being blocked.
  it('replaces a stale save error when the allocation pre-flight blocks the next Save', async () => {
    const setSpendingPlan = jest.fn().mockRejectedValue(new Error('disk is on fire'));
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.submit());
    expect(useSpendingPlanSheetState.getState().submitError).toBe(Strings.budgetPlanSaveError);

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    await act(async () => result.current.submit());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );
  });

  // The footer message is a verdict on text that has since changed. It now
  // rides above Save in the fixed footer rather than at the bottom of the
  // scroll body, so a stale one is permanently in view claiming a block the
  // user has already cleared. Red against a `setAllocationText` that only
  // masks and writes.
  it('clears the footer message on an accepted allocation keystroke', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    await act(async () => result.current.submit());
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );

    await act(() => result.current.setAllocationText('cat_food', '0.05'));

    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.05');
    expect(useSpendingPlanSheetState.getState().submitError).toBeUndefined();
  });

  // The ordering half, and the reason the clear sits below the mask guard
  // rather than at the top of the handler. A second decimal point is refused,
  // so the field still holds the text the message is complaining about --
  // wiping the message there would leave the user with a Save that refuses and
  // nothing on screen saying why. Red the moment the clear is hoisted above
  // `if (masked === undefined) return;`.
  it('leaves the footer message standing when the allocation keystroke is refused', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    await act(async () => result.current.submit());
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );

    await act(() => result.current.setAllocationText('cat_food', '0.0.05'));

    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.005');
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );
  });

  // Row 3 / @layla Q7. A NULL allocation has no allocationRows entry, so the
  // row prefills '' and saves back as undefined -- NULL in, NULL out, never a
  // '0' the user never chose. Correct on `main` through the :530 filter;
  // load-bearing once the store holds text, where a '0' prefill would convert
  // "not decided" into "deliberate zero" on the next save.
  it('round-trips a NULL allocation as blank text and saves it back as unallocated', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const transport: Category = { ...category, id: 'cat_transport', name: 'Transport' };
    const editingPlan = {
      id: 'plan-null',
      name: 'Null Plan',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      totalAmount: 500,
      categoryChips: [
        { id: 'cat_food', name: 'Food', icon: 'food', color: '#000', spent: 0 },
        { id: 'cat_transport', name: 'Transport', icon: 'car', color: '#000', spent: 0 },
      ],
      allocationRows: [
        {
          categoryId: 'cat_food',
          categoryName: 'Food',
          icon: 'food',
          color: '#000',
          allocatedAmount: 40,
          spent: 0,
          left: 40,
          pct: 0,
          isOver: false,
        },
      ],
    } as unknown as Parameters<typeof useSpendingPlanSheet>[0]['editingPlan'];

    useBudgetState.getState().openEditPlan('plan-null');
    const twoCategories = [category, transport];
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: twoCategories, editingPlan }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('40'),
    );

    // Read before submit(), for the reason given above.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_transport ?? '').toBe('');

    await act(async () => result.current.submit());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    const [input] = setSpendingPlan.mock.calls[0] as [
      { categories: Array<{ categoryId: string; allocatedAmount?: number }> },
    ];
    expect(
      input.categories.find((c) => c.categoryId === 'cat_transport')?.allocatedAmount,
    ).toBeUndefined();
    expect(input.categories.find((c) => c.categoryId === 'cat_food')?.allocatedAmount).toBe(40);
  });

  // Row 13. String(1e-7) is '1e-7', which DECIMAL_PATTERN rejects outright --
  // it would read as a malformed paste rather than a value below the floor.
  it('prefills an exponent-notation allocation as plain decimal text', async () => {
    const editingPlan = {
      id: 'plan-exponent',
      name: 'Exponent Plan',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      totalAmount: 500,
      categoryChips: [{ id: 'cat_food', name: 'Food', icon: 'food', color: '#000', spent: 0 }],
      allocationRows: [
        {
          categoryId: 'cat_food',
          categoryName: 'Food',
          icon: 'food',
          color: '#000',
          allocatedAmount: 1e-7,
          spent: 0,
          left: 0,
          pct: 0,
          isOver: false,
        },
      ],
    } as unknown as Parameters<typeof useSpendingPlanSheet>[0]['editingPlan'];

    useBudgetState.getState().openEditPlan('plan-exponent');
    await renderHook(() => useSpendingPlanSheet({ budgetableCategories: categories, editingPlan }));

    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.0000001'),
    );
  });

  // Rows 8 / C-1. formatAmount's default is 0dp, so the line rendered '0 of
  // 100 allocated' for a 0.40 allocation -- cents typed and then hidden by the
  // very line that confirms them. 45.40 is the case an escalate-on-zero fix
  // would miss: it renders '45', wrong and never literally zero.
  it.each([
    ['0.40', '0.40 of 100.00 allocated · 99.60 buffer'],
    ['45.40', '45.40 of 100.00 allocated · 54.60 buffer'],
  ])('renders the running total at 2dp for %p', async (text, expected) => {
    mockTotalText = '100';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', text));

    // Read before any submit, for the reason given above.
    expect(result.current.state.allocationHelperText).toBe(expected);
    expect(result.current.state.allocationIsOver).toBe(false);
  });

  // Row 8. The Math.max(0, buffer) clamp rendered '0 buffer' for a plan that
  // is 0.40 over -- a flat zero where the user needs to see how far over.
  it('renders a signed negative buffer once the allocations exceed the total', async () => {
    mockTotalText = '100';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '100.40'));

    // Read before any submit, for the reason given above.
    expect(result.current.state.allocationHelperText).toBe(
      '100.40 of 100.00 allocated · -0.40 buffer',
    );
    expect(result.current.state.allocationIsOver).toBe(true);
  });

  // Rows 8b, converted from the emulator walk by @sarah's ruling. The third
  // assertion is the point and is deliberately not the pretty one: '45.' fails
  // the validator, contributes 0 (@layla Q8 / D14) and the buffer transiently
  // overstates. This is also the only pin that fails against an implementation
  // recomputing the line on blur or on a debounce rather than per keystroke.
  it('recomputes the running total on every keystroke, mid-typing states included', async () => {
    mockTotalText = '100';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    // Read before any submit, for the reason given above.
    for (const [text, expected] of [
      ['4', '4.00 of 100.00 allocated · 96.00 buffer'],
      ['45', '45.00 of 100.00 allocated · 55.00 buffer'],
      ['45.', '0.00 of 100.00 allocated · 100.00 buffer'],
      ['45.4', '45.40 of 100.00 allocated · 54.60 buffer'],
      ['45.40', '45.40 of 100.00 allocated · 54.60 buffer'],
    ] as const) {
      await act(() => result.current.setAllocationText('cat_food', text));
      expect(result.current.state.allocationHelperText).toBe(expected);
    }
  });
});
