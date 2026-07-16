import { BudgetGroup } from '@/constants/enums';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';

beforeEach(() => useBudgetState.getState().reset());

describe('useBudgetState — lensTab', () => {
  it('initialises lensTab to categories', () => {
    expect(useBudgetState.getState().lensTab).toBe('categories');
  });

  it('setLensTab updates to fiftythirty', () => {
    useBudgetState.getState().setLensTab('fiftythirty');
    expect(useBudgetState.getState().lensTab).toBe('fiftythirty');
  });

  it('setLensTab updates back to categories', () => {
    useBudgetState.getState().setLensTab('fiftythirty');
    useBudgetState.getState().setLensTab('categories');
    expect(useBudgetState.getState().lensTab).toBe('categories');
  });

  it('reset clears lensTab to categories', () => {
    useBudgetState.getState().setLensTab('fiftythirty');
    useBudgetState.getState().reset();
    expect(useBudgetState.getState().lensTab).toBe('categories');
  });
});

describe('useBudgetState — 50/30/20 rule expansion', () => {
  it('starts with no expanded budget group', () => {
    expect(useBudgetState.getState().expandedBudgetGroup).toBeUndefined();
  });

  it('keeps one expanded budget group and collapses it when selected again', () => {
    useBudgetState.getState().setExpandedBudgetGroup(BudgetGroup.Need);
    expect(useBudgetState.getState().expandedBudgetGroup).toBe(BudgetGroup.Need);

    useBudgetState.getState().setExpandedBudgetGroup(BudgetGroup.Want);
    expect(useBudgetState.getState().expandedBudgetGroup).toBe(BudgetGroup.Want);

    useBudgetState.getState().setExpandedBudgetGroup(BudgetGroup.Want);
    expect(useBudgetState.getState().expandedBudgetGroup).toBeUndefined();
  });

  it('keeps rule expansion separate from category expansion', () => {
    useBudgetState.getState().setExpandedCategoryId('cat_food');
    useBudgetState.getState().setExpandedBudgetGroup(BudgetGroup.Savings);

    expect(useBudgetState.getState().expandedCategoryId).toBe('cat_food');
    expect(useBudgetState.getState().expandedBudgetGroup).toBe(BudgetGroup.Savings);
  });

  it('clears rule expansion when the selected month changes', () => {
    useBudgetState.getState().setExpandedBudgetGroup(BudgetGroup.Need);
    useBudgetState.getState().setSelectedMonth('2026-08');

    expect(useBudgetState.getState().expandedBudgetGroup).toBeUndefined();
  });

  it('clears rule expansion when state resets', () => {
    useBudgetState.getState().setExpandedBudgetGroup(BudgetGroup.Need);
    useBudgetState.getState().reset();

    expect(useBudgetState.getState().expandedBudgetGroup).toBeUndefined();
  });
});
