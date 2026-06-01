/**
 * commitments_detail.hook.test.ts
 *
 * Background: detail.hook.ts calls setViewState inside a useEffect on mount.
 * In the React test renderer, this fires synchronously within renderHook's
 * act(). Any real selector store produces
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

import { signal } from '@preact/signals-react';
import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentDetail } from '@/modules/commitments/screens/commitments/detail/detail.hook';
import {
  useCommitmentDetailScreenData,
  useCommitmentDetailState,
} from '@/modules/commitments/screens/commitments/detail/detail.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';

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

function setup() {
  jest.mocked(useCommitmentStore).mockReturnValue({
    state: {
      commitments: { value: [] },
      payments: { value: [] },
      selectedMonth: { value: '2026-05' },
      commitmentsLoaded: { value: true },
      paymentsLoaded: { value: true },
    },
    skipPayment: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useCommitmentStore>);
  jest
    .mocked(useAccountStore)
    .mockReturnValue({ state: { accounts: { value: [] } } } as unknown as ReturnType<
      typeof useAccountStore
    >);
  jest
    .mocked(useCategoryStore)
    .mockReturnValue({ state: { categories: signal([]) } } as unknown as ReturnType<
      typeof useCategoryStore
    >);
  jest.mocked(useCommitmentDetailScreenData).mockReturnValue({
    state: {
      viewState: signal('loading' as const),
      allPayments: signal([]),
    },
    setAllPayments: jest.fn(),
    setViewState: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof useCommitmentDetailScreenData>);
  jest.mocked(useCommitmentDetailState).mockReturnValue({
    state: { skipConfirmVisible: { value: false } },
    setSkipConfirmVisible: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof useCommitmentDetailState>);
  jest.mocked(usePaySheetState).mockReturnValue({
    state: {
      visible: { value: false },
      saving: { value: false },
      accountPickerVisible: { value: false },
      rateOverride: { value: false },
      showIosDatePicker: { value: false },
    },
    setVisible: jest.fn(),
    setSaving: jest.fn(),
    setAccountPickerVisible: jest.fn(),
    setRateOverride: jest.fn(),
    toggleIosDatePicker: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof usePaySheetState>);
}

describe('useCommitmentDetail', () => {
  beforeEach(setup);

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
});
