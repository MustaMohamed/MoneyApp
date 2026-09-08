import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { AccountActivitySnapshot } from '@/modules/accounts/repositories/account_activity.repository';
import { useAccountActivityStore } from '@/modules/accounts/screens/accounts/detail/account_activity.store';
import { useAccountDetail } from '@/modules/accounts/screens/accounts/detail/account_detail.hook';
import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';
import { useAccountStore, type Account } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestTransaction } from '@/test_helpers/transaction';
import { currentYearMonth } from '@/utils/year_month';

const mockBack = jest.fn();
const mockNavigate = jest.fn();
const mockFocusEffect = jest.fn<void, [() => void | (() => void)]>();
const mockEnsure = jest.fn();
const mockRetry = jest.fn(() => Promise.resolve());
const mockActivityReset = jest.fn();
const mockSeedAccountFilter = jest.fn();
const mockOpenAdd = jest.fn();
type BeforeRemoveEvent = { preventDefault: () => void };
type BeforeRemoveHandler = (event: BeforeRemoveEvent) => void;
const mockAddListener = jest.fn<() => void, [string, BeforeRemoveHandler]>(() => jest.fn());

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
  useLocalSearchParams: () => ({ id: 'acc-1' }),
  useRouter: () => ({ back: mockBack, navigate: mockNavigate }),
  useNavigation: () => ({ addListener: mockAddListener }),
}));
jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: (task: () => void) => {
    task();
    return { cancel: jest.fn() };
  },
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/accounts/screens/accounts/detail/account_detail.state', () => {
  return { useAccountDetailState: jest.fn() };
});
jest.mock('@/modules/accounts/screens/accounts/detail/account_activity.store', () => ({
  useAccountActivityStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/transactions/store/transaction.store', () => ({
  useTransactionStore: { getState: () => ({ mutationVersion: 3 }) },
}));
jest.mock('@/modules/transactions/screens/transactions/transactions.store', () => ({
  useTransactionsScreenStore: { getState: () => ({ seedAccountFilter: mockSeedAccountFilter }) },
}));
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state',
  () => ({ useTransactionFormState: { getState: () => ({ openAdd: mockOpenAdd }) } }),
);

const TRANSACTIONS_TAB = '/(app)/(tabs)/transactions';

function mkAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 30000,
    current_balance: 30000,
    color: '#1B2B4B',
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    balance_review_required: 0,
    sort_order: 0,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockAccounts(accounts: Account[]): void {
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts,
    updateAccount: jest.fn(),
    archiveAccount: jest.fn(),
    adjustBalance: mockAdjustBalance,
    confirmBalanceReviewed: mockConfirmBalanceReviewed,
  }));
}

function mockActivity(snapshot?: AccountActivitySnapshot, status = 'ready'): void {
  attachMockSelectorStore(useAccountActivityStore as unknown as jest.Mock, () => ({
    snapshot,
    status,
    requestedKey: undefined,
    requestGeneration: 0,
    ensure: mockEnsure,
    retry: mockRetry,
    reset: mockActivityReset,
  }));
}

/** The focus effect the mocked `useFocusEffect` recorded, invoked as navigation would. */
function runFocusEffect(): void {
  mockFocusEffect.mock.calls.at(-1)?.[0]();
}

// The add handler waits two frames for the tabs host to paint; run them inline.
const rafSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
  callback(0);
  return 0;
});

afterAll(() => rafSpy.mockRestore());

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
  mockRetry.mockReturnValue(Promise.resolve());
  mockAccounts([]);
  mockActivity(undefined, 'idle');
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({ categories: [] }));
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

  it('loads the activity on focus, stamped with the current mutation version', async () => {
    mockAccounts([mkAccount()]);
    await renderHook(() => useAccountDetail());

    runFocusEffect();

    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acc-1', mutationVersion: 3 }),
    );
  });

  it('M14: does not load for an id the account store no longer holds', async () => {
    mockAccounts([mkAccount({ id: 'acc-other' })]);
    await renderHook(() => useAccountDetail());

    runFocusEffect();

    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it('drops the activity snapshot on unmount', async () => {
    mockAccounts([mkAccount()]);
    const { unmount } = await renderHook(() => useAccountDetail());

    expect(mockActivityReset).not.toHaveBeenCalled();
    await unmount();

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockActivityReset).toHaveBeenCalledTimes(1);
  });

  it('retries the activity read with a fresh stamp', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.retryActivity());

    expect(mockRetry).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acc-1', mutationVersion: 3 }),
    );
  });

  it('seeds the transactions filter before landing on the tab', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.goToAllTransactions());

    expect(mockSeedAccountFilter).toHaveBeenCalledWith('acc-1', currentYearMonth());
    expect(mockNavigate).toHaveBeenCalledWith(TRANSACTIONS_TAB);
    expect(mockSeedAccountFilter.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0] ?? 0,
    );
  });

  // The tabs subtree is frozen while the detail is on top, so the form opens after the landing.
  it('lands on the tab before opening the add form with this account', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.addTransactionForAccount());

    expect(mockNavigate).toHaveBeenCalledWith(TRANSACTIONS_TAB);
    expect(mockOpenAdd).toHaveBeenCalledWith({ accountId: 'acc-1' });
    expect(mockNavigate.mock.invocationCallOrder[0]).toBeLessThan(
      mockOpenAdd.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('opens a row on the transaction detail', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.goToTransaction('tx-9'));

    expect(mockNavigate).toHaveBeenCalledWith(`${TRANSACTIONS_TAB}/detail/tx-9`);
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

describe('useAccountDetail — the activity slice the screen renders', () => {
  beforeEach(setup);

  it("holds a bank's month rows at the unset glyph until the snapshot lands", async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.activity.monthFacts).toEqual([
      { label: Strings.accountDetailMonthInLabel, value: Strings.accountDetailFactUnset },
      { label: Strings.accountDetailMonthOutLabel, value: Strings.accountDetailFactUnset },
    ]);
    expect(result.current.state.activity.rows).toEqual([]);
  });

  it('gives a credit card no month rows at all', async () => {
    mockAccounts([mkAccount({ type: AccountType.CreditCard })]);
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.activity.monthFacts).toEqual([]);
  });

  it('fills the month rows and the row list from one snapshot', async () => {
    mockAccounts([mkAccount()]);
    mockActivity({
      accountId: 'acc-1',
      rows: [makeTestTransaction({ id: 'tx-1', account_id: 'acc-1' })],
      stats: { month_in: 1250, month_out: 640, week_in: 0, week_out: 0 },
      loadedAt: new Date('2026-09-15T12:00:00.000Z').getTime(),
    });
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.activity.monthFacts.map((fact) => fact.value)).toEqual([
      '1,250 EGP',
      '640 EGP',
    ]);
    expect(result.current.state.activity.rows).toHaveLength(1);
    expect(result.current.state.activity.rows[0]?.id).toBe('tx-1');
    expect(result.current.state.activity.rows[0]?.presentation.context).toBe('CIB');
  });

  it('ignores a snapshot belonging to another account', async () => {
    mockAccounts([mkAccount()]);
    mockActivity({
      accountId: 'acc-other',
      rows: [makeTestTransaction({ id: 'tx-1', account_id: 'acc-other' })],
      stats: { month_in: 1250, month_out: 640, week_in: 0, week_out: 0 },
      loadedAt: 0,
    });
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.activity.rows).toEqual([]);
    expect(result.current.state.activity.monthFacts.map((fact) => fact.value)).toEqual(['—', '—']);
  });
});
