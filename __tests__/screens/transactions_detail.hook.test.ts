import { renderHook } from '@testing-library/react-native';

import { useTransactionStore } from '@/store/transaction.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionDetail } from '@/screens/transactions/detail/detail.hook';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'tx-1' }),
  useRouter: () => ({ back: jest.fn() }),
  useFocusEffect: jest.fn(),
  router: { back: jest.fn() },
}));
jest.mock('@/store/transaction.store', () => ({ useTransactionStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/transactions/detail/detail.state', () => ({
  useTxDetailState: jest.fn((sel: any) =>
    sel({
      state: { confirmVisible: false, deleting: false, reloadKey: 0 },
      setConfirmVisible: jest.fn(),
      setDeleting: jest.fn(),
      bumpReload: jest.fn(),
      reset: jest.fn(),
    }),
  ),
}));
jest.mock('@/screens/transactions/detail/detail.store', () => ({
  useTxDetailStore: jest.fn((sel: any) =>
    sel({
      state: { tx: undefined },
      setTx: jest.fn(),
      reset: jest.fn(),
    }),
  ),
}));

function setup() {
  (useTransactionStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { transactions: [] },
      getById: jest.fn().mockResolvedValue(null),
      deleteTransaction: jest.fn(),
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] } }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
}

describe('useTransactionDetail', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useTransactionDetail('tx-1'))).not.toThrow();
  });

  it('viewState defaults to loading when tx is undefined', () => {
    const { result } = renderHook(() => useTransactionDetail('tx-1'));
    expect(result.current.state.viewState).toBe('loading');
  });
});
