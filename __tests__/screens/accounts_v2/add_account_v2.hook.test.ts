import { renderHook } from '@testing-library/react-native';

import {
  useAddAccountAppV2,
  ACCOUNT_COLORS,
} from '@/screens/accounts_v2/add_account/add_account.hook';
import { useAccountStore } from '@/store/account.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ loadAccounts: jest.fn().mockResolvedValue(undefined) })),
  }),
}));

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, addAccount: jest.fn() }),
  );
}

describe('useAddAccountAppV2', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddAccountAppV2())).not.toThrow();
  });

  it('returns form, handleSave, and onBack', () => {
    const { result } = renderHook(() => useAddAccountAppV2());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });

  it('exports the 12-entry ACCOUNT_COLORS preset row', () => {
    expect(ACCOUNT_COLORS).toHaveLength(12);
  });
});
