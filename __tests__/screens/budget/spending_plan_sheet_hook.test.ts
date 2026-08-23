import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook';
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state';
import { useSpendingPlanSheetStore } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.store';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';

const mockResetForm = jest.fn();
// `watch('totalText')` is settable per test: the total is what decides whether
// the running-total line renders at all, so it cannot stay hard-coded.
let mockTotalText = '500';
const mockHandleSubmit =
  (submit: (values: { nameText: string; totalText: string }) => Promise<void>) => () =>
    submit({ nameText: 'Trip', totalText: '500' });

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
  // spendingPlanInputSchema's own floor refine. Switched to parseDecimalText
  // so the raw value survives to the schema.
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
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(0.005);

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
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
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(10);
    await act(() => result.current.setAllocationText('cat_food', ''));
    expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBeUndefined();

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
  // save rather than silently persisting again. The stored 0.005 loads
  // into the allocation input verbatim (SpendingPlanAllocations renders
  // String(value)) and is never touched by the user in this scenario.
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
      expect(useSpendingPlanSheetStore.getState().allocations.cat_food).toBe(0.005),
    );
    expect(useSpendingPlanSheetStore.getState().allocateByCategory).toBe(true);

    await act(async () => result.current.submit());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(useSpendingPlanSheetState.getState().submitError).toBe(
      Strings.budgetPlanAllocationInvalid,
    );
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
});
