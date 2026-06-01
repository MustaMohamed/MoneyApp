import { signal } from '@preact/signals-react';
import { renderHook } from '@testing-library/react-native';

import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/commitments.state', () => ({
  useCommitmentsScreenState: jest.fn(),
}));

function setup() {
  jest.mocked(useCommitmentStore).mockReturnValue({
    state: {
      commitments: { value: [] },
      payments: { value: [] },
      selectedMonth: { value: '2026-05' },
      commitmentsLoaded: { value: true },
      paymentsLoaded: { value: true },
    },
    setSelectedMonth: jest.fn(),
    loadPaymentsForMonth: jest.fn().mockResolvedValue(undefined),
    loadCommitments: jest.fn().mockResolvedValue(undefined),
    generatePayments: jest.fn().mockResolvedValue(undefined),
    skipPayment: jest.fn().mockResolvedValue(undefined),
    deactivateCommitment: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useCommitmentStore>);
  jest
    .mocked(useCategoryStore)
    .mockReturnValue({ state: { categories: signal([]) } } as unknown as ReturnType<
      typeof useCategoryStore
    >);
  jest.mocked(useCommitmentsScreenState).mockReturnValue({
    state: {
      refreshing: signal(false),
      statusFilter: signal('all' as const),
    },
    setRefreshing: jest.fn(),
    setStatusFilter: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof useCommitmentsScreenState>);
}

describe('useCommitments', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCommitments())).not.toThrow();
  });

  it('isEmpty is true when no payments', () => {
    const { result } = renderHook(() => useCommitments());
    expect(result.current.state.isEmpty).toBe(true);
  });
});
