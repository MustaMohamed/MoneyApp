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
