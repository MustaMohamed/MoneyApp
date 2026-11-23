import { useSpendingPlanDetailState } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.state';

beforeEach(() => {
  useSpendingPlanDetailState.getState().reset();
});

const entryOf = (owner: string) => useSpendingPlanDetailState.getState().entries[owner];

describe('useSpendingPlanDetailState', () => {
  it('two owners loading two plans hold separate entries', () => {
    useSpendingPlanDetailState.getState().beginLoad('owner-a', 'plan-1', false);
    useSpendingPlanDetailState.getState().beginLoad('owner-b', 'plan-2', false);

    useSpendingPlanDetailState.getState().failLoad('owner-b', 'plan-2', false);
    useSpendingPlanDetailState.getState().resolve('owner-a', 'plan-1');

    expect(entryOf('owner-a')).toEqual({
      activeId: 'plan-1',
      status: 'ready',
      refreshError: false,
    });
    expect(entryOf('owner-b')).toEqual({
      activeId: 'plan-2',
      status: 'firstLoadError',
      refreshError: false,
    });
  });

  it('a resolve for a plan the entry no longer holds writes nothing', () => {
    useSpendingPlanDetailState.getState().beginLoad('owner-a', 'plan-1', false);
    useSpendingPlanDetailState.getState().beginLoad('owner-a', 'plan-2', false);
    const before = entryOf('owner-a');

    useSpendingPlanDetailState.getState().resolve('owner-a', 'plan-1');

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-a').status).toBe('loading');
  });

  it('a resolve after release creates no entry', () => {
    useSpendingPlanDetailState.getState().beginLoad('owner-a', 'plan-1', false);
    useSpendingPlanDetailState.getState().release('owner-a');

    useSpendingPlanDetailState.getState().resolve('owner-a', 'plan-1');

    expect(useSpendingPlanDetailState.getState().entries).toEqual({});
  });

  it('a failLoad preserving data sets the refresh error and keeps ready', () => {
    useSpendingPlanDetailState.getState().beginLoad('owner-a', 'plan-1', false);
    useSpendingPlanDetailState.getState().resolve('owner-a', 'plan-1');
    useSpendingPlanDetailState.getState().beginLoad('owner-a', 'plan-1', true);

    useSpendingPlanDetailState.getState().failLoad('owner-a', 'plan-1', true);

    expect(entryOf('owner-a').status).toBe('ready');
    expect(entryOf('owner-a').refreshError).toBe(true);
  });

  it('a failLoad without preserved data sets firstLoadError', () => {
    useSpendingPlanDetailState.getState().beginLoad('owner-a', 'plan-1', false);

    useSpendingPlanDetailState.getState().failLoad('owner-a', 'plan-1', false);

    expect(entryOf('owner-a').status).toBe('firstLoadError');
    expect(entryOf('owner-a').refreshError).toBe(false);
  });
});
