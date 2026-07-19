import { act, renderHook } from '@testing-library/react-native';

import { useAccountDetail } from '@/modules/accounts/screens/accounts/detail/account_detail.hook';
import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockBack = jest.fn();
type BeforeRemoveEvent = { preventDefault: () => void };
type BeforeRemoveHandler = (event: BeforeRemoveEvent) => void;
const mockAddListener = jest.fn<() => void, [string, BeforeRemoveHandler]>(() => jest.fn());

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'acc-1' }),
  useRouter: () => ({ back: mockBack }),
  useNavigation: () => ({ addListener: mockAddListener }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/accounts/screens/accounts/detail/account_detail.state', () => {
  return { useAccountDetailState: jest.fn() };
});

const mockSetEditing = jest.fn();
const mockSetAdjustVisible = jest.fn();
const mockSetArchiveVisible = jest.fn();
const mockSetSaving = jest.fn();
const mockSetAdjusting = jest.fn();
const mockSetArchiving = jest.fn();
const mockSetConfirmingBalanceReview = jest.fn();
const mockReset = jest.fn();
const mockConfirmBalanceReviewed = jest.fn();

type DetailStateMock = {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isSaving: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
  isConfirmingBalanceReview: boolean;
  setEditing: jest.Mock;
  setAdjustVisible: jest.Mock;
  setArchiveVisible: jest.Mock;
  setSaving: jest.Mock;
  setAdjusting: jest.Mock;
  setArchiving: jest.Mock;
  setConfirmingBalanceReview: jest.Mock;
  reset: jest.Mock;
};

function createDetailStore(overrides: Partial<DetailStateMock> = {}): DetailStateMock {
  return {
    isEditing: false,
    isAdjustVisible: false,
    isArchiveVisible: false,
    isSaving: false,
    isAdjusting: false,
    isArchiving: false,
    isConfirmingBalanceReview: false,
    setEditing: mockSetEditing,
    setAdjustVisible: mockSetAdjustVisible,
    setArchiveVisible: mockSetArchiveVisible,
    setSaving: mockSetSaving,
    setAdjusting: mockSetAdjusting,
    setArchiving: mockSetArchiving,
    setConfirmingBalanceReview: mockSetConfirmingBalanceReview,
    reset: mockReset,
    ...overrides,
  };
}

function mockDetailState(overrides: Partial<DetailStateMock> = {}) {
  const store = createDetailStore(overrides);
  attachMockSelectorStore(useAccountDetailState as unknown as jest.Mock, () => store);
  return store;
}

function setup() {
  jest.clearAllMocks();
  mockAddListener.mockReturnValue(jest.fn());
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
    updateAccount: jest.fn(),
    archiveAccount: jest.fn(),
    adjustBalance: jest.fn(),
    confirmBalanceReviewed: mockConfirmBalanceReviewed,
  }));
  mockDetailState();
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

  it('returns local UI state as plain booleans', () => {
    const { result } = renderHook(() => useAccountDetail());

    expect(result.current.state.isEditing).toBe(false);
    expect(result.current.state.isAdjustVisible).toBe(false);
    expect(result.current.state.isArchiveVisible).toBe(false);
    expect(result.current.state.isSaving).toBe(false);
    expect(result.current.state.isAdjusting).toBe(false);
    expect(result.current.state.isArchiving).toBe(false);
    expect(result.current.state.isConfirmingBalanceReview).toBe(false);
  });

  it('exposes the handler surface the screen consumes', () => {
    const { result } = renderHook(() => useAccountDetail());
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.handleAdjustBalance).toBe('function');
    expect(typeof result.current.handleArchive).toBe('function');
    expect(typeof result.current.handleConfirmBalanceReviewed).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });

  it('confirms the legacy card balance without changing its amount', async () => {
    mockConfirmBalanceReviewed.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccountDetail());

    await act(() => result.current.handleConfirmBalanceReviewed());

    expect(mockConfirmBalanceReviewed).toHaveBeenCalledWith('acc-1');
    expect(mockSetConfirmingBalanceReview).toHaveBeenNthCalledWith(1, true);
    expect(mockSetConfirmingBalanceReview).toHaveBeenLastCalledWith(false);
  });

  it('leaves edit mode instead of navigating back when editing', () => {
    mockDetailState({ isEditing: true });
    const { result } = renderHook(() => useAccountDetail());

    act(() => result.current.onBack());

    expect(mockSetEditing).toHaveBeenCalledWith(false);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('prevents navigation removal while editing and exits edit mode', () => {
    mockDetailState({ isEditing: true });
    const preventDefault = jest.fn();

    renderHook(() => useAccountDetail());
    const beforeRemoveHandler = mockAddListener.mock.calls.find(
      ([event]) => event === 'beforeRemove',
    )?.[1];
    beforeRemoveHandler?.({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSetEditing).toHaveBeenCalledWith(false);
  });

  it('reads latest edit state when a registered beforeRemove handler fires later', () => {
    const store = mockDetailState({ isEditing: false });
    const preventDefault = jest.fn();

    renderHook(() => useAccountDetail());
    const beforeRemoveHandler = mockAddListener.mock.calls.find(
      ([event]) => event === 'beforeRemove',
    )?.[1];

    store.isEditing = true;
    beforeRemoveHandler?.({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSetEditing).toHaveBeenCalledWith(false);
  });
});
