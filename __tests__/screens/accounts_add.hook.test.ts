import { renderHook } from '@testing-library/react-native';

import { useAddAccountApp } from '@/screens/accounts/add_account/add_account.hook';
import { useAccountStore } from '@/store/account.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, addAccount: jest.fn() }),
  );
}

describe('useAddAccountApp', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddAccountApp())).not.toThrow();
  });

  it('returns form and handleSave', () => {
    const { result } = renderHook(() => useAddAccountApp());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
  });
});
