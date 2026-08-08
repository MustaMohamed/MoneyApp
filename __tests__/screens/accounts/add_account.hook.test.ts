import { renderHook } from '@testing-library/react-native';

import { useAddAccountApp } from '@/modules/accounts/screens/accounts/add_account/add_account.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

// Hoisted to module scope: attachMockSelectorStore's factory is re-invoked
// on every getState() call, so a `jest.fn()` built inside the factory would
// give the test and the hook two different references — a
// `not.toHaveBeenCalled()` assertion against that would pass vacuously, even
// with the redundant load still in place.
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);

function setup() {
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
    addAccount: jest.fn(),
    loadAccounts: mockLoadAccounts,
  }));
}

describe('useAddAccountApp', () => {
  beforeEach(() => {
    mockLoadAccounts.mockClear();
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
});
