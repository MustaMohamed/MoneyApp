import { act, renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useAddCommitment } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.hook';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
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

const addCommitmentMock = jest.fn().mockResolvedValue(undefined);
const generatePaymentsMock = jest.fn().mockResolvedValue(undefined);

function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments: [],
    addCommitment: addCommitmentMock,
    generatePayments: generatePaymentsMock,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useAddCommitmentState as unknown as jest.Mock, () => ({
    saving: false,
    setSaving: jest.fn(),
    reset: jest.fn(),
  }));
}

describe('useAddCommitment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddCommitment())).not.toThrow();
  });

  it('saving defaults to false', () => {
    const { result } = renderHook(() => useAddCommitment());
    expect(result.current.state.saving).toBe(false);
  });

  it('leaves payment generation to the commitment mutation owner', async () => {
    const { result } = renderHook(() => useAddCommitment());
    act(() => {
      result.current.form.setValue('name', 'Rent');
      result.current.form.setValue('amount', 5000);
      result.current.form.setValue('categoryId', 'category-rent');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(addCommitmentMock).toHaveBeenCalledTimes(1);
    expect(generatePaymentsMock).not.toHaveBeenCalled();
  });
});
