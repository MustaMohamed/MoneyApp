/**
 * commitments_detail.hook.test.ts
 *
 * Background: detail.hook.ts calls setViewState inside a useEffect on mount.
 * This file tests the hook's public API surface with direct MobX-like store
 * mocks and real Signals local state hooks.
 */

import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCommitmentDetail } from '@/modules/commitments/screens/commitments/detail/detail.hook';
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

function setup() {
  jest.mocked(useCommitmentStore).mockReturnValue({
    commitments: [],
    payments: [],
    skipPayment: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useCommitmentStore>);
  jest.mocked(useAccountStore).mockReturnValue({
    accounts: [],
  } as unknown as ReturnType<typeof useAccountStore>);
  jest.mocked(useCategoryStore).mockReturnValue({
    categories: [],
  } as unknown as ReturnType<typeof useCategoryStore>);
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

  it('viewState is notFound when store has no matching commitment', () => {
    const { result } = renderHook(() => useCommitmentDetail());
    expect(result.current.state.viewState).toBe('notFound');
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
