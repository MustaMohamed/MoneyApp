import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createContext, createElement, useContext, type PropsWithChildren } from 'react';

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
import { useCommitmentDetailState } from '@/modules/commitments/screens/commitments/detail/detail.state';
import { useCommitmentDetailStore } from '@/modules/commitments/screens/commitments/detail/detail.store';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

type DetailParams = { id: string; originTxId?: string };

const mockGetPaymentsByCommitment = jest.fn();
const mockSkipPayment = jest.fn();
const mockPathname = { current: '/commitments/pay-1' };
const mockParamsContext = createContext<DetailParams | null>(null);
let mockParams: DetailParams = { id: 'pay-1' };
// Each copy reads the params its own wrapper supplies, so two can mount on different payments.
const mockUseParams = (): DetailParams => useContext(mockParamsContext) ?? mockParams;
let commitmentsState: Commitment[] = [];
let paymentsState: CommitmentPayment[] = [];

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseParams(),
  usePathname: () => mockPathname.current,
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
  attachMockSelectorStore(usePaySheetState as unknown as jest.Mock, () => ({
    visible: false,
    setVisible: jest.fn(),
  }));
}

function paramsWrapper(params: DetailParams) {
  return function ParamsWrapper({ children }: PropsWithChildren): React.ReactElement {
    return createElement(mockParamsContext.Provider, { value: params }, children);
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
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

const otherCommitment: Commitment = { ...commitment, id: 'commitment-2', name: 'Gym' };
const otherPayment: CommitmentPayment = {
  ...payment,
  id: 'pay-2',
  commitment_id: otherCommitment.id,
};
const rentHistory: CommitmentPayment[] = [payment];
const gymHistory: CommitmentPayment[] = [otherPayment];

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.current = '/commitments/pay-1';
  mockParams = { id: 'pay-1' };
  commitmentsState = [];
  paymentsState = [];
  mockGetPaymentsByCommitment.mockResolvedValue([]);
  mockSkipPayment.mockResolvedValue(undefined);
  useCommitmentDetailStore.getState().reset();
  useCommitmentDetailState.getState().reset();
  setup();
});

describe('useCommitmentDetail', () => {
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

  it('holds loading until the history query resolves', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const pending = deferred<CommitmentPayment[]>();
    mockGetPaymentsByCommitment.mockReturnValue(pending.promise);

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');

    await act(async () => {
      pending.resolve(rentHistory);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.allPayments).toEqual(rentHistory);
  });

  it('resolves not found when the store holds no matching commitment', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('notFound'));
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

  it('edits through the tabbed route when opened from the tabbed copy', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.goToEdit());

    expect(router.push).toHaveBeenCalledWith('/commitments/commitment-1/edit');
  });

  it('keeps the edit inside the stacked subtree when opened from the stacked copy', async () => {
    mockPathname.current = '/stacked/commitments/pay-1';
    mockParams.originTxId = 'tx-1';
    commitmentsState = [commitment];
    paymentsState = [payment];
    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.goToEdit());

    expect(router.push).toHaveBeenCalledWith(
      '/stacked/commitments/commitment-1/edit?originTxId=tx-1',
    );
  });

  it('completes a committed skip before an effect-driven history refresh failure', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const historyError = new Error('history refresh failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result, rerender } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(1);

    await act(async () => result.current.confirmSkip());
    expect(result.current.state.skipConfirmVisible).toBe(true);

    mockGetPaymentsByCommitment.mockRejectedValueOnce(historyError);

    await act(async () => {
      await result.current.skipPayment();
    });

    expect(mockSkipPayment).toHaveBeenCalledWith(payment.id);
    expect(result.current.state.skipConfirmVisible).toBe(false);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[commitmentDetail] skipPayment failed',
      historyError,
    );

    paymentsState = [{ ...payment, status: CommitmentPaymentStatus.Skipped }];
    await rerender({});

    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
    expect(consoleSpy).toHaveBeenCalledWith(
      '[commitmentDetail] getPaymentsByCommitment failed',
      historyError,
    );
    consoleSpy.mockRestore();
  });
});

describe('useCommitmentDetail two copies mounted at once', () => {
  it('each copy holds its own history and neither reloads when the other unmounts', async () => {
    commitmentsState = [commitment, otherCommitment];
    paymentsState = [payment, otherPayment];
    mockGetPaymentsByCommitment.mockImplementation((commitmentId: string) =>
      Promise.resolve(commitmentId === commitment.id ? rentHistory : gymHistory),
    );

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: otherPayment.id }),
    });
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));

    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(upper.result.current.state.allPayments).toEqual(gymHistory);

    await upper.unmount();

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);
  });

  it('two copies of the same payment do not release each other', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);

    const lower = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);

    await upper.unmount();

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);
  });

  it('a copy on a missing payment resolves not found alone', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));

    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: 'pay-missing' }),
    });
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('notFound'));

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
  });

  it('an unmounted copy leaves both stores holding only the copy still mounted', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);

    const lower = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));

    expect(Object.keys(useCommitmentDetailStore.getState().entries)).toHaveLength(2);
    expect(Object.keys(useCommitmentDetailState.getState().entries)).toHaveLength(2);

    await upper.unmount();

    expect(Object.keys(useCommitmentDetailStore.getState().entries)).toHaveLength(1);
    expect(Object.keys(useCommitmentDetailState.getState().entries)).toHaveLength(1);

    await lower.unmount();

    expect(useCommitmentDetailStore.getState().entries).toEqual({});
    expect(useCommitmentDetailState.getState().entries).toEqual({});
  });

  it('a skip that settles after its copy unmounts writes nothing back', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);
    const pendingSkip = deferred<void>();
    mockSkipPayment.mockReturnValue(pendingSkip.promise);

    const copy = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(copy.result.current.state.viewState).toBe('ready'));
    const skipping = copy.result.current.skipPayment();

    await copy.unmount();
    await act(async () => {
      pendingSkip.resolve();
      await skipping;
    });

    expect(useCommitmentDetailState.getState().entries).toEqual({});
    expect(useCommitmentDetailStore.getState().entries).toEqual({});
  });
});
