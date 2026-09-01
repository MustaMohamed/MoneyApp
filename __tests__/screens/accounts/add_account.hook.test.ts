import { act, renderHook } from '@testing-library/react-native';

import { useAccountFormState } from '@/modules/accounts/components/account_form/account_form.state';
import { useAddAccountApp } from '@/modules/accounts/screens/accounts/add_account/add_account.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

// Module scope keeps one fn identity; jest.mock factories may only use `mock`-prefixed names.
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

// Module scope: `attachMockSelectorStore` re-runs its factory per `getState()`, minting new fns.
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);

// `addAccount` must republish `mockAccounts`, as the real store's `loadAccounts()` does.
const mockAddAccount = jest.fn();
let mockAccounts: { id: string; name: string }[] = [];

function setup() {
  mockAccounts = [];
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: mockAccounts,
    addAccount: mockAddAccount,
    loadAccounts: mockLoadAccounts,
  }));
}

async function fillValidDraft(result: { current: ReturnType<typeof useAddAccountApp> }) {
  await act(() => {
    result.current.form.setValue('name', 'New Account');
    result.current.form.setValue('balance', '100');
  });
}

describe('useAddAccountApp', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockAddAccount.mockReset();
    mockLoadAccounts.mockClear();
    useAccountFormState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAddAccountApp())).resolves.toBeDefined();
  });

  it('returns form, handleSave, onBack and state', async () => {
    const { result } = await renderHook(() => useAddAccountApp());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
    expect(result.current.state).toHaveProperty('saving');
    expect(result.current.state).toHaveProperty('errorMessage');
  });

  it('does not reload the account list on mount', async () => {
    await renderHook(() => useAddAccountApp());
    expect(mockLoadAccounts).not.toHaveBeenCalled();
  });

  it('a re-tap after a completed save does not pop twice (MA-008 D10, T1)', async () => {
    mockAddAccount.mockImplementation(async () => {
      mockAccounts = [...mockAccounts, { id: 'new', name: 'New Account' }];
    });
    const { result } = await renderHook(() => useAddAccountApp());
    await fillValidDraft(result);

    await act(async () => {
      await result.current.handleSave();
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
