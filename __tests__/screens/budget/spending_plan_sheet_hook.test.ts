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
let mockTotalText = '500';
let mockSubmitTotalText = '500';
// RHF's `handleSubmit(onValid, onInvalid)` runs exactly one of its two arguments.
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
    await submit({ nameText: 'Trip', totalText: mockSubmitTotalText });
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
  mockSubmitTotalText = '500';
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

  // Both datetimepicker 9 callbacks must clear `datePickerTarget`, or the picker stays mounted.
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
    // Read before `submit()`: a successful save closes the sheet and resets the draft store.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.005');

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(
      Strings.budgetPlanAllocationBelowMin,
    );
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );
  });

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
    // Read before `submit()`, for the reason given above.
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

  // A stored sub-cent allocation prefills verbatim, never rounded up to '0.01'.
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

  // `String(1e21)` is '1e+21', which `DECIMAL_PATTERN` rejects, so the total cannot be saved back.
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

    // Read before any submit: a successful save closes the sheet and resets the draft store.
    expect(result.current.state.allocationHelperText).toBeUndefined();
    expect(result.current.state.allocationIsOver).toBe(false);
  });

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

    // Read before `submit()`, for the reason given above.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1.');
    expect(result.current.state.allocationErrors.cat_food).toBeUndefined();

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

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

  // The four keystrokes a comma-decimal keyboard sends for "one and a half" end at '1.50'.
  it('carries a typed comma on an allocation row to a decimal point', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
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

    expect(parseNonNegativeDecimal(useSpendingPlanSheetStore.getState().allocations.cat_food)).toBe(
      1.5,
    );
  });

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

  // A comma-bearing paste is ambiguous: '1,500' reads as 1.5 by keystroke and 1500 by pattern.
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

      // Read before any submit, for the reason given above.
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1');
    },
  );

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

  // Under `decimal-pad` a leading point is a state the user types into on the way to '0.5'.
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
    // Read before any submit, for the reason given above.
    for (const text of ['.', '.5', '.50']) {
      await act(() => result.current.setAllocationText('cat_food', text));
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(text);
      expect(result.current.state.allocationErrors.cat_food).toBeUndefined();
    }

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

  it('counts a valid sibling while one row is mid-typing', async () => {
    mockTotalText = '100';
    const transport: Category = { ...category, id: 'cat_transport', name: 'Transport' };
    // Hoisted: `budgetableCategories` is in the seeding effect's deps, so a new array re-seeds.
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

  // The orphan's text must be invalid for this to bite.
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

    // The call count lives on the spy, which no reset touches.
    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(useSpendingPlanSheetState.getState().submitError).toBeUndefined();
  });

  it('parses the plan total exactly once on a valid submit', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.submit());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    const [input] = setSpendingPlan.mock.calls[0] as [{ totalAmount: number }];
    expect(input.totalAmount).toBe(500);
  });

  it('reports a schema/submit desync on the plan total as a save error and does not save', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    mockSubmitTotalText = 'not-a-number';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(useSpendingPlanSheetState.getState().submitError).toBe(Strings.budgetPlanSaveError);
  });

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

  // The clear sits below the mask guard: a refused keystroke leaves the offending text in place.
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

  // NULL in, NULL out: a blank allocation must not prefill '0' and become a deliberate zero.
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

    // Read before `submit()`, for the reason given above.
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

  // `String(1e-7)` is '1e-7', which `DECIMAL_PATTERN` rejects as a malformed paste.
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

  // `formatAmount` defaults to 0dp, which would hide the cents this line exists to confirm.
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

  // '45.' fails the validator and contributes 0, so the buffer transiently overstates.
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
