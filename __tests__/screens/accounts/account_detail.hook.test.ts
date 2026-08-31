import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
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
const mockSetBalanceReviewError = jest.fn();
const mockReset = jest.fn();
const mockConfirmBalanceReviewed = jest.fn();
const mockAdjustBalance = jest.fn();

type DetailStateMock = {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isSaving: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
  isConfirmingBalanceReview: boolean;
  balanceReviewError: string | undefined;
  setEditing: jest.Mock;
  setAdjustVisible: jest.Mock;
  setArchiveVisible: jest.Mock;
  setSaving: jest.Mock;
  setAdjusting: jest.Mock;
  setArchiving: jest.Mock;
  setConfirmingBalanceReview: jest.Mock;
  setBalanceReviewError: jest.Mock;
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
    balanceReviewError: undefined,
    setEditing: mockSetEditing,
    setAdjustVisible: mockSetAdjustVisible,
    setArchiveVisible: mockSetArchiveVisible,
    setSaving: mockSetSaving,
    setAdjusting: mockSetAdjusting,
    setArchiving: mockSetArchiving,
    setConfirmingBalanceReview: mockSetConfirmingBalanceReview,
    setBalanceReviewError: mockSetBalanceReviewError,
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
    adjustBalance: mockAdjustBalance,
    confirmBalanceReviewed: mockConfirmBalanceReviewed,
  }));
  mockDetailState();
}

describe('useAccountDetail', () => {
  beforeEach(setup);

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAccountDetail())).resolves.toBeDefined();
  });

  it('account is undefined when accounts list is empty', async () => {
    const { result } = await renderHook(() => useAccountDetail());
    expect(result.current.state.account).toBeUndefined();
  });

  it('returns local UI state as plain booleans', async () => {
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.isEditing).toBe(false);
    expect(result.current.state.isAdjustVisible).toBe(false);
    expect(result.current.state.isArchiveVisible).toBe(false);
    expect(result.current.state.isSaving).toBe(false);
    expect(result.current.state.isAdjusting).toBe(false);
    expect(result.current.state.isArchiving).toBe(false);
    expect(result.current.state.isConfirmingBalanceReview).toBe(false);
    expect(result.current.state.balanceReviewError).toBeUndefined();
  });

  it('exposes the handler surface the screen consumes', async () => {
    const { result } = await renderHook(() => useAccountDetail());
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.handleAdjustBalance).toBe('function');
    expect(typeof result.current.handleArchive).toBe('function');
    expect(typeof result.current.handleConfirmBalanceReviewed).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });

  it('confirms the legacy card balance without changing its amount', async () => {
    mockConfirmBalanceReviewed.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleConfirmBalanceReviewed());

    expect(mockConfirmBalanceReviewed).toHaveBeenCalledWith('acc-1');
    expect(mockSetBalanceReviewError).toHaveBeenCalledWith(undefined);
    expect(mockSetConfirmingBalanceReview).toHaveBeenNthCalledWith(1, true);
    expect(mockSetConfirmingBalanceReview).toHaveBeenLastCalledWith(false);
  });

  it('surfaces confirmation failures in screen state', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockConfirmBalanceReviewed.mockRejectedValue(new Error('db error'));
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleConfirmBalanceReviewed());

    expect(mockSetBalanceReviewError).toHaveBeenNthCalledWith(1, undefined);
    expect(mockSetBalanceReviewError).toHaveBeenLastCalledWith(Strings.accountBalanceReviewError);
    expect(mockSetConfirmingBalanceReview).toHaveBeenLastCalledWith(false);
    consoleError.mockRestore();
  });

  it('ignores another confirmation while one is active', async () => {
    mockDetailState({ isConfirmingBalanceReview: true });
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleConfirmBalanceReviewed());

    expect(mockConfirmBalanceReviewed).not.toHaveBeenCalled();
    expect(mockSetConfirmingBalanceReview).not.toHaveBeenCalled();
  });

  it('closes the adjust sheet on a successful balance adjust', async () => {
    mockAdjustBalance.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleAdjustBalance(1500));

    expect(mockAdjustBalance).toHaveBeenCalledWith('acc-1', 1500);
    expect(mockSetAdjustVisible).toHaveBeenCalledWith(false);
    expect(mockSetAdjusting).toHaveBeenLastCalledWith(false);
  });

  it('H5: propagates a failed balance adjust to the sheet and leaves it open', async () => {
    const failure = new Error('db write failed');
    mockAdjustBalance.mockRejectedValue(failure);
    const { result } = await renderHook(() => useAccountDetail());

    // The sheet's `handleSave` awaits this inside a try, so a swallowed rejection is silent.
    await act(async () => {
      await expect(result.current.handleAdjustBalance(1500)).rejects.toBe(failure);
    });

    // `setAdjustVisible(false)` sits after the throw, so the sheet stays open for a retry.
    expect(mockSetAdjustVisible).not.toHaveBeenCalledWith(false);
    // `finally` still runs, so the Save Balance button must not stay spinning.
    expect(mockSetAdjusting).toHaveBeenLastCalledWith(false);
  });

  it('leaves edit mode instead of navigating back when editing', async () => {
    mockDetailState({ isEditing: true });
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.onBack());

    expect(mockSetEditing).toHaveBeenCalledWith(false);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('prevents navigation removal while editing and exits edit mode', async () => {
    mockDetailState({ isEditing: true });
    const preventDefault = jest.fn();

    await renderHook(() => useAccountDetail());
    const beforeRemoveHandler = mockAddListener.mock.calls.find(
      ([event]) => event === 'beforeRemove',
    )?.[1];
    beforeRemoveHandler?.({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSetEditing).toHaveBeenCalledWith(false);
  });

  it('reads latest edit state when a registered beforeRemove handler fires later', async () => {
    const store = mockDetailState({ isEditing: false });
    const preventDefault = jest.fn();

    await renderHook(() => useAccountDetail());
    const beforeRemoveHandler = mockAddListener.mock.calls.find(
      ([event]) => event === 'beforeRemove',
    )?.[1];

    store.isEditing = true;
    beforeRemoveHandler?.({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSetEditing).toHaveBeenCalledWith(false);
  });
});
