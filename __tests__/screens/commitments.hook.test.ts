import { renderHook } from '@testing-library/react-native';

import { useCommitments } from '@/screens/commitments/commitments.hook';
import { useCommitmentsScreenState } from '@/screens/commitments/commitments.state';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/store/commitment.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock('@/store/commitment.store', () => ({ useCommitmentStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/commitments/commitments.state', () => ({
  useCommitmentsScreenState: jest.fn(),
}));

function setup() {
  (useCommitmentStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { commitments: [], payments: [], selectedMonth: '2026-05' },
      setSelectedMonth: jest.fn(),
      loadPaymentsForMonth: jest.fn().mockResolvedValue(undefined),
      loadCommitments: jest.fn().mockResolvedValue(undefined),
      generatePayments: jest.fn().mockResolvedValue(undefined),
    }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
  (useCommitmentsScreenState as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { refreshing: false, statusFilter: 'all' },
      setRefreshing: jest.fn(),
      setStatusFilter: jest.fn(),
    }),
  );
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
