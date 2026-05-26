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

import { renderHook } from '@testing-library/react-native';

import { useCommitmentDetail } from '@/modules/commitments/screens/commitments/detail/detail.hook';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'pay-1' }),
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentsByCommitment: jest.fn().mockResolvedValue([]) },
}));
jest.mock('@/modules/commitments/screens/commitments/detail/detail.state', () => ({
  useCommitmentDetailScreenData: Object.assign(
    jest.fn((sel: any) =>
      sel({
        state: { viewState: 'loading', allPayments: [] },
        setAllPayments: jest.fn(),
        setViewState: jest.fn(),
        reset: jest.fn(),
      }),
    ),
    {
      getState: jest.fn(() => ({
        state: { viewState: 'loading', allPayments: [] },
        setAllPayments: jest.fn(),
        setViewState: jest.fn(),
        reset: jest.fn(),
      })),
    },
  ),
  useCommitmentDetailState: Object.assign(
    jest.fn((sel: any) =>
      sel({
        state: { skipConfirmVisible: false },
        setSkipConfirmVisible: jest.fn(),
        reset: jest.fn(),
      }),
    ),
    {
      getState: jest.fn(() => ({
        state: { skipConfirmVisible: false },
        setSkipConfirmVisible: jest.fn(),
        reset: jest.fn(),
      })),
    },
  ),
}));
jest.mock('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state', () => ({
  usePaySheetState: Object.assign(
    jest.fn((sel: any) => sel({ state: { visible: false }, setVisible: jest.fn() })),
    { getState: jest.fn(() => ({ setVisible: jest.fn() })) },
  ),
}));

function setup() {
  (useCommitmentStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { commitments: [], payments: [] },
      skipPayment: jest.fn().mockResolvedValue(undefined),
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] } }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
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
