import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

beforeEach(() => useBudgetState.getState().reset());

describe('budget state spending plan sheet', () => {
  it('opens add and edit plan modes without touching category budget sheet mode', () => {
    useBudgetState.getState().openAddPlan('budget');
    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: true,
        planSheetMode: 'add',
        targetPlanId: undefined,
      }),
    );

    useBudgetState.getState().openEditPlan('budget', 'plan_trip');
    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: true,
        planSheetMode: 'edit',
        targetPlanId: 'plan_trip',
      }),
    );
  });

  it('carries the owner that opened add and edit', () => {
    useBudgetState.getState().openAddPlan('budget');
    expect(useBudgetState.getState().planSheetOwner).toBe('budget');

    useBudgetState.getState().openEditPlan('planDetail', 'plan_trip');
    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetOwner: 'planDetail',
        planSheetMode: 'edit',
        targetPlanId: 'plan_trip',
      }),
    );
  });

  it('closes and resets target plan id and owner', () => {
    useBudgetState.getState().openEditPlan('planDetail', 'plan_trip');
    expect(useBudgetState.getState().planSheetOwner).toBe('planDetail');
    useBudgetState.getState().closePlan();

    expect(useBudgetState.getState()).toEqual(
      expect.objectContaining({
        planSheetVisible: false,
        targetPlanId: undefined,
      }),
    );
    expect(useBudgetState.getState().planSheetOwner).toBeUndefined();
  });
});
