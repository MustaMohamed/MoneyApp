import { act, renderHook } from '@testing-library/react-native';

import { useAccountsList } from '@/modules/accounts/screens/accounts/list/accounts_list.hook';
import { useAccountsListState } from '@/modules/accounts/screens/accounts/list/accounts_list.state';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLoadAccounts = jest.fn<Promise<void>, []>();

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

let storeState = { accounts, loadError: false, loadAccounts: mockLoadAccounts };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadAccounts.mockResolvedValue(undefined);
  storeState = { accounts, loadError: false, loadAccounts: mockLoadAccounts };
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => storeState);
  useAccountsListState.getState().reset();
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

  it('retry reloads once and holds isRetrying until the reload settles', async () => {
    const reload = deferred<void>();
    mockLoadAccounts.mockReturnValueOnce(reload.promise);
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.isRetrying).toBe(false);

    let pending: Promise<void> = Promise.resolve();
    await act(() => {
      pending = result.current.retry();
    });

    expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
    expect(result.current.state.isRetrying).toBe(true);

    await act(async () => {
      reload.resolve();
      await pending;
    });

    expect(result.current.state.isRetrying).toBe(false);
  });

  it('a failed retry settles isRetrying and does not throw at the screen', async () => {
    mockLoadAccounts.mockRejectedValueOnce(new Error('db error'));
    const { result } = await renderHook(() => useAccountsList());

    await act(async () => {
      await expect(result.current.retry()).resolves.toBeUndefined();
    });

    expect(result.current.state.isRetrying).toBe(false);
  });

  it('a second tap while the retry is in flight reloads only once', async () => {
    const reload = deferred<void>();
    mockLoadAccounts.mockReturnValueOnce(reload.promise);
    const { result } = await renderHook(() => useAccountsList());

    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    await act(() => {
      first = result.current.retry();
    });
    await act(() => {
      second = result.current.retry();
    });

    expect(mockLoadAccounts).toHaveBeenCalledTimes(1);

    await act(async () => {
      reload.resolve();
      await Promise.all([first, second]);
    });
  });

  it('shows the error body over the rows when the last read failed', async () => {
    storeState = { accounts, loadError: true, loadAccounts: mockLoadAccounts };
    const { result } = await renderHook(() => useAccountsList());

    expect(result.current.state.loadError).toBe(true);
    expect(result.current.state.content).toBe('error');
  });
});
