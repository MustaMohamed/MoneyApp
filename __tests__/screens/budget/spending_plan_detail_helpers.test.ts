import {
  resolveSpendingPlanDetailViewState,
  spendingPlanDetailShowsBody,
  type SpendingPlanDetailViewState,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.helpers';

describe('resolveSpendingPlanDetailViewState', () => {
  it('reads loading for a status another load owns when no plan is held', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: false,
        status: 'ready',
        refreshError: false,
      }),
    ).toBe('loading');
  });

  it('keeps a held plan ready while the status belongs to another load', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: false,
        status: 'firstLoadError',
        refreshError: true,
      }),
    ).toBe('ready');
  });

  it('reads loading on an owned load with no plan, and ready with one', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: true,
        status: 'loading',
        refreshError: false,
      }),
    ).toBe('loading');
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'loading',
        refreshError: false,
      }),
    ).toBe('ready');
  });

  it('reads firstLoadError with no plan and refreshErrorWithData with one', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: true,
        status: 'firstLoadError',
        refreshError: false,
      }),
    ).toBe('firstLoadError');
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'firstLoadError',
        refreshError: false,
      }),
    ).toBe('refreshErrorWithData');
  });

  it('reads notFound for a settled load with no plan', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: true,
        status: 'ready',
        refreshError: false,
      }),
    ).toBe('notFound');
  });

  it('reads refreshErrorWithData for a held plan whose refresh failed', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'ready',
        refreshError: true,
      }),
    ).toBe('refreshErrorWithData');
  });

  it('reads ready for a held plan with no refresh error', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'ready',
        refreshError: false,
      }),
    ).toBe('ready');
  });
});

describe('spendingPlanDetailShowsBody', () => {
  it('shows the body for ready and refreshErrorWithData only', () => {
    const states: SpendingPlanDetailViewState[] = [
      'loading',
      'notFound',
      'firstLoadError',
      'refreshErrorWithData',
      'ready',
    ];

    expect(states.filter(spendingPlanDetailShowsBody)).toEqual(['refreshErrorWithData', 'ready']);
  });
});
