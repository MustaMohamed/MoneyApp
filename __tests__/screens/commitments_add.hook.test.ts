import { signal } from '@preact/signals-react';
import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useAddCommitment } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.hook';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/add_commitment/add_commitment.state', () => ({
  useAddCommitmentState: jest.fn(),
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
    addCommitment: jest.fn().mockResolvedValue(undefined),
    generatePayments: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useCommitmentStore>);
  jest
    .mocked(useAccountStore)
    .mockReturnValue({ state: { accounts: { value: [] } } } as unknown as ReturnType<
      typeof useAccountStore
    >);
  jest
    .mocked(useCategoryStore)
    .mockReturnValue({ state: { categories: signal([]) } } as unknown as ReturnType<
      typeof useCategoryStore
    >);
  jest.mocked(useAddCommitmentState).mockReturnValue({
    state: { saving: signal(false) },
    setSaving: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof useAddCommitmentState>);
}

describe('useAddCommitment', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddCommitment())).not.toThrow();
  });

  it('saving defaults to false', () => {
    const { result } = renderHook(() => useAddCommitment());
    expect(result.current.state.saving).toBe(false);
  });
});
