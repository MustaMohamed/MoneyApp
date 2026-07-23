import { useDashboardState } from '@/modules/dashboard/screens/dashboard/dashboard.state';

beforeEach(() => useDashboardState.getState().reset());

describe('useDashboardState', () => {
  it('starts with the expected initial state', () => {
    const s = useDashboardState.getState();
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.selectedSegment).toBe('overview');
    expect(s).not.toHaveProperty('refreshing');
    expect(s).not.toHaveProperty('setRefreshing');
  });

  it('setBreakdownVisible toggles', () => {
    useDashboardState.getState().setBreakdownVisible(true);
    expect(useDashboardState.getState().isBreakdownVisible).toBe(true);
    useDashboardState.getState().setBreakdownVisible(false);
    expect(useDashboardState.getState().isBreakdownVisible).toBe(false);
  });

  it('setSelectedSegment switches between overview and accounts', () => {
    useDashboardState.getState().setSelectedSegment('accounts');
    expect(useDashboardState.getState().selectedSegment).toBe('accounts');
    useDashboardState.getState().setSelectedSegment('overview');
    expect(useDashboardState.getState().selectedSegment).toBe('overview');
  });

  it('reset clears all fields back to initial state', () => {
    useDashboardState.setState({
      isBreakdownVisible: true,
      selectedSegment: 'accounts',
    });
    useDashboardState.getState().reset();
    const s = useDashboardState.getState();
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.selectedSegment).toBe('overview');
  });
});
