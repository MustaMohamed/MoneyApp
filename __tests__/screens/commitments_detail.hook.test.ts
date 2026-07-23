/**
 * commitments_detail.hook.test.ts
 *
 * Background: detail.hook.ts calls setViewState inside a useEffect on mount.
 * In the React test renderer, this fires synchronously within renderHook's
 * act(). Any real Zustand store + useShallow:(sel)=>sel passthrough produces
 * a new object reference every call → useSyncExternalStore "unstable snapshot"
 * → "Maximum update depth exceeded".
 *
 * Fix 1 relocated useCommitmentDetailScreenData to detail.state.ts (exported).
 * That store's behavior is verified in commitments_detail_screen_data.state.test.ts.
 *
 * This file tests the hook's public API surface with both detail.state stores
 * mocked to stable values, exercising the hook's real logic (useMemo derivations,
 * action callbacks shapes).
 */

import { act, renderHook } from '@testing-library/react-native';

import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentDetail } from '@/modules/commitments/screens/commitments/detail/detail.hook';
import {
  useCommitmentDetailScreenData,
  useCommitmentDetailState,
} from '@/modules/commitments/screens/commitments/detail/detail.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'pay-1' }),
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentsByCommitment: jest.fn().mockResolvedValue([]) },
}));
jest.mock('@/modules/commitments/screens/commitments/detail/detail.state', () => ({
  useCommitmentDetailScreenData: jest.fn(),
  useCommitmentDetailState: jest.fn(),
}));
jest.mock('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state', () => ({
  usePaySheetState: jest.fn(),
}));

const commitment: Commitment = {
  id: 'commitment-1',
  name: 'Rent',
  amount_type: AmountType.Fixed,
  amount: 5000,
  currency: Currency.EGP,
  category_id: 'category-1',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2026-01-01',
  account_id: 'account-1',
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const payment: CommitmentPayment = {
  id: 'pay-1',
  commitment_id: commitment.id,
  due_date: '2026-05-01',
  paid_date: null,
  skipped_date: null,
  amount_due: 5000,
  amount_paid: null,
  currency: Currency.EGP,
  exchange_rate_snapshot: null,
  account_id: 'account-1',
  transaction_id: null,
  status: CommitmentPaymentStatus.Due,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const mockSkipPayment = jest.fn().mockResolvedValue(undefined);
const mockSetSkipConfirmVisible = jest.fn();

function setup(storeValues: { commitments?: Commitment[]; payments?: CommitmentPayment[] } = {}) {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: storeValues.commitments ?? [],
    payments: storeValues.payments ?? [],
    skipPayment: mockSkipPayment,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useCommitmentDetailScreenData as unknown as jest.Mock, () => ({
    viewState: 'loading' as const,
    allPayments: [],
    setAllPayments: jest.fn(),
    setViewState: jest.fn(),
    reset: jest.fn(),
  }));
  attachMockSelectorStore(useCommitmentDetailState as unknown as jest.Mock, () => ({
    skipConfirmVisible: false,
    setSkipConfirmVisible: mockSetSkipConfirmVisible,
    reset: jest.fn(),
  }));
  attachMockSelectorStore(usePaySheetState as unknown as jest.Mock, () => ({
    visible: false,
    setVisible: jest.fn(),
  }));
}

describe('useCommitmentDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSkipPayment.mockResolvedValue(undefined);
    (commitmentRepository.getPaymentsByCommitment as jest.Mock).mockResolvedValue([]);
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCommitmentDetail())).not.toThrow();
  });

  it('payment is undefined when store has no matching payment', () => {
    const { result } = renderHook(() => useCommitmentDetail());
    expect(result.current.state.payment).toBeUndefined();
  });

  it('allPayments starts as empty array', () => {
    const { result } = renderHook(() => useCommitmentDetail());
    expect(result.current.state.allPayments).toEqual([]);
  });

  it('viewState is loading (from mocked store initial state)', () => {
    const { result } = renderHook(() => useCommitmentDetail());
    expect(result.current.state.viewState).toBe('loading');
  });

  it('skipConfirmVisible starts as false', () => {
    const { result } = renderHook(() => useCommitmentDetail());
    expect(result.current.state.skipConfirmVisible).toBe(false);
  });

  it('exposes all required action functions', () => {
    const { result } = renderHook(() => useCommitmentDetail());
    expect(typeof result.current.openPaySheet).toBe('function');
    expect(typeof result.current.skipPayment).toBe('function');
    expect(typeof result.current.confirmSkip).toBe('function');
    expect(typeof result.current.cancelSkip).toBe('function');
    expect(typeof result.current.goToEdit).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
  });

  it('closes a committed skip without issuing a second direct detail query', async () => {
    setup({ commitments: [commitment], payments: [payment] });
    const { result } = renderHook(() => useCommitmentDetail());
    await act(async () => {
      await Promise.resolve();
    });
    expect(commitmentRepository.getPaymentsByCommitment).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.skipPayment();
    });

    expect(mockSkipPayment).toHaveBeenCalledWith(payment.id);
    expect(mockSetSkipConfirmVisible).toHaveBeenCalledWith(false);
    expect(commitmentRepository.getPaymentsByCommitment).toHaveBeenCalledTimes(1);
  });
});
