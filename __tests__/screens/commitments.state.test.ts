import { CommitmentPaymentStatus } from '@/constants/enums';
import { useCommitmentsScreenState } from '@/screens/commitments/commitments.state';

beforeEach(() => useCommitmentsScreenState.getState().reset());

describe('useCommitmentsScreenState', () => {
  it('starts with refreshing false and statusFilter all', () => {
    const s = useCommitmentsScreenState.getState().state;
    expect(s.refreshing).toBe(false);
    expect(s.statusFilter).toBe('all');
  });

  it('setRefreshing updates refreshing', () => {
    useCommitmentsScreenState.getState().setRefreshing(true);
    expect(useCommitmentsScreenState.getState().state.refreshing).toBe(true);
  });

  it('setStatusFilter updates statusFilter', () => {
    useCommitmentsScreenState.getState().setStatusFilter(CommitmentPaymentStatus.Paid);
    expect(useCommitmentsScreenState.getState().state.statusFilter).toBe(
      CommitmentPaymentStatus.Paid,
    );
  });

  it('reset returns to initial state', () => {
    useCommitmentsScreenState.getState().setRefreshing(true);
    useCommitmentsScreenState.getState().reset();
    expect(useCommitmentsScreenState.getState().state.refreshing).toBe(false);
  });
});
