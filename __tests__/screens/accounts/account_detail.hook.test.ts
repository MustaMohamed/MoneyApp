import { act, renderHook } from '@testing-library/react-native';

import { useToast } from '@/components/ui/toast';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountNameTakenError } from '@/modules/accounts/repositories/account.errors';
import type { AccountActivitySnapshot } from '@/modules/accounts/repositories/account_activity.repository';
import type { ArchivedAccountDetailSnapshot } from '@/modules/accounts/repositories/archived_account_detail.repository';
import { useAccountActivityStore } from '@/modules/accounts/screens/accounts/detail/account_activity.store';
import { useAccountDetail } from '@/modules/accounts/screens/accounts/detail/account_detail.hook';
import { useAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';
import {
  useArchivedAccountDetailStore,
  type ArchivedAccountDetailStatus,
} from '@/modules/accounts/screens/accounts/detail/archived_account_detail.store';
import { useAccountStore, type Account } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestCategory, makeTestTransaction } from '@/test_helpers/transaction';
import { currentYearMonth } from '@/utils/year_month';

const mockBack = jest.fn();
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockFocusEffect = jest.fn<void, [() => void | (() => void)]>();
const mockEnsure = jest.fn();
const mockRetry = jest.fn(() => Promise.resolve());
const mockActivityReset = jest.fn();
const mockSlotEnsure = jest.fn(() => Promise.resolve());
const mockSlotRetry = jest.fn(() => Promise.resolve());
const mockSlotReset = jest.fn();
const mockSeedAccountFilter = jest.fn();
const mockOpenAdd = jest.fn();
type BeforeRemoveEvent = { preventDefault: () => void };
type BeforeRemoveHandler = (event: BeforeRemoveEvent) => void;
const mockAddListener = jest.fn<() => void, [string, BeforeRemoveHandler]>(() => jest.fn());

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
  useLocalSearchParams: () => ({ id: 'acc-1' }),
  useRouter: () => ({
    back: mockBack,
    navigate: mockNavigate,
    push: mockPush,
    dismissTo: mockDismissTo,
  }),
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
jest.mock('@/modules/accounts/screens/accounts/detail/archived_account_detail.store', () => ({
  useArchivedAccountDetailStore: jest.fn(),
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
    is_deleted: 0,
    sort_order: 0,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

let accountLoadError = false;

function mockAccounts(accounts: Account[]): void {
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts,
    loadError: accountLoadError,
    updateAccount: jest.fn(),
    archiveAccount: mockArchiveAccount,
    unarchiveAccount: mockUnarchiveAccount,
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

function mockSlot(
  snapshot?: ArchivedAccountDetailSnapshot,
  status: ArchivedAccountDetailStatus = 'ready',
): void {
  attachMockSelectorStore(useArchivedAccountDetailStore as unknown as jest.Mock, () => ({
    snapshot,
    status,
    requestedKey: undefined,
    requestGeneration: 0,
    ensure: mockSlotEnsure,
    retry: mockSlotRetry,
    reset: mockSlotReset,
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
const mockSetArchiveError = jest.fn();
const mockSetUnarchiving = jest.fn();
const mockSetUnarchiveError = jest.fn();
const mockReset = jest.fn();
const mockConfirmBalanceReviewed = jest.fn();
const mockAdjustBalance = jest.fn();
const mockArchiveAccount = jest.fn();
const mockUnarchiveAccount = jest.fn();

type DetailStateMock = {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isSaving: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
  isConfirmingBalanceReview: boolean;
  balanceReviewError: string | undefined;
  archiveError: string | undefined;
  isUnarchiving: boolean;
  unarchiveError: string | undefined;
  setEditing: jest.Mock;
  setAdjustVisible: jest.Mock;
  setArchiveVisible: jest.Mock;
  setSaving: jest.Mock;
  setAdjusting: jest.Mock;
  setArchiving: jest.Mock;
  setConfirmingBalanceReview: jest.Mock;
  setBalanceReviewError: jest.Mock;
  setArchiveError: jest.Mock;
  setUnarchiving: jest.Mock;
  setUnarchiveError: jest.Mock;
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
    archiveError: undefined,
    isUnarchiving: false,
    unarchiveError: undefined,
    setEditing: mockSetEditing,
    setAdjustVisible: mockSetAdjustVisible,
    setArchiveVisible: mockSetArchiveVisible,
    setSaving: mockSetSaving,
    setAdjusting: mockSetAdjusting,
    setArchiving: mockSetArchiving,
    setConfirmingBalanceReview: mockSetConfirmingBalanceReview,
    setBalanceReviewError: mockSetBalanceReviewError,
    setArchiveError: mockSetArchiveError,
    setUnarchiving: mockSetUnarchiving,
    setUnarchiveError: mockSetUnarchiveError,
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
  mockSlotEnsure.mockReturnValue(Promise.resolve());
  mockSlotRetry.mockReturnValue(Promise.resolve());
  accountLoadError = false;
  mockAccounts([]);
  mockActivity(undefined, 'idle');
  mockSlot(undefined, 'idle');
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

  it('closes the dialog and returns to the previous screen on a successful archive', async () => {
    mockArchiveAccount.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleArchive());

    expect(mockArchiveAccount).toHaveBeenCalledWith('acc-1');
    expect(mockSetArchiveVisible).toHaveBeenCalledWith(false);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockSetArchiveError).toHaveBeenCalledWith(undefined);
    expect(mockSetArchiveError).not.toHaveBeenCalledWith(Strings.accountDetailArchiveError);
    expect(mockSetArchiving).toHaveBeenLastCalledWith(false);
  });

  it('keeps the dialog open with the failure line when the archive write rejects', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockArchiveAccount.mockRejectedValue(new Error('db write failed'));
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleArchive());

    expect(mockSetArchiveError).toHaveBeenNthCalledWith(1, undefined);
    expect(mockSetArchiveError).toHaveBeenLastCalledWith(Strings.accountDetailArchiveError);
    // The dialog must stay up and the detail must not pop out from under it.
    expect(mockSetArchiveVisible).not.toHaveBeenCalledWith(false);
    expect(mockBack).not.toHaveBeenCalled();
    // `finally` still runs, so the Archive button must not stay spinning.
    expect(mockSetArchiving).toHaveBeenLastCalledWith(false);
    consoleError.mockRestore();
  });

  it('does not claim a failed archive when the write landed and the pop threw', async () => {
    mockArchiveAccount.mockResolvedValue(undefined);
    mockBack.mockImplementationOnce(() => {
      throw new Error('navigation gone');
    });
    const { result } = await renderHook(() => useAccountDetail());

    await act(async () => {
      await expect(result.current.handleArchive()).rejects.toThrow('navigation gone');
    });

    expect(mockArchiveAccount).toHaveBeenCalledWith('acc-1');
    expect(mockSetArchiveVisible).toHaveBeenCalledWith(false);
    expect(mockSetArchiveError).not.toHaveBeenCalledWith(Strings.accountDetailArchiveError);
    expect(mockSetArchiving).toHaveBeenLastCalledWith(false);
  });

  it('clears the failure when the dialog closes, so a reopen is clean', async () => {
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.closeArchive());

    expect(mockSetArchiveVisible).toHaveBeenCalledWith(false);
    expect(mockSetArchiveError).toHaveBeenCalledWith(undefined);
    expect(mockArchiveAccount).not.toHaveBeenCalled();
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

  it('drops the activity snapshot and the archived slot on unmount', async () => {
    mockAccounts([mkAccount()]);
    const { unmount } = await renderHook(() => useAccountDetail());

    expect(mockActivityReset).not.toHaveBeenCalled();
    expect(mockSlotReset).not.toHaveBeenCalled();
    await unmount();

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockActivityReset).toHaveBeenCalledTimes(1);
    expect(mockSlotReset).toHaveBeenCalledTimes(1);
  });

  it('retries the activity read with a fresh stamp', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.retryActivity());

    expect(mockRetry).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acc-1', mutationVersion: 3 }),
    );
  });

  it('seeds the transactions filter before popping to the tab', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.goToAllTransactions());

    expect(mockSeedAccountFilter).toHaveBeenCalledWith('acc-1', currentYearMonth());
    // The second pop reaches the tab's own Stack, which the first one leaves as it found it.
    expect(mockDismissTo.mock.calls).toEqual([[TRANSACTIONS_TAB], [TRANSACTIONS_TAB]]);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSeedAccountFilter.mock.invocationCallOrder[0]).toBeLessThan(
      mockDismissTo.mock.invocationCallOrder[0] ?? 0,
    );
  });

  // A `Sheet` that first renders already-open never animates in, so the form opens after the landing.
  it('lands on the tab before opening the add form with this account', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.addTransactionForAccount());

    expect(mockDismissTo.mock.calls).toEqual([[TRANSACTIONS_TAB], [TRANSACTIONS_TAB]]);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOpenAdd).toHaveBeenCalledWith({ accountId: 'acc-1' });
    expect(mockDismissTo.mock.invocationCallOrder[1]).toBeLessThan(
      mockOpenAdd.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('opens a row on the stacked transaction detail, a sibling of this screen', async () => {
    mockAccounts([mkAccount()]);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.goToTransaction('tx-9'));

    expect(mockPush).toHaveBeenCalledWith('/stacked/transactions/detail/tx-9');
    expect(mockNavigate).not.toHaveBeenCalled();
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

  it('moves the date onto the second line once the row has a category', async () => {
    mockAccounts([mkAccount()]);
    attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
      categories: [makeTestCategory({ id: 'category-1', name: 'Food' })],
    }));
    mockActivity({
      accountId: 'acc-1',
      rows: [makeTestTransaction({ id: 'tx-1', account_id: 'acc-1' })],
      stats: { month_in: 0, month_out: 0, week_in: 0, week_out: 0 },
      loadedAt: new Date('2026-09-15T12:00:00.000Z').getTime(),
    });
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.activity.rows[0]?.presentation.context).toBe('22 Jul');
    expect(result.current.state.activity.rows[0]?.presentation.timeText).toBe('');
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

function archivedSnapshot(
  overrides: Partial<ArchivedAccountDetailSnapshot> = {},
): ArchivedAccountDetailSnapshot {
  return {
    accountId: 'acc-1',
    account: mkAccount({ is_archived: 1 }),
    transactionCount: 42,
    activeCommitmentCount: 1,
    ...overrides,
  };
}

describe('useAccountDetail — an id outside the active list', () => {
  beforeEach(setup);

  it('resolves an archived id through the slot, with both counts and no month rows', async () => {
    mockSlot(archivedSnapshot());
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.viewState).toBe('archived');
    expect(result.current.state.account).toBeUndefined();
    expect(result.current.state.archived).toEqual({
      account: mkAccount({ is_archived: 1 }),
      transactionCount: 42,
      activeCommitmentCount: 1,
    });
    expect(result.current.state.activity.monthFacts).toEqual([]);
  });

  it('reads the slot on focus, stamped with the mutation version, and not the activity', async () => {
    await renderHook(() => useAccountDetail());

    runFocusEffect();

    expect(mockSlotEnsure).toHaveBeenCalledTimes(1);
    expect(mockSlotEnsure).toHaveBeenCalledWith({ accountId: 'acc-1', mutationVersion: 3 });
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it('shows a deleted id as not found, not as an archived account', async () => {
    mockSlot(archivedSnapshot({ account: undefined }));
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.viewState).toBe('notFound');
    expect(result.current.state.archived).toBeUndefined();
  });

  it('renders the active detail when the active list holds the id, whatever the slot holds', async () => {
    mockAccounts([mkAccount()]);
    mockSlot(archivedSnapshot());
    const { result } = await renderHook(() => useAccountDetail());

    runFocusEffect();

    expect(result.current.state.viewState).toBe('active');
    expect(result.current.state.archived).toBeUndefined();
    expect(mockSlotEnsure).not.toHaveBeenCalled();
    expect(mockEnsure).toHaveBeenCalledTimes(1);
  });

  it('does not paint a slot that holds another id', async () => {
    mockSlot(archivedSnapshot({ accountId: 'acc-other' }));
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.archived).toBeUndefined();
  });

  it.each<[ArchivedAccountDetailStatus, string]>([
    ['idle', 'loading'],
    ['initialLoading', 'loading'],
    ['initialError', 'loadError'],
  ])('reads a %s slot as %s', async (status, viewState) => {
    mockSlot(undefined, status);
    const { result } = await renderHook(() => useAccountDetail());

    expect(result.current.state.viewState).toBe(viewState);
  });

  it('retries the archived read with a fresh stamp', async () => {
    mockSlot(undefined, 'initialError');
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.retryArchivedRead());

    expect(mockSlotRetry).toHaveBeenCalledWith({ accountId: 'acc-1', mutationVersion: 3 });
  });

  it('restores in place: drops the slot, asks for the activity and toasts the name', async () => {
    mockSlot(archivedSnapshot());
    mockUnarchiveAccount.mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleUnarchive());

    expect(mockUnarchiveAccount).toHaveBeenCalledWith('acc-1');
    expect(mockSetUnarchiveError.mock.calls).toEqual([[undefined]]);
    expect(mockSetUnarchiveError.mock.invocationCallOrder[0]).toBeLessThan(
      mockUnarchiveAccount.mock.invocationCallOrder[0] ?? 0,
    );
    // The reset bumps the slot's generation, so a read still in flight is dropped.
    expect(mockSlotReset).toHaveBeenCalledTimes(1);
    expect(mockUnarchiveAccount.mock.invocationCallOrder[0]).toBeLessThan(
      mockSlotReset.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acc-1', mutationVersion: 3 }),
    );
    expect(useToast().toast.show).toHaveBeenCalledTimes(1);
    expect(useToast().toast.show).toHaveBeenCalledWith({
      label: 'CIB restored.',
      variant: 'success',
    });
    expect(mockSetUnarchiving).toHaveBeenNthCalledWith(1, true);
    expect(mockSetUnarchiving).toHaveBeenLastCalledWith(false);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('pops to the list with the restored toast when the write landed and the reload failed', async () => {
    mockSlot(archivedSnapshot());
    mockUnarchiveAccount.mockImplementationOnce(async () => {
      accountLoadError = true;
    });
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleUnarchive());

    expect(mockUnarchiveAccount).toHaveBeenCalledWith('acc-1');
    expect(useToast().toast.show).toHaveBeenCalledTimes(1);
    expect(useToast().toast.show).toHaveBeenCalledWith({
      label: 'CIB restored.',
      variant: 'success',
    });
    expect(mockDismissTo.mock.calls).toEqual([['/accounts']]);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockSlotReset).not.toHaveBeenCalled();
    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockSetUnarchiveError.mock.calls).toEqual([[undefined]]);
    expect(mockSetUnarchiving).toHaveBeenLastCalledWith(false);
  });

  it('toasts a blank-named account under the shared label — MA-059', async () => {
    mockSlot(archivedSnapshot({ account: mkAccount({ name: '', is_archived: 1 }) }));
    mockUnarchiveAccount.mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleUnarchive());

    expect(useToast().toast.show).toHaveBeenCalledWith({
      label: `${Strings.unnamedAccount} restored.`,
      variant: 'success',
    });
  });

  it.each([
    [
      'refuses a name an active account holds',
      new AccountNameTakenError(),
      Strings.accountsArchivedNameTaken,
    ],
    ['reports a restore that did not land', new Error('db'), Strings.accountsArchivedRestoreError],
  ])('%s with one line and leaves the screen as it was', async (_name, failure, line) => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockSlot(archivedSnapshot());
    mockUnarchiveAccount.mockRejectedValueOnce(failure);
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleUnarchive());

    expect(mockSetUnarchiveError).toHaveBeenNthCalledWith(1, undefined);
    expect(mockSetUnarchiveError).toHaveBeenLastCalledWith(line);
    expect(useToast().toast.show).not.toHaveBeenCalled();
    expect(mockSlotReset).not.toHaveBeenCalled();
    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockSetUnarchiving).toHaveBeenLastCalledWith(false);
    consoleError.mockRestore();
  });

  it('ignores a second tap while a restore is running', async () => {
    mockSlot(archivedSnapshot());
    mockDetailState({ isUnarchiving: true });
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleUnarchive());

    expect(mockUnarchiveAccount).not.toHaveBeenCalled();
    expect(mockSetUnarchiveError).not.toHaveBeenCalled();
    expect(mockSetUnarchiving).not.toHaveBeenCalled();
  });

  it('writes nothing while the slot holds no archived row', async () => {
    mockSlot(undefined, 'initialLoading');
    const { result } = await renderHook(() => useAccountDetail());

    await act(() => result.current.handleUnarchive());

    expect(mockUnarchiveAccount).not.toHaveBeenCalled();
    expect(mockSetUnarchiving).not.toHaveBeenCalled();
  });
});
