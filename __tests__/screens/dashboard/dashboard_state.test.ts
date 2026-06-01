import { act, renderHook } from '@testing-library/react-native';

import { useDashboardState } from '@/modules/dashboard/screens/dashboard/dashboard.state';

describe('useDashboardState', () => {
  it('starts with the expected initial state', () => {
    const { result } = renderHook(() => useDashboardState());
    const { state } = result.current;
    expect(state.isBreakdownVisible.value).toBe(false);
    expect(state.refreshing.value).toBe(false);
    expect(state.selectedSegment.value).toBe('overview');
  });

  it('setBreakdownVisible toggles', () => {
    const { result } = renderHook(() => useDashboardState());
    act(() => result.current.setBreakdownVisible(true));
    expect(result.current.state.isBreakdownVisible.value).toBe(true);
    act(() => result.current.setBreakdownVisible(false));
    expect(result.current.state.isBreakdownVisible.value).toBe(false);
  });

  it('setRefreshing toggles', () => {
    const { result } = renderHook(() => useDashboardState());
    act(() => result.current.setRefreshing(true));
    expect(result.current.state.refreshing.value).toBe(true);
    act(() => result.current.setRefreshing(false));
    expect(result.current.state.refreshing.value).toBe(false);
  });

  it('setSelectedSegment switches between overview and accounts', () => {
    const { result } = renderHook(() => useDashboardState());
    act(() => result.current.setSelectedSegment('accounts'));
    expect(result.current.state.selectedSegment.value).toBe('accounts');
    act(() => result.current.setSelectedSegment('overview'));
    expect(result.current.state.selectedSegment.value).toBe('overview');
  });

  it('reset clears all fields back to initial state', () => {
    const { result } = renderHook(() => useDashboardState());
    act(() => {
      result.current.setBreakdownVisible(true);
      result.current.setRefreshing(true);
      result.current.setSelectedSegment('accounts');
    });
    act(() => result.current.reset());
    const { state } = result.current;
    expect(state.isBreakdownVisible.value).toBe(false);
    expect(state.refreshing.value).toBe(false);
    expect(state.selectedSegment.value).toBe('overview');
  });
});
