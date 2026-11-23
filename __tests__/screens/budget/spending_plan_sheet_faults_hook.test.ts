import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import { useSpendingPlanSheet } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook';
import { useSpendingPlanSheetState } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state';
import { useSpendingPlanSheetStore } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.store';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { PLAN_TOTAL_REFUSES_ZERO } from '@/utils/schemas/budget.schema';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

// `useBottomSheetAwareHandlers` needs a mounted sheet context `renderHook` does not provide.
jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
}));

type PlanHook = ReturnType<typeof useSpendingPlanSheet>;

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
  useBudgetState.getState().reset();
  useSpendingPlanSheetState.getState().reset();
  useSpendingPlanSheetStore.getState().reset();
  useBudgetState.getState().setSelectedMonth('2026-07');
  useBudgetState.getState().openAddPlan('budget');
});

async function mount() {
  const setSpendingPlan = jest.fn().mockResolvedValue(undefined);
  useBudgetStore.setState({ setSpendingPlan });
  const hook = await renderHook(() =>
    useSpendingPlanSheet({ owner: 'budget', budgetableCategories: categories }),
  );
  await waitFor(() =>
    expect(useSpendingPlanSheetStore.getState().selectedCategoryIds).toEqual(['cat_food']),
  );
  return { ...hook, setSpendingPlan };
}

// `shouldValidate` stands in for `Controller`'s re-validation of a field once the form is submitted.
function typeName(hook: PlanHook, text: string) {
  hook.setValue('nameText', text, { shouldValidate: true });
}

// The hero's path: the hold first, then `field.onChange` for a text the hold lets through.
function typeTotal(hook: PlanHook, text: string) {
  const form = { setValue: hook.setValue, clearErrors: hook.clearErrors };
  if (holdStillTypingDecimal(form, 'totalText', text, PLAN_TOTAL_REFUSES_ZERO)) return;
  hook.setValue('totalText', text, { shouldValidate: true });
}

describe('useSpendingPlanSheet field faults through the real form', () => {
  it('marks a blank name at Save, and typing a name clears the fault and the count', async () => {
    const { result, setSpendingPlan } = await mount();
    await act(() => typeTotal(result.current, '500'));

    await act(async () => result.current.save());

    expect(setSpendingPlan).not.toHaveBeenCalled();
    expect(result.current.state.nameFault).toBe(Strings.budgetPlanNameRequired);
    expect(result.current.state.footerLine).toBe(Strings.fixFieldsMarkedAbove(1));

    await act(() => typeName(result.current, 'Trip'));

    await waitFor(() => expect(result.current.state.nameFault).toBeUndefined());
    expect(result.current.state.footerLine).toBeUndefined();
  });

  it('after a refused Save, a total typed as 48. shows no fault', async () => {
    const { result } = await mount();
    await act(() => typeName(result.current, 'Trip'));

    await act(async () => result.current.save());
    expect(result.current.state.totalFault).toBe(Strings.budgetPlanAmountRequired);

    await act(() => typeTotal(result.current, '48.'));

    expect(result.current.state.totalFault).toBeUndefined();
    expect(result.current.state.footerLine).toBeUndefined();
  });

  it('after a refused Save, a total typed as 0.001 reads the floor fault before the next Save', async () => {
    const { result } = await mount();
    await act(() => typeName(result.current, 'Trip'));

    await act(async () => result.current.save());

    await act(() => typeTotal(result.current, '0.001'));

    await waitFor(() =>
      expect(result.current.state.totalFault).toBe(Strings.budgetPlanAmountInvalid),
    );
    expect(result.current.state.footerLine).toBe(Strings.fixFieldsMarkedAbove(1));
  });
});
