import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useEditCommitment } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'com-1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock(
  '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state',
  () => ({
    useEditCommitmentState: jest.fn(),
  }),
);

function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments: [],
    selectedMonth: '2026-05',
    updateCommitment: jest.fn().mockResolvedValue(undefined),
    deactivateCommitment: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useEditCommitmentState as unknown as jest.Mock, () => ({
    saving: false,
    deactivateDialogVisible: false,
    setSaving: jest.fn(),
    setDeactivateDialogVisible: jest.fn(),
    reset: jest.fn(),
  }));
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
