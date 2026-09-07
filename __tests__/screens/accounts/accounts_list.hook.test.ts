import { act, renderHook } from '@testing-library/react-native';

import { useAccountsList } from '@/modules/accounts/screens/accounts/list/accounts_list.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

const accounts = [
  makeTestAccount({ id: 'acc-1', name: 'CIB Current', sort_order: 0 }),
  makeTestAccount({ id: 'acc-2', name: 'Cash', sort_order: 1 }),
];

beforeEach(() => {
  jest.clearAllMocks();
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({ accounts }));
});

describe('useAccountsList', () => {
  it('exposes the store rows by reference, in store order, with no filter of its own', async () => {
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.accounts).toBe(accounts);
  });

  it('opens a row at its detail route', async () => {
    const { result } = await renderHook(() => useAccountsList());
    await act(() => {
      result.current.goToAccount('acc-1');
    });
    expect(mockPush.mock.calls).toEqual([['/accounts/acc-1']]);
  });

  it('opens the add-account form from the header', async () => {
    const { result } = await renderHook(() => useAccountsList());
    await act(() => {
      result.current.goToAddAccount();
    });
    expect(mockPush.mock.calls).toEqual([['/accounts/add_account']]);
  });

  it('back pops once and pushes nothing', async () => {
    const { result } = await renderHook(() => useAccountsList());
    await act(() => {
      result.current.onBack();
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
