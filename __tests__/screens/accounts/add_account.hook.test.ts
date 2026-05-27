import { renderHook } from '@testing-library/react-native';

import {
  useAddAccountApp,
  ACCOUNT_COLORS,
} from '@/modules/accounts/screens/accounts/add_account/add_account.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  useAccountStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ loadAccounts: jest.fn().mockResolvedValue(undefined) })),
  }),
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

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddAccountApp())).not.toThrow();
  });

  it('returns form, handleSave, and onBack', () => {
    const { result } = renderHook(() => useAddAccountApp());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });

  it('exports the 12-entry ACCOUNT_COLORS preset row', () => {
    expect(ACCOUNT_COLORS).toHaveLength(12);
  });
});
