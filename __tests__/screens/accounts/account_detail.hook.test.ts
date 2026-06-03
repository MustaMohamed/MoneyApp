import { renderHook } from '@testing-library/react-native';

import { useAccountDetail } from '@/modules/accounts/screens/accounts/detail/account_detail.hook';
import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';
import { useAccountStore } from '@/modules/accounts/store/account.store';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'acc-1' }),
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/accounts/screens/accounts/detail/account_detail.state', () => {
  return { useAccountDetailState: jest.fn() };
});

function setup() {
  (useAccountStore as jest.Mock).mockReturnValue({
    accounts: [],
    updateAccount: jest.fn(),
    archiveAccount: jest.fn(),
    adjustBalance: jest.fn(),
  });
  (useAccountDetailState as jest.Mock).mockReturnValue({
    state: {
      isEditing: { value: false },
      isAdjustVisible: { value: false },
      isArchiveVisible: { value: false },
      isSaving: { value: false },
      isAdjusting: { value: false },
      isArchiving: { value: false },
    },
    setEditing: jest.fn(),
    setAdjustVisible: jest.fn(),
    setArchiveVisible: jest.fn(),
    setSaving: jest.fn(),
    setAdjusting: jest.fn(),
    setArchiving: jest.fn(),
    reset: jest.fn(),
  });
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

  it('returns local UI state as signal refs', () => {
    const { result } = renderHook(() => useAccountDetail());

    expect(result.current.state.isEditing.value).toBe(false);
    expect(result.current.state.isAdjustVisible.value).toBe(false);
    expect(result.current.state.isArchiveVisible.value).toBe(false);
    expect(result.current.state.isSaving.value).toBe(false);
    expect(result.current.state.isAdjusting.value).toBe(false);
    expect(result.current.state.isArchiving.value).toBe(false);
  });

  it('exposes the handler surface the screen consumes', () => {
    const { result } = renderHook(() => useAccountDetail());
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.handleAdjustBalance).toBe('function');
    expect(typeof result.current.handleArchive).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });
});
