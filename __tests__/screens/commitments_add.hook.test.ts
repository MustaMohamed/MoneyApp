import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useAddCommitment } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.hook';
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

function setup() {
  jest.mocked(useCommitmentStore).mockReturnValue({
    commitments: [],
    payments: [],
    addCommitment: jest.fn().mockResolvedValue(undefined),
    generatePayments: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useCommitmentStore>);
  jest.mocked(useAccountStore).mockReturnValue({
    accounts: [],
  } as unknown as ReturnType<typeof useAccountStore>);
  jest.mocked(useCategoryStore).mockReturnValue({
    categories: [],
  } as unknown as ReturnType<typeof useCategoryStore>);
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
