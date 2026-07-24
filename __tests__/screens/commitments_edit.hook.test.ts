import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import { useEditCommitment } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockRouterBack = jest.fn();
const mockRouterDismissTo = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'com-1' }),
  useRouter: () => ({
    back: mockRouterBack,
    replace: mockRouterReplace,
    dismissTo: mockRouterDismissTo,
  }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock(
  '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state',
  () => ({
    useEditCommitmentState: jest.fn(),
  }),
);

const commitment: Commitment = {
  id: 'com-1',
  name: 'Rent',
  amount_type: AmountType.Fixed,
  amount: 5000,
  currency: Currency.EGP,
  category_id: 'category-rent',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2026-01-01',
  account_id: null,
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const updateCommitmentMock = jest.fn().mockResolvedValue(undefined);
const setSavingMock = jest.fn();
const setSaveErrorMock = jest.fn();

function setup() {
  updateCommitmentMock.mockResolvedValue(undefined);
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [commitment],
    payments: [],
    selectedMonth: '2026-05',
    updateCommitment: updateCommitmentMock,
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
    saveError: undefined,
    deactivateDialogVisible: false,
    setSaving: setSavingMock,
    setSaveError: setSaveErrorMock,
    setDeactivateDialogVisible: jest.fn(),
    reset: jest.fn(),
  }));
}

describe('useEditCommitment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useEditCommitment())).not.toThrow();
  });

  it('saving defaults to false', () => {
    const { result } = renderHook(() => useEditCommitment());
    expect(result.current.state.saving).toBe(false);
  });

  it('keeps the form open and publishes a retryable error when update fails', async () => {
    updateCommitmentMock.mockRejectedValueOnce(new Error('regeneration failed'));
    const { result } = renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(setSaveErrorMock).toHaveBeenNthCalledWith(1, undefined);
    expect(setSaveErrorMock).toHaveBeenLastCalledWith(Strings.commitmentsSaveError);
    expect(mockRouterDismissTo).not.toHaveBeenCalled();
  });
});
