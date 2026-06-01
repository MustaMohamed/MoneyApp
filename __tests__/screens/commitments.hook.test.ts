import { signal } from '@preact/signals-react';
import { renderHook } from '@testing-library/react-native';

import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
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
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments: [],
    selectedMonth: '2026-05',
    setSelectedMonth: jest.fn(),
    loadPaymentsForMonth: jest.fn().mockResolvedValue(undefined),
    loadCommitments: jest.fn().mockResolvedValue(undefined),
    generatePayments: jest.fn().mockResolvedValue(undefined),
  }));
  (useCategoryStore as unknown as jest.Mock).mockReturnValue({
    state: { categories: signal([]) },
  });
  attachMockSelectorStore(useCommitmentsScreenState as unknown as jest.Mock, () => ({
    refreshing: false,
    statusFilter: 'all',
    setRefreshing: jest.fn(),
    setStatusFilter: jest.fn(),
  }));
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
