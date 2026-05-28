import { renderHook } from '@testing-library/react-native';

import { useAccountDetail } from '@/modules/accounts/screens/accounts/detail/account_detail.hook';
import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';
import { useAccounts } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: <T>(selector: T) => selector }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'acc-1' }),
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccounts: jest.fn() }));
jest.mock('@/modules/accounts/screens/accounts/detail/account_detail.state', () => {
  return { useAccountDetailState: jest.fn() };
});

function setup() {
  (useAccounts as jest.Mock).mockReturnValue({
    state: {
      accounts: { value: [] },
    },
    updateAccount: jest.fn(),
    archiveAccount: jest.fn(),
    adjustBalance: jest.fn(),
  });
  attachMockSelectorStore(useAccountDetailState as unknown as jest.Mock, () => ({
    isEditing: false,
    isAdjustVisible: false,
    isArchiveVisible: false,
    isSaving: false,
    isAdjusting: false,
    isArchiving: false,
    setEditing: jest.fn(),
    setAdjustVisible: jest.fn(),
    setArchiveVisible: jest.fn(),
    setSaving: jest.fn(),
    setAdjusting: jest.fn(),
    setArchiving: jest.fn(),
    reset: jest.fn(),
  }));
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
