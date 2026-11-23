import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook';
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state';
import { useSpendingPlanSheetStore } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.store';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { deferred } from '@/test_helpers/deferred';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

const mockResetForm = jest.fn();
let mockTotalText = '500';
let mockSubmitTotalText = '500';
// RHF's `handleSubmit(onValid, onInvalid)` runs exactly one of its two arguments.
let mockFormValid = true;
type MockFieldErrors = Partial<Record<'nameText' | 'totalText', { message?: string }>>;
let mockInvalidErrors: MockFieldErrors = {};
let mockSubmitRejection: Error | undefined;
const mockHandleSubmit =
  (
    submit: (values: { nameText: string; totalText: string }) => Promise<void>,
    onInvalid?: (errors: MockFieldErrors) => void,
  ) =>
  async () => {
    if (mockSubmitRejection) throw mockSubmitRejection;
    if (!mockFormValid) {
      onInvalid?.(mockInvalidErrors);
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
  mockInvalidErrors = {};
  mockSubmitRejection = undefined;
  useBudgetState.getState().reset();
  useSpendingPlanSheetState.getState().reset();
  useSpendingPlanSheetStore.getState().reset();
  useBudgetState.getState().setSelectedMonth('2026-07');
  useBudgetState.getState().openAddPlan('budget');
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
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories, onSaved }),
    );

    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    await act(async () => result.current.save());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(useBudgetState.getState().planSheetVisible).toBe(false);
  });

  // The draft resets both dates to '' on close, and `DateRow` prints its value unguarded.
  it('reads the first of the selected month for both dates once the sheet closes', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => useBudgetState.getState().closePlan());

    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.startDate).toBe('2026-07-01');
    expect(result.current.state.endDate).toBe('2026-07-01');
  });

  it('sets the end date from setEndDate and keeps the start', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    const { startDate } = useSpendingPlanSheetStore.getState();

    await act(() => result.current.setEndDate('2026-07-21'));

    expect(useSpendingPlanSheetStore.getState().endDate).toBe('2026-07-21');
    expect(useSpendingPlanSheetStore.getState().startDate).toBe(startDate);
  });

  it('opens only the plan detail sheet, with the plan values, when plan detail opens edit', async () => {
    const editingPlan = {
      id: 'plan-alex',
      name: 'Alex weekend',
      startDate: '2026-09-12',
      endDate: '2026-09-15',
      totalAmount: 5000,
      categoryChips: [
        { id: 'cat_transport', name: 'Transport', icon: 'car', color: '#000', spent: 0 },
      ],
      allocationRows: [],
    } as unknown as Parameters<typeof useSpendingPlanSheet>[0]['editingPlan'];
    const transport: Category = { ...category, id: 'cat_transport', name: 'Transport' };
    const twoCategories = [category, transport];
    useBudgetState.getState().closePlan();

    // Plan detail renders first, so a write from the closed budget sheet would land last.
    const detailSheet = await renderHook(() =>
      useSpendingPlanSheet({
        owner: 'planDetail',
        budgetableCategories: twoCategories,
        editingPlan,
      }),
    );
    const budgetSheet = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: twoCategories }),
    );

    await act(() => useBudgetState.getState().openEditPlan('planDetail', 'plan-alex'));

    await waitFor(() => expect(useSpendingPlanSheetStore.getState().startDate).toBe('2026-09-12'));
    expect(detailSheet.result.current.state.isOpen).toBe(true);
    expect(budgetSheet.result.current.state.isOpen).toBe(false);
    expect(useSpendingPlanSheetStore.getState()).toMatchObject({
      startDate: '2026-09-12',
      endDate: '2026-09-15',
      selectedCategoryIds: ['cat_transport'],
    });

    await act(() => detailSheet.result.current.openCategoryPicker());

    expect(detailSheet.result.current.state.categoryPickerOpen).toBe(true);
    expect(budgetSheet.result.current.state.categoryPickerOpen).toBe(false);
  });

  it('puts the name message in the footer when RHF refuses the name at Save', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    mockFormValid = false;
    mockInvalidErrors = { nameText: { message: Strings.budgetPlanNameRequired } };

    await act(async () => result.current.save());

    expect(result.current.state.footerLine).toBe(Strings.budgetPlanNameRequired);
  });

  it('puts the total message in the footer over the name one when RHF refuses both', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    mockFormValid = false;
    mockInvalidErrors = {
      nameText: { message: Strings.budgetPlanNameRequired },
      totalText: { message: Strings.budgetPlanAmountInvalid },
    };

    await act(async () => result.current.save());

    expect(result.current.state.footerLine).toBe(Strings.budgetPlanAmountInvalid);
  });

  it('shows no daily line until a total is typed, then reads it at the add-mode defaults', async () => {
    mockTotalText = '';
    const { result, rerender } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    expect(result.current.state.dailyLine).toBeUndefined();

    mockTotalText = '500';
    await rerender(undefined);

    expect(result.current.state.dailyLine).toBe(Strings.budgetPlanDailyLine(1, '500'));
  });

  it('turns a rejected Save into the save error and clears the busy state', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );
    mockSubmitRejection = new Error('unexpected');

    await act(async () => result.current.save());

    await waitFor(() =>
      expect(useSpendingPlanSheetState.getState().submitError).toBe(Strings.budgetPlanSaveError),
    );
    expect(useSpendingPlanSheetState.getState().saving).toBe(false);
  });

  it('saves once on a double tap and reads busy until the save settles', async () => {
    const pending = deferred();
    const setSpendingPlan = jest.fn(() => pending.promise);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => {
      result.current.save();
      result.current.save();
    });

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(result.current.state.saving).toBe(true);

    await act(async () => pending.resolve());

    expect(useSpendingPlanSheetState.getState().saving).toBe(false);
  });

  it('rejects a sub-cent allocation at submit and leaves the plan unsaved (Layla row 19)', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    // Read before `submit()`: a successful save closes the sheet and resets the draft store.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.005');

    await act(async () => result.current.save());

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
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '10'));
    // Read before `submit()`: a successful save closes the sheet and resets the draft store.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('10');
    await act(() => result.current.setAllocationText('cat_food', ''));
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('');

    await act(async () => result.current.save());

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

    useBudgetState.getState().openEditPlan('budget', 'plan-legacy');
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories, editingPlan }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.005'),
    );
    expect(useSpendingPlanSheetStore.getState().allocateByCategory).toBe(true);

    await act(async () => result.current.save());

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
    useBudgetState.getState().openEditPlan('budget', 'plan-huge');
    await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories, editingPlan }),
    );

    await waitFor(() => expect(mockResetForm).toHaveBeenCalled());
    const [prefill] = mockResetForm.mock.calls[0] as [{ nameText: string; totalText: string }];
    expect(prefill.totalText).toBe('1000000000000000000000');
  });

  it('hides the limits summary and reads nothing over while no plan total has been entered', async () => {
    mockTotalText = '5000';
    const { result, rerender } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '6000'));
    expect(result.current.state.allocationSummaryText).toBe(
      Strings.budgetPlanLimitsSummaryOver('6,000', '1,000'),
    );

    mockTotalText = '0';
    await rerender(undefined);

    // Read before any submit: a successful save closes the sheet and resets the draft store.
    expect(result.current.state.allocationSummaryText).toBeUndefined();
    expect(result.current.state.allocationIsOver).toBe(false);
    expect(result.current.state.footerLine).toBeUndefined();
    expect(result.current.state.overRingedCategoryId).toBeUndefined();
  });

  it('ignores an allocation on a category that is not selected', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_transport', '600'));

    // Read before any submit: a successful save closes the sheet and resets the draft store.
    expect(result.current.state.allocationIsOver).toBe(false);
  });

  it('keeps a half-typed decimal in the field, silent until a Save is blocked', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '1.5'));
    await act(() => result.current.setAllocationText('cat_food', '1.'));

    // Read before `submit()`: a successful save closes the sheet and resets the draft store.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1.');
    expect(result.current.state.allocationErrors.cat_food).toBeUndefined();

    await act(async () => result.current.save());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

  it('surfaces an incomplete row when RHF blocks the save before the valid callback', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '1.'));
    expect(result.current.state.allocationErrors.cat_food).toBeUndefined();

    mockFormValid = false;
    await act(async () => result.current.save());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

  // The four keystrokes a comma-decimal keyboard sends for "one and a half" end at '1.50'.
  it('carries a typed comma on an allocation row to a decimal point', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
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
      // Read before any submit: a successful save closes the sheet and resets the draft store.
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
        useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
      );
      await waitFor(() =>
        expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
      );

      await act(() => result.current.setAllocateByCategory(true));
      await act(() => result.current.setAllocationText('cat_food', '1.5'));
      await act(() => result.current.setAllocationText('cat_food', delivered));

      // Read before any submit: a successful save closes the sheet and resets the draft store.
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1.5');
    },
  );

  // A comma-bearing paste is ambiguous: '1,500' reads as 1.5 by keystroke and 1500 by pattern.
  it.each([['1,500'], ['1,234.56'], ['1,5']])(
    'refuses the comma-bearing paste %p, leaving the row on its last accepted text',
    async (delivered) => {
      const { result } = await renderHook(() =>
        useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
      );
      await waitFor(() =>
        expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
      );

      await act(() => result.current.setAllocateByCategory(true));
      await act(() => result.current.setAllocationText('cat_food', '1'));
      await act(() => result.current.setAllocationText('cat_food', delivered));

      // Read before any submit: a successful save closes the sheet and resets the draft store.
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1');
    },
  );

  it('never flashes a message while a decimal amount is being typed', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    // Read before any submit: a successful save closes the sheet and resets the draft store.
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
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    // Read before any submit: a successful save closes the sheet and resets the draft store.
    for (const text of ['.', '.5', '.50']) {
      await act(() => result.current.setAllocationText('cat_food', text));
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(text);
      expect(result.current.state.allocationErrors.cat_food).toBeUndefined();
    }

    await act(async () => result.current.save());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
  });

  it('counts a valid sibling while one row is mid-typing', async () => {
    mockTotalText = '100';
    const transport: Category = { ...category, id: 'cat_transport', name: 'Transport' };
    // Hoisted: `budgetableCategories` is in the seeding effect's deps, so a new array re-seeds.
    const twoCategories = [category, transport];
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: twoCategories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.toggleCategory(transport));
    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '1.'));
    await act(() => result.current.setAllocationText('cat_transport', '40'));

    // Read before any submit: a successful save closes the sheet and resets the draft store.
    expect(result.current.state.allocationSummaryText).toBe(
      Strings.budgetPlanLimitsSummary('40', '60'),
    );
    expect(result.current.state.allocationErrors.cat_food).toBeUndefined();
    expect(result.current.state.allocationErrors.cat_transport).toBeUndefined();
  });

  describe('MA-115 a plan row is exempt only while it is the row last typed', () => {
    type PlanHook = ReturnType<typeof useSpendingPlanSheet>;

    const transport: Category = { ...category, id: 'cat_transport', name: 'Transport' };
    const health: Category = { ...category, id: 'cat_health', name: 'Health' };
    // Hoisted: `budgetableCategories` is in the seeding effect's deps, so a new array re-seeds.
    const threeCategories = [category, transport, health];

    // Food and Transport selected, Food at '1.', and one Save the allocation pre-flight refuses.
    async function mountRefused(transportText = '') {
      const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
      useBudgetStore.setState({ setSpendingPlan });
      const { result } = await renderHook(() =>
        useSpendingPlanSheet({ owner: 'budget', budgetableCategories: threeCategories }),
      );
      await waitFor(() =>
        expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
      );
      await act(() => result.current.toggleCategory(transport));
      await act(() => result.current.setAllocateByCategory(true));
      await act(() => result.current.setAllocationText('cat_food', '1.'));
      await act(() => result.current.setAllocationText('cat_transport', transportText));
      await act(async () => result.current.save());
      expect(setSpendingPlan).not.toHaveBeenCalled();
      expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
      return { result, setSpendingPlan };
    }

    it('after a refused Save, typing 48.5 leaves the row silent at "48." and at "48.5"', async () => {
      const { result } = await mountRefused();

      await act(() => result.current.setAllocationText('cat_food', '48.'));
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('48.');
      expect(result.current.state.allocationErrors.cat_food).toBeUndefined();

      await act(() => result.current.setAllocationText('cat_food', '48.5'));
      expect(result.current.state.allocationErrors.cat_food).toBeUndefined();
    });

    it('after a refused Save a complete amount under the floor shows its fault as typed', async () => {
      const { result } = await mountRefused();

      await act(() => result.current.setAllocationText('cat_food', '0.005'));

      expect(result.current.state.allocationErrors.cat_food).toBe(
        Strings.budgetPlanAllocationBelowMin,
      );
    });

    it('a typed row left at "48." is flagged once a second row is typed', async () => {
      const { result } = await mountRefused();
      await act(() => result.current.setAllocationText('cat_food', '48.'));
      expect(result.current.state.allocationErrors.cat_food).toBeUndefined();

      await act(() => result.current.setAllocationText('cat_transport', '5'));

      expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
      expect(result.current.state.allocationErrors.cat_transport).toBeUndefined();
    });

    const otherEdits: Array<[string, (hook: PlanHook) => void]> = [
      ['clearSubmitError', (hook) => hook.clearSubmitError()],
      ['editTotal', (hook) => hook.editTotal()],
      ['toggleCategory on another category', (hook) => hook.toggleCategory(health)],
      [
        'setAllocateByCategory off and on',
        (hook) => {
          hook.setAllocateByCategory(false);
          hook.setAllocateByCategory(true);
        },
      ],
      ['setEndDate', (hook) => hook.setEndDate('2026-07-21')],
    ];

    it.each(otherEdits)(
      'a typed row left at "48." is flagged once %s runs',
      async (_name, edit) => {
        const { result } = await mountRefused();
        await act(() => result.current.setAllocationText('cat_food', '48.'));

        await act(() => edit(result.current));

        expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('48.');
        expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
      },
    );

    it.each(otherEdits)(
      'a Save the 0.005 row refused leaves no line above Save once %s runs',
      async (_name, edit) => {
        const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
        useBudgetStore.setState({ setSpendingPlan });
        const { result } = await renderHook(() =>
          useSpendingPlanSheet({ owner: 'budget', budgetableCategories: threeCategories }),
        );
        await waitFor(() =>
          expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
        );
        await act(() => result.current.setAllocateByCategory(true));
        await act(() => result.current.setAllocationText('cat_food', '0.005'));
        await act(async () => result.current.save());
        expect(setSpendingPlan).not.toHaveBeenCalled();
        expect(result.current.state.footerLine).toBe(Strings.budgetPlanAllocationInvalid);

        await act(() => edit(result.current));

        expect(result.current.state.footerLine).toBeUndefined();
      },
    );

    it('a second row left at "5." keeps its fault while the first is typed', async () => {
      const { result } = await mountRefused('5.');
      expect(result.current.state.allocationErrors.cat_transport).toBe(Strings.errAmountInvalid);

      await act(() => result.current.setAllocationText('cat_food', '48.'));

      expect(result.current.state.allocationErrors.cat_transport).toBe(Strings.errAmountInvalid);
    });

    it('the next refused Save flags a typed row left at "48."', async () => {
      const { result, setSpendingPlan } = await mountRefused();
      await act(() => result.current.setAllocationText('cat_food', '48.'));

      await act(async () => result.current.save());

      expect(setSpendingPlan).not.toHaveBeenCalled();
      expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
      expect(useSpendingPlanSheetState.getState().submitError).toBe(
        Strings.budgetPlanAllocationInvalid,
      );
    });

    it('a refused keystroke marks nothing: the row keeps the fault Save raised', async () => {
      const { result } = await mountRefused();

      await act(() => result.current.setAllocationText('cat_food', '1.x'));

      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('1.');
      expect(result.current.state.allocationErrors.cat_food).toBe(Strings.errAmountInvalid);
    });

    it.each(['0', '0.0'])('Save with the row at %p saves it as 0', async (text) => {
      const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
      useBudgetStore.setState({ setSpendingPlan });
      const { result } = await renderHook(() =>
        useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
      );
      await waitFor(() =>
        expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
      );
      await act(() => result.current.setAllocateByCategory(true));
      await act(() => result.current.setAllocationText('cat_food', text));

      await act(async () => result.current.save());

      expect(setSpendingPlan).toHaveBeenCalledTimes(1);
      const [input] = setSpendingPlan.mock.calls[0] as [
        { categories: Array<{ categoryId: string; allocatedAmount?: number }> },
      ];
      expect(input.categories.find((c) => c.categoryId === 'cat_food')?.allocatedAmount).toBe(0);
    });
  });

  // The orphan's text must be invalid for this to bite.
  it('does not let an allocation on an unselected category block the save', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '40'));
    await act(() => result.current.setAllocationText('cat_transport', '0.005'));

    await act(async () => result.current.save());

    // The call count lives on the spy, which no reset touches.
    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(useSpendingPlanSheetState.getState().submitError).toBeUndefined();
  });

  it('parses the plan total exactly once on a valid submit', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.save());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    const [input] = setSpendingPlan.mock.calls[0] as [{ totalAmount: number }];
    expect(input.totalAmount).toBe(500);
  });

  it('reports a schema/submit desync on the plan total as a save error and does not save', async () => {
    const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
    useBudgetStore.setState({ setSpendingPlan });
    mockSubmitTotalText = 'not-a-number';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.save());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(useSpendingPlanSheetState.getState().submitError).toBe(Strings.budgetPlanSaveError);
  });

  it('reports a repository failure at the sheet bottom and stops saving', async () => {
    const setSpendingPlan = jest.fn().mockRejectedValue(new Error('disk is on fire'));
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.save());

    expect(useSpendingPlanSheetState.getState().submitError).toBe(Strings.budgetPlanSaveError);
    expect(useSpendingPlanSheetState.getState().saving).toBe(false);
  });

  it('replaces a stale save error when the allocation pre-flight blocks the next Save', async () => {
    const setSpendingPlan = jest.fn().mockRejectedValue(new Error('disk is on fire'));
    useBudgetStore.setState({ setSpendingPlan });
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(async () => result.current.save());
    expect(useSpendingPlanSheetState.getState().submitError).toBe(Strings.budgetPlanSaveError);

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    await act(async () => result.current.save());

    expect(setSpendingPlan).toHaveBeenCalledTimes(1);
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );
  });

  it('clears the footer message on an accepted allocation keystroke', async () => {
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    await act(async () => result.current.save());
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
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '0.005'));
    await act(async () => result.current.save());
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

    useBudgetState.getState().openEditPlan('budget', 'plan-null');
    const twoCategories = [category, transport];
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: twoCategories, editingPlan }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('40'),
    );

    // Read before `submit()`: a successful save closes the sheet and resets the draft store.
    expect(useSpendingPlanSheetStore.getState().allocations.cat_transport ?? '').toBe('');

    await act(async () => result.current.save());

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

    useBudgetState.getState().openEditPlan('budget', 'plan-exponent');
    await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories, editingPlan }),
    );

    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe('0.0000001'),
    );
  });

  // Once a typed figure holds cents the summary prints to the cent, so no cent is rounded away.
  it.each([
    ['0.40', '0.40', '99.60'],
    ['45.40', '45.40', '54.60'],
  ])('renders the limits summary to the cent for %p', async (text, assigned, flexible) => {
    mockTotalText = '100';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', text));

    // Read before any submit: a successful save closes the sheet and resets the draft store.
    expect(result.current.state.allocationSummaryText).toBe(
      Strings.budgetPlanLimitsSummary(assigned, flexible),
    );
    expect(result.current.state.allocationIsOver).toBe(false);
  });

  it('renders the over figure as a magnitude once the limits exceed the total', async () => {
    mockTotalText = '100';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    await act(() => result.current.setAllocationText('cat_food', '100.40'));

    // Read before any submit: a successful save closes the sheet and resets the draft store.
    expect(result.current.state.allocationSummaryText).toBe(
      Strings.budgetPlanLimitsSummaryOver('100.40', '0.40'),
    );
    expect(result.current.state.footerLine).toBe(Strings.budgetPlanLimitsOver('0.40'));
    expect(result.current.state.allocationIsOver).toBe(true);
  });

  // '45.' fails the validator and contributes 0, so the buffer transiently overstates.
  it('recomputes the limits summary on every keystroke, mid-typing states included', async () => {
    mockTotalText = '100';
    const { result } = await renderHook(() =>
      useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
    );
    await waitFor(() =>
      expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
    );

    await act(() => result.current.setAllocateByCategory(true));
    // Read before any submit: a successful save closes the sheet and resets the draft store.
    for (const [text, assigned, flexible] of [
      ['4', '4', '96'],
      ['45', '45', '55'],
      ['45.', '0', '100'],
      ['45.4', '45.40', '54.60'],
      ['45.40', '45.40', '54.60'],
    ] as const) {
      await act(() => result.current.setAllocationText('cat_food', text));
      expect(result.current.state.allocationSummaryText).toBe(
        Strings.budgetPlanLimitsSummary(assigned, flexible),
      );
    }
  });

  describe('MA-315 limits summary, over line and ringed field', () => {
    const transport: Category = { ...category, id: 'cat_transport', name: 'Transport' };
    const health: Category = { ...category, id: 'cat_health', name: 'Health' };
    // Hoisted: `budgetableCategories` is in the seeding effect's deps, so a new array re-seeds.
    const threeCategories = [category, transport, health];

    // Food, Transport and Health selected, allocate on, total 5000.
    async function mountLimits() {
      mockTotalText = '5000';
      mockSubmitTotalText = '5000';
      const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
      useBudgetStore.setState({ setSpendingPlan });
      const hook = await renderHook(() =>
        useSpendingPlanSheet({ owner: 'budget', budgetableCategories: threeCategories }),
      );
      await waitFor(() =>
        expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
      );
      await act(() => hook.result.current.toggleCategory(transport));
      await act(() => hook.result.current.toggleCategory(health));
      await act(() => hook.result.current.setAllocateByCategory(true));
      return { ...hook, setSpendingPlan };
    }

    it('reads assigned and flexible in whole EGP while every figure is whole', async () => {
      const { result } = await mountLimits();

      await act(() => result.current.setAllocationText('cat_food', '2000'));
      await act(() => result.current.setAllocationText('cat_transport', '1000'));

      expect(result.current.state.allocationSummaryText).toBe(
        Strings.budgetPlanLimitsSummary('3,000', '2,000'),
      );
      expect(result.current.state.allocationIsOver).toBe(false);
      expect(result.current.state.footerLine).toBeUndefined();
    });

    it('reads assigned and flexible to the cent once a limit holds cents', async () => {
      const { result } = await mountLimits();

      await act(() => result.current.setAllocationText('cat_food', '2000.40'));

      expect(result.current.state.allocationSummaryText).toBe(
        Strings.budgetPlanLimitsSummary('2,000.40', '2,999.60'),
      );
    });

    it('rings the limit row typed last while the limits exceed the total', async () => {
      const { result } = await mountLimits();

      await act(() => result.current.setAllocationText('cat_food', '2000'));
      await act(() => result.current.setAllocationText('cat_transport', '3500'));

      expect(result.current.state.allocationSummaryText).toBe(
        Strings.budgetPlanLimitsSummaryOver('5,500', '500'),
      );
      expect(result.current.state.footerLine).toBe(Strings.budgetPlanLimitsOver('500'));
      expect(result.current.state.allocationIsOver).toBe(true);
      expect(result.current.state.overRingedCategoryId).toBe('cat_transport');
      expect(result.current.state.totalCarriesOverRing).toBe(false);
    });

    it('rings the total, not a row, when the total is lowered past the limits', async () => {
      const { result, rerender } = await mountLimits();
      await act(() => result.current.setAllocationText('cat_food', '2000'));
      await act(() => result.current.setAllocationText('cat_transport', '3000'));
      expect(result.current.state.allocationIsOver).toBe(false);

      await act(() => result.current.editTotal());
      mockTotalText = '4500';
      await rerender(undefined);

      expect(result.current.state.allocationIsOver).toBe(true);
      expect(result.current.state.totalCarriesOverRing).toBe(true);
      expect(result.current.state.overRingedCategoryId).toBeUndefined();
      expect(result.current.state.footerLine).toBe(Strings.budgetPlanLimitsOver('500'));
    });

    it('rings nothing once the row typed last leaves with its category, still over', async () => {
      const { result } = await mountLimits();
      await act(() => result.current.setAllocationText('cat_health', '3000'));
      await act(() => result.current.setAllocationText('cat_food', '2500'));
      await act(() => result.current.setAllocationText('cat_transport', '500'));
      expect(result.current.state.overRingedCategoryId).toBe('cat_transport');

      await act(() => result.current.toggleCategory(transport));

      expect(result.current.state.allocationIsOver).toBe(true);
      expect(result.current.state.overRingedCategoryId).toBeUndefined();
      expect(result.current.state.totalCarriesOverRing).toBe(false);
      expect(result.current.state.allocationSummaryText).toBe(
        Strings.budgetPlanLimitsSummaryOver('5,500', '500'),
      );
      expect(result.current.state.footerLine).toBe(Strings.budgetPlanLimitsOver('500'));
    });

    it('refuses a Save while over without setting a submit error', async () => {
      const { result, setSpendingPlan } = await mountLimits();
      await act(() => result.current.setAllocationText('cat_food', '2000'));
      await act(() => result.current.setAllocationText('cat_transport', '3500'));

      await act(async () => result.current.save());

      expect(setSpendingPlan).not.toHaveBeenCalled();
      expect(useSpendingPlanSheetState.getState().submitError).toBeUndefined();
      expect(result.current.state.footerLine).toBe(Strings.budgetPlanLimitsOver('500'));
    });

    const nextEdits: Array<[string, (hook: ReturnType<typeof useSpendingPlanSheet>) => void]> = [
      ['setAllocationText', (hook) => hook.setAllocationText('cat_food', '5')],
      ['toggleCategory', (hook) => hook.toggleCategory(health)],
    ];

    it.each(nextEdits)(
      'shows the 0.005 row refusal above Save until %s runs',
      async (_name, edit) => {
        const { result, setSpendingPlan } = await mountLimits();
        await act(() => result.current.setAllocationText('cat_food', '0.005'));
        await act(async () => result.current.save());
        expect(setSpendingPlan).not.toHaveBeenCalled();
        expect(result.current.state.footerLine).toBe(Strings.budgetPlanAllocationInvalid);

        await act(() => edit(result.current));

        expect(result.current.state.footerLine).toBeUndefined();
      },
    );

    it('keeps the ringed limit row when the name clears the submit error', async () => {
      const { result } = await mountLimits();
      await act(() => result.current.setAllocationText('cat_food', '2000'));
      await act(() => result.current.setAllocationText('cat_transport', '3500'));
      expect(result.current.state.overRingedCategoryId).toBe('cat_transport');

      await act(() => result.current.clearSubmitError());

      expect(result.current.state.overRingedCategoryId).toBe('cat_transport');
      expect(result.current.state.totalCarriesOverRing).toBe(false);
    });

    it('saves with no limits once the switch is turned off while over', async () => {
      const { result, setSpendingPlan } = await mountLimits();
      await act(() => result.current.setAllocationText('cat_food', '2000'));
      await act(() => result.current.setAllocationText('cat_transport', '3500'));
      expect(result.current.state.footerLine).toBe(Strings.budgetPlanLimitsOver('500'));

      await act(() => result.current.setAllocateByCategory(false));
      expect(result.current.state.allocationIsOver).toBe(false);
      expect(result.current.state.footerLine).toBeUndefined();

      await act(async () => result.current.save());

      expect(setSpendingPlan).toHaveBeenCalledTimes(1);
      const [input] = setSpendingPlan.mock.calls[0] as [
        { categories: Array<{ categoryId: string; allocatedAmount?: number }> },
      ];
      expect(input.categories.length).toBeGreaterThan(0);
      for (const entry of input.categories) expect(entry.allocatedAmount).toBeUndefined();
    });
  });
});
