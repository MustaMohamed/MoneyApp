import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useEditCommitment } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'com-1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
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
    selectedMonth: '2026-05',
    updateCommitment: jest.fn().mockResolvedValue(undefined),
    deactivateCommitment: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useCommitmentStore>);
  jest.mocked(useAccountStore).mockReturnValue({
    accounts: [],
  } as unknown as ReturnType<typeof useAccountStore>);
  jest.mocked(useCategoryStore).mockReturnValue({
    categories: [],
  } as unknown as ReturnType<typeof useCategoryStore>);
}

describe('useEditCommitment', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useEditCommitment())).not.toThrow();
  });

  it('saving defaults to false', () => {
    const { result } = renderHook(() => useEditCommitment());
    expect(result.current.state.saving).toBe(false);
  });
});
