import { act, renderHook } from '@testing-library/react-native';

import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

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
const setRefreshingMock = jest.fn();
const { runAfterInteractions } = jest.requireMock('@/utils/run_after_interactions');

function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments: [],
    selectedMonth: '2026-05',
    setSelectedMonth: jest.fn(),
    loadPaymentsForMonth: loadPaymentsForMonthMock,
    loadCommitments: loadCommitmentsMock,
    generatePayments: generatePaymentsMock,
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useCommitmentsScreenState as unknown as jest.Mock, () => ({
    refreshing: false,
    statusFilter: 'all',
    setRefreshing: setRefreshingMock,
    setStatusFilter: jest.fn(),
  }));
}

describe('useCommitments', () => {
  beforeEach(() => {
    capturedFocusCallback = null;
    mockInteractionTasks.length = 0;
    loadPaymentsForMonthMock.mockClear();
    loadCommitmentsMock.mockClear();
    generatePaymentsMock.mockClear();
    setRefreshingMock.mockClear();
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
});
