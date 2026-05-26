import { renderHook } from '@testing-library/react-native';

import { useAddCommitment } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.hook';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({ useCommitmentStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/add_commitment/add_commitment.state', () => ({
  useAddCommitmentState: jest.fn((sel: any) =>
    sel({ state: { saving: false }, setSaving: jest.fn(), reset: jest.fn() }),
  ),
}));

function setup() {
  (useCommitmentStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { commitments: [], payments: [] },
      addCommitment: jest.fn().mockResolvedValue(undefined),
      generatePayments: jest.fn().mockResolvedValue(undefined),
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] } }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
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
