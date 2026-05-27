import { renderHook } from '@testing-library/react-native';

import { useAccountDetail } from '@/modules/accounts/screens/accounts/detail/account_detail.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'acc-1' }),
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/accounts/screens/accounts/detail/account_detail.state', () => {
  const mockState = {
    state: {
      isEditing: false,
      isAdjustVisible: false,
      isArchiveVisible: false,
      isSaving: false,
      isAdjusting: false,
      isArchiving: false,
    },
    setEditing: jest.fn(),
    setAdjustVisible: jest.fn(),
    setArchiveVisible: jest.fn(),
    setSaving: jest.fn(),
    setAdjusting: jest.fn(),
    setArchiving: jest.fn(),
    reset: jest.fn(),
  };
  const useAccountDetailState = Object.assign(
    jest.fn((sel: any) => sel(mockState)),
    {
      getState: jest.fn(() => ({
        state: { isEditing: false },
        setEditing: jest.fn(),
      })),
    },
  );
  return { useAccountDetailState };
});

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { accounts: [] },
      updateAccount: jest.fn(),
      archiveAccount: jest.fn(),
      adjustBalance: jest.fn(),
    }),
  );
}

describe('useAccountDetail', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAccountDetail())).not.toThrow();
  });

  it('account is undefined when accounts list is empty', () => {
    const { result } = renderHook(() => useAccountDetail());
    expect(result.current.state.account).toBeUndefined();
  });

  it('exposes the handler surface the screen consumes', () => {
    const { result } = renderHook(() => useAccountDetail());
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.handleAdjustBalance).toBe('function');
    expect(typeof result.current.handleArchive).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });
});
