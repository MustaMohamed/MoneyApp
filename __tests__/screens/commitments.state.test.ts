import { act, renderHook } from '@testing-library/react-native';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';

describe('useCommitmentsScreenState', () => {
  it('starts with refreshing false and statusFilter all', () => {
    const { result } = renderHook(() => useCommitmentsScreenState());

    expect(result.current.state.refreshing.value).toBe(false);
    expect(result.current.state.statusFilter.value).toBe('all');
  });

  it('setRefreshing updates refreshing', () => {
    const { result } = renderHook(() => useCommitmentsScreenState());

    act(() => result.current.setRefreshing(true));

    expect(result.current.state.refreshing.value).toBe(true);
  });

  it('setStatusFilter updates statusFilter', () => {
    const { result } = renderHook(() => useCommitmentsScreenState());

    act(() => result.current.setStatusFilter(CommitmentPaymentStatus.Paid));

    expect(result.current.state.statusFilter.value).toBe(CommitmentPaymentStatus.Paid);
  });

  it('reset returns to initial state', () => {
    const { result } = renderHook(() => useCommitmentsScreenState());

    act(() => {
      result.current.setRefreshing(true);
      result.current.reset();
    });

    expect(result.current.state.refreshing.value).toBe(false);
    expect(result.current.state.statusFilter.value).toBe('all');
  });
});
