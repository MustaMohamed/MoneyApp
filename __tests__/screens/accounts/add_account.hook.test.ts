import { renderHook } from '@testing-library/react-native';

import {
  useAddAccountApp,
  ACCOUNT_COLORS,
} from '@/modules/accounts/screens/accounts/add_account/add_account.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

function setup() {
  (useAccountStore as jest.Mock).mockReturnValue({
    state: {
      accounts: { value: [] },
    },
    addAccount: jest.fn(),
    init: jest.fn().mockResolvedValue(undefined),
  });
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
