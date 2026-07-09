import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

beforeEach(() => useBudgetState.getState().reset());

describe('budget state spending plan sheet', () => {
  it('opens add and edit plan modes without touching category budget sheet mode', () => {
    useBudgetState.getState().openAddPlan();
    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: true,
        planSheetMode: 'add',
        targetPlanId: undefined,
      }),
    );

    useBudgetState.getState().openEditPlan('plan_trip');
    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: true,
        planSheetMode: 'edit',
        targetPlanId: 'plan_trip',
      }),
    );
  });

  it('closes and resets target plan id', () => {
    useBudgetState.getState().openEditPlan('plan_trip');
    useBudgetState.getState().closePlan();

    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: false,
        targetPlanId: undefined,
      }),
    );
  });
});
