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

function setup() {
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
    addAccount: jest.fn(),
    loadAccounts: jest.fn().mockResolvedValue(undefined),
  }));
}

describe('useAddAccountApp', () => {
  beforeEach(setup);

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAddAccountApp())).resolves.toBeDefined();
  });

  it('returns form, handleSave, and onBack', async () => {
    const { result } = await renderHook(() => useAddAccountApp());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });
});
