// Stores are mocked: a real one plus the `useShallow` passthrough loops on an unstable snapshot.

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
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentDetail } from '@/modules/commitments/screens/commitments/detail/detail.hook';
import {
  useCommitmentDetailScreenData,
  useCommitmentDetailState,
} from '@/modules/commitments/screens/commitments/detail/detail.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockGetPaymentsByCommitment = jest.fn();
const mockSkipPayment = jest.fn();
const mockSetSkipConfirmVisible = jest.fn();
let commitmentsState: Commitment[] = [];
let paymentsState: CommitmentPayment[] = [];

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
  commitmentRepository: {
    getPaymentsByCommitment: (...args: unknown[]) => mockGetPaymentsByCommitment(...args),
  },
}));
jest.mock('@/modules/commitments/screens/commitments/detail/detail.state', () => ({
  useCommitmentDetailScreenData: jest.fn(),
  useCommitmentDetailState: jest.fn(),
}));
jest.mock('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state', () => ({
  usePaySheetState: jest.fn(),
}));

function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: commitmentsState,
    payments: paymentsState,
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

describe('useCommitmentDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    commitmentsState = [];
    paymentsState = [];
    mockGetPaymentsByCommitment.mockResolvedValue([]);
    mockSkipPayment.mockResolvedValue(undefined);
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useCommitmentDetail())).resolves.toBeDefined();
  });

  it('payment is undefined when store has no matching payment', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(result.current.state.payment).toBeUndefined();
  });

  it('allPayments starts as empty array', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(result.current.state.allPayments).toEqual([]);
  });

  it('viewState is loading (from mocked store initial state)', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(result.current.state.viewState).toBe('loading');
  });

  it('skipConfirmVisible starts as false', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(result.current.state.skipConfirmVisible).toBe(false);
  });

  it('exposes all required action functions', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(typeof result.current.openPaySheet).toBe('function');
    expect(typeof result.current.skipPayment).toBe('function');
    expect(typeof result.current.confirmSkip).toBe('function');
    expect(typeof result.current.cancelSkip).toBe('function');
    expect(typeof result.current.goToEdit).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
  });

  it('completes a committed skip before an effect-driven history refresh failure', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const historyError = new Error('history refresh failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result, rerender } = await renderHook(() => useCommitmentDetail());
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(1);
    mockGetPaymentsByCommitment.mockRejectedValueOnce(historyError);

    await act(async () => {
      await result.current.skipPayment();
    });

    expect(mockSkipPayment).toHaveBeenCalledWith(payment.id);
    expect(mockSetSkipConfirmVisible).toHaveBeenCalledWith(false);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[commitmentDetail] skipPayment failed',
      historyError,
    );

    paymentsState = [{ ...payment, status: CommitmentPaymentStatus.Skipped }];
    await rerender({});
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[commitmentDetail] getPaymentsByCommitment failed',
      historyError,
    );
    consoleSpy.mockRestore();
  });
});
