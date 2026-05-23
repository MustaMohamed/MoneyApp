import { renderHook } from '@testing-library/react-native';

import { useEditCommitment } from '@/screens/commitments/edit_commitment/edit_commitment.hook';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/store/commitment.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'com-1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
}));
jest.mock('@/store/commitment.store', () => ({ useCommitmentStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/commitments/edit_commitment/edit_commitment.state', () => ({
  useEditCommitmentState: jest.fn((sel: any) =>
    sel({
      state: { saving: false, deactivateDialogVisible: false },
      setSaving: jest.fn(),
      setDeactivateDialogVisible: jest.fn(),
      reset: jest.fn(),
    }),
  ),
}));

function setup() {
  (useCommitmentStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { commitments: [], payments: [], selectedMonth: '2026-05' },
      updateCommitment: jest.fn().mockResolvedValue(undefined),
      deactivateCommitment: jest.fn().mockResolvedValue(undefined),
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] } }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
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
