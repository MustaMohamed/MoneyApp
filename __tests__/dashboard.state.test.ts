import { useDashboardState } from '@/screens/dashboard/dashboard.state';

beforeEach(() => useDashboardState.getState().reset());

describe('useDashboardState', () => {
  it('starts with both flags false', () => {
    const s = useDashboardState.getState().state;
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.refreshing).toBe(false);
  });

  it('setBreakdownVisible toggles', () => {
    useDashboardState.getState().setBreakdownVisible(true);
    expect(useDashboardState.getState().state.isBreakdownVisible).toBe(true);
    useDashboardState.getState().setBreakdownVisible(false);
    expect(useDashboardState.getState().state.isBreakdownVisible).toBe(false);
  });

  it('setRefreshing toggles', () => {
    useDashboardState.getState().setRefreshing(true);
    expect(useDashboardState.getState().state.refreshing).toBe(true);
    useDashboardState.getState().setRefreshing(false);
    expect(useDashboardState.getState().state.refreshing).toBe(false);
  });

  it('reset clears both', () => {
    useDashboardState.setState({
      state: { isBreakdownVisible: true, refreshing: true },
    });
    useDashboardState.getState().reset();
    const s = useDashboardState.getState().state;
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.refreshing).toBe(false);
  });
});
