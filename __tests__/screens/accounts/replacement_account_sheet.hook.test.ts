import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useReplacementAccountSheet } from '@/modules/accounts/screens/accounts/detail/components/replacement_account_sheet.hook';
import { useReplacementAccountSheetState } from '@/modules/accounts/screens/accounts/detail/components/replacement_account_sheet.state';
import { makeAccountCommitmentRef } from '@/test_helpers/commitment';

const mockBack = jest.fn();
const mockToast = { show: jest.fn() };
const mockDeleteAccountMovingCommitments = jest.fn();

// The wrapper, not HeroUI, so `show` sees exactly what the call site passed.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  useAccountStore: {
    getState: () => ({ deleteAccountMovingCommitments: mockDeleteAccountMovingCommitments }),
  },
}));

function mkAccount(overrides: Partial<Account>): Account {
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

const ARCHIVED = mkAccount({ id: 'acc-1', name: 'CIB', is_archived: 1 });
const CASH = mkAccount({ id: 'acc-2', name: 'Cash' });
const HSBC = mkAccount({ id: 'acc-3', name: 'HSBC' });
const GYM = makeAccountCommitmentRef({ id: 'com-1', name: 'Gym' });
const NETFLIX = makeAccountCommitmentRef({ id: 'com-2', name: 'Netflix' });

const sheetState = () => useReplacementAccountSheetState.getState();

function input(commitments = [GYM]) {
  return { account: ARCHIVED, commitments, options: [CASH, HSBC] };
}

beforeEach(() => {
  jest.clearAllMocks();
  sheetState().reset();
});

describe('useReplacementAccountSheet', () => {
  it('reads the sheet state it owns', async () => {
    sheetState().open('acc-2');
    const { result } = await renderHook(() => useReplacementAccountSheet(input()));

    expect(result.current.state).toEqual({
      isOpen: true,
      selectedId: 'acc-2',
      busy: false,
      errorMessage: undefined,
    });
  });

  it.each([
    ['one commitment', [GYM], 'CIB deleted. Gym now uses Cash.'],
    ['two commitments', [GYM, NETFLIX], 'CIB deleted. 2 commitments now use Cash.'],
  ])(
    'moves %s and deletes, closes the sheet and pops before the toast',
    async (_label, commitments, label) => {
      sheetState().open('acc-2');
      mockDeleteAccountMovingCommitments.mockResolvedValueOnce(undefined);
      const { result } = await renderHook(() => useReplacementAccountSheet(input(commitments)));

      await act(() => result.current.handleMoveAndDelete());

      expect(mockDeleteAccountMovingCommitments).toHaveBeenCalledWith('acc-1', 'acc-2');
      expect(sheetState().isVisible).toBe(false);
      expect(sheetState().isMovingAndDeleting).toBe(false);
      expect(sheetState().moveAndDeleteError).toBeUndefined();
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockToast.show).toHaveBeenCalledTimes(1);
      expect(mockToast.show).toHaveBeenCalledWith({ label, variant: 'success' });
      expect(mockBack.mock.invocationCallOrder[0]).toBeLessThan(
        mockToast.show.mock.invocationCallOrder[0] ?? 0,
      );
    },
  );

  it('is busy while the write runs, with the last failure cleared, and settles after it', async () => {
    sheetState().open('acc-2');
    sheetState().setMoveAndDeleteError('Not deleted');
    let finish!: () => void;
    mockDeleteAccountMovingCommitments.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = await renderHook(() => useReplacementAccountSheet(input()));

    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.handleMoveAndDelete();
    });

    expect(result.current.state.busy).toBe(true);
    expect(result.current.state.errorMessage).toBeUndefined();

    await act(async () => {
      finish();
      await pending;
    });

    expect(sheetState().isMovingAndDeleting).toBe(false);
  });

  it('keeps the sheet open with the failure line when the move and delete rejects', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    sheetState().open('acc-2');
    mockDeleteAccountMovingCommitments.mockRejectedValueOnce(new Error('db write failed'));
    const { result } = await renderHook(() => useReplacementAccountSheet(input()));

    await act(() => result.current.handleMoveAndDelete());

    expect(sheetState().isVisible).toBe(true);
    expect(sheetState().isMovingAndDeleting).toBe(false);
    expect(result.current.state.errorMessage).toBe(Strings.accountDetailDeleteError);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockToast.show).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('ignores a second confirm while the move and delete runs', async () => {
    sheetState().open('acc-2');
    sheetState().setMovingAndDeleting(true);
    const { result } = await renderHook(() => useReplacementAccountSheet(input()));

    await act(() => result.current.handleMoveAndDelete());

    expect(mockDeleteAccountMovingCommitments).not.toHaveBeenCalled();
    expect(sheetState().isMovingAndDeleting).toBe(true);
  });

  it('closes the sheet and clears its failure while idle', async () => {
    sheetState().open('acc-2');
    sheetState().setMoveAndDeleteError('Not deleted');
    const { result } = await renderHook(() => useReplacementAccountSheet(input()));

    await act(() => result.current.closeReplacement());

    expect(sheetState().isVisible).toBe(false);
    expect(sheetState().moveAndDeleteError).toBeUndefined();
    expect(mockDeleteAccountMovingCommitments).not.toHaveBeenCalled();
  });

  it('holds the sheet and its selection while busy', async () => {
    sheetState().open('acc-2');
    sheetState().setMovingAndDeleting(true);
    const { result } = await renderHook(() => useReplacementAccountSheet(input()));

    await act(() => result.current.closeReplacement());
    await act(() => result.current.selectReplacement('acc-3'));

    expect(sheetState().isVisible).toBe(true);
    expect(sheetState().replacementAccountId).toBe('acc-2');
  });

  it('selects another replacement while idle', async () => {
    sheetState().open('acc-2');
    const { result } = await renderHook(() => useReplacementAccountSheet(input()));

    await act(() => result.current.selectReplacement('acc-3'));

    expect(sheetState().replacementAccountId).toBe('acc-3');
  });

  it('registers no hardware back handler while idle', async () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    sheetState().open('acc-2');

    await renderHook(() => useReplacementAccountSheet(input()));

    expect(addListener).not.toHaveBeenCalled();
    addListener.mockRestore();
  });

  it('swallows hardware back while busy, changing nothing', async () => {
    const addListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() });
    sheetState().open('acc-2');
    sheetState().setMovingAndDeleting(true);

    await renderHook(() => useReplacementAccountSheet(input()));

    expect(addListener).toHaveBeenCalledTimes(1);
    const [eventName, handler] = addListener.mock.calls[0]!;
    expect(eventName).toBe('hardwareBackPress');
    expect((handler as () => boolean | null | undefined)()).toBe(true);
    expect(mockBack).not.toHaveBeenCalled();
    expect(sheetState().isVisible).toBe(true);
    addListener.mockRestore();
  });
});
