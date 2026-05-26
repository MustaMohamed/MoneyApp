import { useDashboardState } from '@/modules/dashboard/screens/dashboard/dashboard.state';

beforeEach(() => useDashboardState.getState().reset());

describe('useDashboardState', () => {
  it('starts with the expected initial state', () => {
    const s = useDashboardState.getState().state;
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.refreshing).toBe(false);
    expect(s.selectedSegment).toBe('overview');
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

  it('setSelectedSegment switches between overview and accounts', () => {
    useDashboardState.getState().setSelectedSegment('accounts');
    expect(useDashboardState.getState().state.selectedSegment).toBe('accounts');
    useDashboardState.getState().setSelectedSegment('overview');
    expect(useDashboardState.getState().state.selectedSegment).toBe('overview');
  });

  it('reset clears all fields back to initial state', () => {
    useDashboardState.setState({
      state: { isBreakdownVisible: true, refreshing: true, selectedSegment: 'accounts' },
    });
    useDashboardState.getState().reset();
    const s = useDashboardState.getState().state;
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.refreshing).toBe(false);
    expect(s.selectedSegment).toBe('overview');
  });
});
