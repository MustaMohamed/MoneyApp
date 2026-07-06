import { act, renderHook } from '@testing-library/react-native';

import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import type { CommitmentStatusFilter } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockUseDeferredValue = jest.fn((value: unknown) => value);

jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    useDeferredValue: (value: unknown) => mockUseDeferredValue(value),
  };
});
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
let capturedFocusCallback: (() => void | (() => void)) | null = null;
const mockInteractionTasks: Array<{ callback: () => void; cancel: jest.Mock }> = [];

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    capturedFocusCallback = cb;
  },
}));
jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: jest.fn((callback: () => void) => {
    let cancelled = false;
    const cancel = jest.fn(() => {
      cancelled = true;
    });
    const task = {
      callback: () => {
        if (!cancelled) callback();
      },
      cancel,
    };
    mockInteractionTasks.push(task);
    return { cancel: task.cancel };
  }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/commitments.state', () => ({
  useCommitmentsScreenState: jest.fn(),
}));

const loadPaymentsForMonthMock = jest.fn().mockResolvedValue(undefined);
const loadCommitmentsMock = jest.fn().mockResolvedValue(undefined);
const generatePaymentsMock = jest.fn().mockResolvedValue(undefined);
const setSelectedMonthMock = jest.fn();
const setRefreshingMock = jest.fn();
const { runAfterInteractions } = jest.requireMock('@/utils/run_after_interactions');

function makePayment(id: string, status: CommitmentPaymentStatus): CommitmentPayment {
  return {
    id,
    commitment_id: `commitment-${id}`,
    due_date: '2026-05-01',
    paid_date: null,
    skipped_date: null,
    amount_due: 100,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: null,
    transaction_id: null,
    status,
    notes: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  };
}

function setup({
  selectedMonth = '2026-05',
  payments = [],
  statusFilter = 'all',
}: {
  selectedMonth?: string;
  payments?: CommitmentPayment[];
  statusFilter?: CommitmentStatusFilter;
} = {}) {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments,
    selectedMonth,
    setSelectedMonth: setSelectedMonthMock,
    loadPaymentsForMonth: loadPaymentsForMonthMock,
    loadCommitments: loadCommitmentsMock,
    generatePayments: generatePaymentsMock,
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useCommitmentsScreenState as unknown as jest.Mock, () => ({
    refreshing: false,
    statusFilter,
    setRefreshing: setRefreshingMock,
    setStatusFilter: jest.fn(),
  }));
}

describe('useCommitments', () => {
  beforeEach(() => {
    capturedFocusCallback = null;
    mockInteractionTasks.length = 0;
    loadPaymentsForMonthMock.mockReset().mockResolvedValue(undefined);
    loadCommitmentsMock.mockReset().mockResolvedValue(undefined);
    generatePaymentsMock.mockReset().mockResolvedValue(undefined);
    setSelectedMonthMock.mockClear();
    setRefreshingMock.mockClear();
    mockUseDeferredValue.mockReset().mockImplementation((value: unknown) => value);
    runAfterInteractions.mockClear();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCommitments())).not.toThrow();
  });

  it('isEmpty is true when no payments', () => {
    const { result } = renderHook(() => useCommitments());
    expect(result.current.state.isEmpty).toBe(true);
  });

  it('cancels pending focus reload work on cleanup', () => {
    renderHook(() => useCommitments());

    let cleanup: void | (() => void);
    act(() => {
      cleanup = capturedFocusCallback?.();
    });

    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(loadCommitmentsMock).not.toHaveBeenCalled();
    expect(loadPaymentsForMonthMock).not.toHaveBeenCalled();

    act(() => {
      cleanup?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(loadCommitmentsMock).not.toHaveBeenCalled();
    expect(loadPaymentsForMonthMock).not.toHaveBeenCalled();
  });

  it('focus reload regenerates payments before loading the selected month', async () => {
    const calls: string[] = [];
    loadCommitmentsMock.mockImplementation(async () => {
      calls.push('loadCommitments');
    });
    generatePaymentsMock.mockImplementation(async () => {
      calls.push('generatePayments');
    });
    loadPaymentsForMonthMock.mockImplementation(async (yearMonth: string) => {
      calls.push(`loadPaymentsForMonth:${yearMonth}`);
    });
    renderHook(() => useCommitments());

    act(() => {
      capturedFocusCallback?.();
    });
    await act(async () => {
      mockInteractionTasks[0]?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(calls).toEqual(['loadCommitments', 'generatePayments', 'loadPaymentsForMonth:2026-05']);
  });

  it('pull-to-refresh reloads immediately without waiting for interactions', async () => {
    const { result } = renderHook(() => useCommitments());
    runAfterInteractions.mockClear();

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(runAfterInteractions).not.toHaveBeenCalled();
    expect(setRefreshingMock).toHaveBeenNthCalledWith(1, true);
    expect(loadCommitmentsMock).toHaveBeenCalledTimes(1);
    expect(generatePaymentsMock).toHaveBeenCalledTimes(1);
    expect(loadPaymentsForMonthMock).toHaveBeenCalledWith('2026-05');
    expect(setRefreshingMock).toHaveBeenLastCalledWith(false);
  });

  it('selectMonth delegates to the commitment store selected month', () => {
    const { result } = renderHook(() => useCommitments());

    act(() => {
      result.current.selectMonth('2026-08');
    });

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2026-08');
  });

  it('keeps selected status immediate while deferring section regrouping', () => {
    mockUseDeferredValue.mockImplementation((value) =>
      value === CommitmentPaymentStatus.Paid ? 'all' : value,
    );
    setup({
      statusFilter: CommitmentPaymentStatus.Paid,
      payments: [
        makePayment('overdue-payment', CommitmentPaymentStatus.Overdue),
        makePayment('paid-payment', CommitmentPaymentStatus.Paid),
      ],
    });

    const { result } = renderHook(() => useCommitments());

    expect(mockUseDeferredValue).toHaveBeenCalledWith(CommitmentPaymentStatus.Paid);
    expect(result.current.state.statusFilter).toBe(CommitmentPaymentStatus.Paid);
    expect(
      result.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual(['overdue-payment', 'paid-payment']);
  });

  it('navigateMonth moves January to previous December', () => {
    setup({ selectedMonth: '2026-01' });
    const { result } = renderHook(() => useCommitments());

    act(() => {
      result.current.navigateMonth('prev');
    });

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2025-12');
  });

  it('navigateMonth moves December to next January', () => {
    setup({ selectedMonth: '2026-12' });
    const { result } = renderHook(() => useCommitments());

    act(() => {
      result.current.navigateMonth('next');
    });

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2027-01');
  });
});
