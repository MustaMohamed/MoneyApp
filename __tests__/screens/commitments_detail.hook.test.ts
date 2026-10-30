import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createContext, createElement, useContext, type PropsWithChildren } from 'react';

import { AccountType, AmountType, Currency, DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentDetail } from '@/modules/commitments/screens/commitments/detail/detail.hook';
import { useCommitmentDetailState } from '@/modules/commitments/screens/commitments/detail/detail.state';
import { useCommitmentDetailStore } from '@/modules/commitments/screens/commitments/detail/detail.store';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount, makeTestCategory } from '@/test_helpers/transaction';

type DetailParams = {
  id: string;
  cycle?: string | string[];
  originTxId?: string;
  originTxCopy?: string;
};

const mockGetById = jest.fn();
const mockGetPaymentsByCommitment = jest.fn();
const mockSkipPayment = jest.fn();
const mockLoadAccountLookup = jest.fn<Promise<void>, [string[]]>();
const mockPathname = { current: '/commitments/commitment-1' };
const mockParamsContext = createContext<DetailParams | null>(null);
let mockParams: DetailParams = { id: 'commitment-1', cycle: 'pay-1' };
// Each copy reads the params its own wrapper supplies, so two can mount on different commitments.
const mockUseParams = (): DetailParams => useContext(mockParamsContext) ?? mockParams;
const TODAY = '2026-05-08';

let paymentsState: CommitmentPayment[] = [];
let commitmentsById: Record<string, Commitment> = {};
let historyById: Record<string, CommitmentPayment[]> = {};
let storeCommitments: Commitment[] = [];
let accountLookupById: Record<string, Account> = {};
let currencyRate = 48;
let currencyRateLoaded = true;
let accountLookupError = false;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseParams(),
  usePathname: () => mockPathname.current,
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn() },
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: {
    getById: (...args: unknown[]) => mockGetById(...args),
    getPaymentsByCommitment: (...args: unknown[]) => mockGetPaymentsByCommitment(...args),
  },
}));

// The month store holds no commitments: the detail reads its own from the repository.
function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: storeCommitments,
    payments: paymentsState,
    skipPayment: mockSkipPayment,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
    archivedAccounts: [],
    accountLookupById,
    accountLookupError,
    loadAccountLookup: mockLoadAccountLookup,
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: currencyRate,
    hasLoaded: currencyRateLoaded,
  }));
}

function paramsWrapper(params: DetailParams) {
  return function ParamsWrapper({ children }: PropsWithChildren): React.ReactElement {
    return createElement(mockParamsContext.Provider, { value: params }, children);
  };
}

const commitment = makeTestCommitment({
  id: 'commitment-1',
  amount: 5000,
  category_id: 'category-1',
  account_id: 'account-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const payment = makeTestPayment({
  id: 'pay-1',
  commitment_id: commitment.id,
  due_date: '2026-05-01',
  amount_due: 5000,
  account_id: 'account-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const otherCommitment: Commitment = { ...commitment, id: 'commitment-2', name: 'Gym' };
const otherPayment: CommitmentPayment = {
  ...payment,
  id: 'pay-2',
  commitment_id: otherCommitment.id,
};
const rentHistory: CommitmentPayment[] = [payment];
const gymHistory: CommitmentPayment[] = [otherPayment];

function seedRent(): void {
  commitmentsById = { [commitment.id]: commitment };
  historyById = { [commitment.id]: rentHistory };
}

function seedRentAndGym(): void {
  commitmentsById = { [commitment.id]: commitment, [otherCommitment.id]: otherCommitment };
  historyById = { [commitment.id]: rentHistory, [otherCommitment.id]: gymHistory };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.current = '/commitments/commitment-1';
  mockParams = { id: 'commitment-1', cycle: 'pay-1' };
  paymentsState = [];
  commitmentsById = {};
  historyById = {};
  storeCommitments = [];
  accountLookupById = {};
  accountLookupError = false;
  currencyRate = 48;
  currencyRateLoaded = true;
  mockLoadAccountLookup.mockResolvedValue(undefined);
  mockGetById.mockImplementation(async (id: string) => commitmentsById[id]);
  mockGetPaymentsByCommitment.mockImplementation(async (id: string) => historyById[id] ?? []);
  mockSkipPayment.mockResolvedValue(undefined);
  useCommitmentDetailStore.getState().reset();
  useCommitmentDetailState.getState().reset();
  usePaySheetState.getState().reset();
  useCommitmentFormHostState.getState().reset();
  setup();
});

type LandingKey = 'onSaved' | 'onDeactivated';

// What the host runs once a save or a deactivate settles: close the session, then its landing.
function runHostLanding(key: LandingKey): void {
  const { sessionId, landing } = useCommitmentFormHostState.getState();
  if (!useCommitmentFormHostState.getState().completeSave(sessionId)) {
    throw new Error('the host refused the completed save');
  }
  landing?.[key]?.();
}

function expectNoNavigation(): void {
  expect(router.push).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
  expect(router.dismissTo).not.toHaveBeenCalled();
  expect(router.dismissAll).not.toHaveBeenCalled();
}

async function openEditFromReadyDetail(): Promise<void> {
  seedRent();
  paymentsState = [payment];
  const { result } = await renderHook(() => useCommitmentDetail());
  await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

  await act(async () => result.current.goToEdit());

  expect(useCommitmentFormHostState.getState()).toMatchObject({
    phase: 'open',
    mode: 'edit',
    editingCommitmentId: 'commitment-1',
  });
}

function renderRecording(seen: string[]) {
  return renderHook(() => {
    const hook = useCommitmentDetail();
    seen.push(hook.state.viewState);
    return hook;
  });
}

describe('useCommitmentDetail', () => {
  it('renders without throwing', async () => {
    await expect(renderHook(() => useCommitmentDetail())).resolves.toBeDefined();
  });

  it('skipConfirmVisible starts as false', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(result.current.state.skipConfirmVisible).toBe(false);
  });

  it('exposes all required action functions', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(typeof result.current.openPaySheet).toBe('function');
    expect(typeof result.current.skipPayment).toBe('function');
    expect(typeof result.current.confirmSkip).toBe('function');
    expect(typeof result.current.cancelSkip).toBe('function');
    expect(typeof result.current.goToEdit).toBe('function');
    expect(typeof result.current.goBack).toBe('function');
    expect(result.current.state.owner).toEqual(expect.any(String));
    expect(result.current.state.owner.length).toBeGreaterThan(0);
  });

  it('reads the commitment and its rows by the route id, the commitment id', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 31, 10));
    try {
      seedRent();

      const { result } = await renderHook(() => useCommitmentDetail());

      await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
      expect(mockGetById).toHaveBeenCalledWith(commitment.id);
      expect(mockGetPaymentsByCommitment).toHaveBeenCalledWith(commitment.id);
      expect(result.current.state.commitment).toEqual(commitment);
      expect(result.current.state.payment?.id).toBe(payment.id);
      expect(result.current.state.allPayments).toEqual(rentHistory);
      expect(result.current.state.today).toBe('2026-01-31');
    } finally {
      jest.useRealTimers();
    }
  });

  it('dates the pay sheet by the day it opens, not the day the detail loaded', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 30, 23, 50));
    try {
      seedRent();
      const { result } = await renderHook(() => useCommitmentDetail());
      await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

      jest.setSystemTime(new Date(2026, 0, 31, 0, 5));
      await act(async () => result.current.openPaySheet());

      expect(result.current.state.today).toBe('2026-01-30');
      expect(result.current.state.paySheetToday).toBe('2026-01-31');
    } finally {
      jest.useRealTimers();
    }
  });

  it('heroes a variable commitment starting tomorrow with the varies badge and the starts caption, leaving the Repeats fact bare', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 30, 10));
    try {
      const variable: Commitment = {
        ...commitment,
        amount_type: AmountType.Variable,
        start_date: '2026-01-31',
      };
      commitmentsById = { [variable.id]: variable };
      historyById = { [variable.id]: rentHistory };
      attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
        categories: [makeTestCategory({ id: 'category-1', name: 'Bills' })],
      }));

      const { result } = await renderHook(() => useCommitmentDetail());

      await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
      expect(result.current.state.today).toBe('2026-01-30');
      expect(result.current.state.hero?.badgeLabel).toBe('Every month · varies');
      expect(result.current.state.hero?.caption).toBe('Bills · starts Sat 31 Jan 2026');
      expect(result.current.state.facts.find((fact) => fact.kind === 'repeats')?.value).toBe(
        'Every month',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('opens a carried row from an earlier month while the month store holds nothing', async () => {
    const carried: CommitmentPayment = { ...payment, id: 'pay-carried', due_date: '2026-03-01' };
    commitmentsById = { [commitment.id]: commitment };
    historyById = { [commitment.id]: [carried, payment] };
    paymentsState = [];
    mockParams = { id: commitment.id, cycle: carried.id };

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.payment?.id).toBe('pay-carried');
    expect(result.current.state.commitment?.id).toBe(commitment.id);
  });

  it('opens a stopped commitment at its paid cycle, never reading not found', async () => {
    const stopped: Commitment = { ...commitment, is_active: 0 };
    const paidRow: CommitmentPayment = {
      ...payment,
      id: 'pay-paid',
      due_date: '2026-02-01',
      paid_date: '2026-02-01',
      amount_paid: 5000,
    };
    commitmentsById = { [commitment.id]: stopped };
    historyById = { [commitment.id]: [paidRow] };
    mockParams = { id: commitment.id, cycle: paidRow.id, originTxId: 'tx-1' };
    const seen: string[] = [];

    const { result } = await renderRecording(seen);

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.commitment?.is_active).toBe(0);
    expect(result.current.state.payment?.id).toBe('pay-paid');
    expect(seen).not.toContain('notFound');
    expect(result.current.state.hero?.badgeLabel).toBe('Stopped');
    expect(result.current.state.cycleCard).toBeUndefined();
    expect(result.current.state.showsEdit).toBe(false);
  });

  it('a cold link draws loading until its own read answers, then the commitment at that cycle', async () => {
    historyById = { [commitment.id]: rentHistory };
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockReturnValueOnce(pending.promise);
    const seen: string[] = [];

    const { result } = await renderRecording(seen);

    expect(result.current.state.viewState).toBe('loading');

    await act(async () => {
      pending.resolve(commitment);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.payment?.id).toBe(payment.id);
    expect(seen).not.toContain('notFound');
  });

  it('reads not found only once getById answers no commitment', async () => {
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockReturnValueOnce(pending.promise);
    mockParams = { id: 'commitment-missing', cycle: 'pay-missing' };
    const seen: string[] = [];

    const { result } = await renderRecording(seen);

    expect(result.current.state.viewState).toBe('loading');
    expect(seen).not.toContain('notFound');

    await act(async () => {
      pending.resolve(undefined);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('notFound'));
    expect(mockGetById).toHaveBeenCalledWith('commitment-missing');
  });

  it('a failed first read draws the first-load error, never not found, and retry re-runs it', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    seedRent();
    mockGetById
      .mockRejectedValueOnce(new Error('first load failed'))
      .mockRejectedValueOnce(new Error('retry failed'));
    const seen: string[] = [];

    const { result } = await renderRecording(seen);
    await waitFor(() => expect(result.current.state.viewState).toBe('firstLoadError'));
    expect(result.current.state.allPayments).toEqual([]);

    await act(async () => result.current.reload());
    await waitFor(() => expect(mockGetById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.state.viewState).toBe('firstLoadError'));

    await act(async () => result.current.reload());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetById).toHaveBeenCalledTimes(3);
    expect(result.current.state.allPayments).toEqual(rentHistory);
    expect(seen).not.toContain('notFound');
    consoleSpy.mockRestore();
  });

  it('a cycle param naming no row opens at the earliest unpaid row', async () => {
    const skippedRow: CommitmentPayment = {
      ...payment,
      id: 'pay-skipped',
      due_date: '2026-03-01',
      skipped_date: '2026-03-02',
    };
    const unpaidApril: CommitmentPayment = { ...payment, id: 'pay-apr', due_date: '2026-04-01' };
    commitmentsById = { [commitment.id]: commitment };
    historyById = { [commitment.id]: [skippedRow, unpaidApril, payment] };
    mockParams = { id: commitment.id, cycle: 'no-such-payment' };

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.payment?.id).toBe('pay-apr');
  });

  it('a repeated cycle param opens at its first value', async () => {
    const unpaidApril: CommitmentPayment = { ...payment, id: 'pay-apr', due_date: '2026-04-01' };
    const unpaidJune: CommitmentPayment = { ...payment, id: 'pay-2', due_date: '2026-06-01' };
    commitmentsById = { [commitment.id]: commitment };
    historyById = { [commitment.id]: [unpaidApril, payment, unpaidJune] };
    mockParams = { id: commitment.id, cycle: ['pay-2', 'pay-2'] };

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.payment?.id).toBe('pay-2');
  });

  it('a commitment with no rows draws ready without a cycle, never not found', async () => {
    commitmentsById = { [commitment.id]: commitment };
    historyById = { [commitment.id]: [] };
    mockParams = { id: commitment.id, cycle: 'no-such-payment' };
    const seen: string[] = [];

    const { result } = await renderRecording(seen);

    await waitFor(() => expect(mockGetById).toHaveBeenCalledWith(commitment.id));
    await waitFor(() => expect(result.current.state.commitment?.id).toBe(commitment.id));
    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.payment).toBeUndefined();
    expect(seen).not.toContain('notFound');
  });

  it('after a re-read that regenerates the unpaid rows, stays on the cycle with the same due date', async () => {
    const paidApril: CommitmentPayment = {
      ...payment,
      id: 'pay-apr',
      due_date: '2026-04-01',
      paid_date: '2026-04-01',
      amount_paid: 5000,
    };
    const oldMay: CommitmentPayment = { ...payment, id: 'old-may', due_date: '2026-05-01' };
    const oldJune: CommitmentPayment = { ...payment, id: 'old-jun', due_date: '2026-06-01' };
    const newMay: CommitmentPayment = { ...payment, id: 'new-may', due_date: '2026-05-01' };
    const newJune: CommitmentPayment = { ...payment, id: 'new-jun', due_date: '2026-06-01' };
    commitmentsById = { [commitment.id]: commitment };
    historyById = { [commitment.id]: [paidApril, oldMay, oldJune] };
    mockParams = { id: commitment.id, cycle: 'old-jun' };

    const { result, rerender } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.payment?.id).toBe('old-jun'));

    historyById = { [commitment.id]: [paidApril, newMay, newJune] };
    paymentsState = [newMay];
    await rerender({});

    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.state.payment?.id).toBe('new-jun'));
    expect(result.current.state.viewState).toBe('ready');
  });

  it.each<LandingKey>(['onSaved', 'onDeactivated'])(
    'opens the edit sheet from the tabbed copy, whose %s lands on the list',
    async (key) => {
      await openEditFromReadyDetail();
      expectNoNavigation();

      runHostLanding(key);

      expect(router.dismissTo).toHaveBeenCalledTimes(1);
      expect(router.dismissTo).toHaveBeenCalledWith('/commitments');
      expect(router.push).not.toHaveBeenCalled();
    },
  );

  it('opens the edit sheet from the stacked copy, whose save stays on the stacked detail', async () => {
    mockPathname.current = '/stacked/commitments/commitment-1';
    mockParams.originTxId = 'tx-1';
    await openEditFromReadyDetail();

    runHostLanding('onSaved');

    expectNoNavigation();
  });

  it('a deactivate from the stacked copy pops back to the stacked transaction it came from', async () => {
    mockPathname.current = '/stacked/commitments/commitment-1';
    mockParams.originTxId = 'tx-1';
    await openEditFromReadyDetail();
    expectNoNavigation();

    runHostLanding('onDeactivated');

    expect(router.dismissTo).toHaveBeenCalledWith('/stacked/transactions/detail/tx-1');
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a deactivate from a stacked copy opened on a tabbed transaction pops every screen above the tabs', async () => {
    mockPathname.current = '/stacked/commitments/commitment-1';
    mockParams = { id: 'commitment-1', cycle: 'pay-1', originTxId: 'tx-1', originTxCopy: 'tabbed' };
    await openEditFromReadyDetail();
    expectNoNavigation();

    runHostLanding('onDeactivated');

    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a deactivate from a stacked copy with no origin steps back once', async () => {
    mockPathname.current = '/stacked/commitments/commitment-1';
    await openEditFromReadyDetail();
    expectNoNavigation();

    runHostLanding('onDeactivated');

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('completes a committed skip before an effect-driven history refresh failure', async () => {
    seedRent();
    paymentsState = [payment];
    const historyError = new Error('history refresh failed');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result, rerender } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(1);
    const owner = result.current.state.owner;

    await act(async () => result.current.confirmSkip());
    expect(result.current.state.skipConfirmVisible).toBe(true);

    mockGetPaymentsByCommitment.mockRejectedValueOnce(historyError);

    await act(async () => {
      await result.current.skipPayment();
    });

    expect(mockSkipPayment).toHaveBeenCalledWith(payment.id);
    expect(result.current.state.skipConfirmVisible).toBe(false);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[commitmentDetail] skipPayment failed',
      historyError,
    );

    paymentsState = [{ ...payment, skipped_date: TODAY }];
    await rerender({});

    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[commitmentDetail]'),
      historyError,
    );
    await waitFor(() => expect(result.current.state.viewState).toBe('refreshErrorWithData'));
    expect(useCommitmentDetailStore.getState().entries[owner].allPayments).toBe(rentHistory);
    expect(result.current.state.allPayments[0].skipped_date).toBe(TODAY);
    expect(result.current.state.skipConfirmVisible).toBe(false);
    consoleSpy.mockRestore();
  });

  it('a store publish over loaded content refreshes in place, never reading loading', async () => {
    seedRent();
    paymentsState = [payment];
    const nextPayment: CommitmentPayment = { ...payment, id: 'pay-next', due_date: '2026-06-01' };
    const refreshedHistory = [payment, nextPayment];
    const pending = deferred<CommitmentPayment[]>();
    mockGetPaymentsByCommitment
      .mockResolvedValueOnce(rentHistory)
      .mockReturnValueOnce(pending.promise);
    const seen: string[] = [];

    const { result, rerender } = await renderRecording(seen);
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const seenBeforePublish = seen.length;

    paymentsState = [{ ...payment }];
    await rerender({});

    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.allPayments).toEqual(rentHistory);
    expect(result.current.state.commitment).toEqual(commitment);

    await act(async () => {
      pending.resolve(refreshedHistory);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.state.allPayments).toHaveLength(2));
    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.payment?.id).toBe(payment.id);
    expect(seen.slice(seenBeforePublish)).not.toContain('loading');
  });

  it('a warm refresh failure keeps the content, and a successful retry clears it', async () => {
    seedRent();
    paymentsState = [payment];
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const retried = [{ ...payment }];
    mockGetPaymentsByCommitment
      .mockResolvedValueOnce(rentHistory)
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce(retried);

    const { result, rerender } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    paymentsState = [{ ...payment }];
    await rerender({});
    await waitFor(() => expect(result.current.state.viewState).toBe('refreshErrorWithData'));
    expect(result.current.state.allPayments).toEqual(rentHistory);
    expect(result.current.state.commitment).toEqual(commitment);

    await act(async () => result.current.reload());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('a route move to another commitment reads loading with no rows and drops the late result', async () => {
    seedRentAndGym();
    paymentsState = [payment, otherPayment];
    const lateRent = deferred<CommitmentPayment[]>();
    const gym = deferred<CommitmentPayment[]>();
    const lateRentRows = [{ ...payment, paid_date: TODAY }];
    mockGetPaymentsByCommitment
      .mockResolvedValueOnce(rentHistory)
      .mockReturnValueOnce(lateRent.promise)
      .mockReturnValueOnce(gym.promise);
    const seen: string[] = [];

    const { result, rerender } = await renderRecording(seen);
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const owner = result.current.state.owner;

    paymentsState = [{ ...payment }, otherPayment];
    await rerender({});
    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));

    const seenBeforeMove = seen.length;
    mockParams = { id: otherCommitment.id, cycle: otherPayment.id };
    await rerender({});
    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(3));
    expect(mockGetPaymentsByCommitment).toHaveBeenLastCalledWith(otherCommitment.id);
    expect(mockGetById).toHaveBeenLastCalledWith(otherCommitment.id);
    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.allPayments).toEqual([]);

    await act(async () => {
      lateRent.resolve(lateRentRows);
      await lateRent.promise;
    });

    expect(useCommitmentDetailStore.getState().entries[owner].allPayments).toBe(rentHistory);
    expect(result.current.state.viewState).toBe('loading');
    const seenWhileMoving = seen.slice(seenBeforeMove);
    expect(seenWhileMoving.length).toBeGreaterThan(0);
    expect(seenWhileMoving).not.toContain('ready');
    expect(seenWhileMoving).not.toContain('notFound');

    await act(async () => {
      gym.resolve(gymHistory);
      await gym.promise;
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.allPayments).toEqual(gymHistory);
    expect(result.current.state.commitment?.id).toBe(otherCommitment.id);
    expect(useCommitmentDetailStore.getState().entries[owner].commitmentId).toBe(
      otherCommitment.id,
    );
  });

  it('the cycle row reads the store status while the re-query is in flight', async () => {
    seedRent();
    paymentsState = [payment];
    const pending = deferred<CommitmentPayment[]>();
    mockGetPaymentsByCommitment
      .mockResolvedValueOnce(rentHistory)
      .mockReturnValueOnce(pending.promise);

    const { result, rerender } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    paymentsState = [{ ...payment, paid_date: TODAY }];
    await rerender({});
    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));

    expect(result.current.state.payment?.paid_date).toBe(TODAY);
    expect(result.current.state.allPayments[0].paid_date).toBe(TODAY);
    expect(
      useCommitmentDetailStore.getState().entries[result.current.state.owner].allPayments,
    ).toBe(rentHistory);
  });

  // MA-219: a pay closes the sheet to the detail, whose cycle then reads paid.
  it('reads the open cycle as paid, by the same payment id, once the store publishes its paid row', async () => {
    seedRent();
    paymentsState = [payment];
    const paidRow: CommitmentPayment = { ...payment, paid_date: TODAY, amount_paid: 5000 };
    mockGetPaymentsByCommitment.mockResolvedValueOnce(rentHistory).mockResolvedValueOnce([paidRow]);

    const { result, rerender } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.cycleCard?.statusLabel).not.toBe(Strings.commitmentsStatusPaid);

    paymentsState = [paidRow];
    await rerender({});

    await waitFor(() =>
      expect(result.current.state.cycleCard?.statusLabel).toBe(Strings.commitmentsStatusPaid),
    );
    expect(result.current.state.payment?.id).toBe(payment.id);
  });

  it('a failed skip keeps the sheet open with its error, and a retry that lands closes it', async () => {
    seedRent();
    paymentsState = [payment];
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const skipError = new Error('skip failed');
    mockSkipPayment.mockRejectedValueOnce(skipError);

    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    await act(async () => result.current.confirmSkip());

    await act(async () => {
      await result.current.skipPayment();
    });

    expect(consoleSpy).toHaveBeenCalledWith('[commitmentDetail] skipPayment failed', skipError);
    expect(result.current.state.skipConfirmVisible).toBe(true);
    expect(result.current.state.skipError).toBe(true);
    expect(result.current.state.skipBusy).toBe(false);
    expect(result.current.state.allPayments).toEqual(rentHistory);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(1);

    const pendingSkip = deferred<void>();
    mockSkipPayment.mockReturnValueOnce(pendingSkip.promise);
    let skipping: Promise<void> = Promise.resolve();
    await act(async () => {
      skipping = result.current.skipPayment();
    });

    expect(result.current.state.skipBusy).toBe(true);
    expect(result.current.state.skipError).toBe(false);

    await act(async () => {
      pendingSkip.resolve();
      await skipping;
    });

    expect(result.current.state.skipConfirmVisible).toBe(false);
    expect(result.current.state.skipBusy).toBe(false);
    expect(result.current.state.skipError).toBe(false);
    consoleSpy.mockRestore();
  });
});

describe('useCommitmentDetail facts and skeleton hint (MA-261)', () => {
  const usdCommitment: Commitment = { ...commitment, currency: Currency.USD, amount: 50 };
  const usdPayment: CommitmentPayment = { ...payment, currency: Currency.USD, amount_due: 50 };

  it('looks up the commitment’s account and reads an archived one by its name with Archived', async () => {
    seedRent();
    accountLookupById = {
      'account-1': makeTestAccount({
        id: 'account-1',
        name: 'Old CIB',
        type: AccountType.Bank,
        color: AcctTokens.lapis.rich,
        is_archived: 1,
      }),
    };

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockLoadAccountLookup).toHaveBeenCalledWith(['account-1']);
    expect(result.current.state.facts.find((fact) => fact.kind === 'account')).toMatchObject({
      value: 'Old CIB',
      badge: { label: 'Archived' },
    });
  });

  it('looks up no account and reads No account when the commitment has none', async () => {
    const noAccount: Commitment = { ...commitment, account_id: null };
    commitmentsById = { [noAccount.id]: noAccount };
    historyById = { [noAccount.id]: rentHistory };

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockLoadAccountLookup).not.toHaveBeenCalled();
    expect(result.current.state.facts.find((fact) => fact.kind === 'account')?.value).toBe(
      'No account',
    );
  });

  it('reads the USD amount fact, third, as ≈ — until the live rate loads, then at the live rate', async () => {
    commitmentsById = { [usdCommitment.id]: usdCommitment };
    historyById = { [usdCommitment.id]: [usdPayment] };
    currencyRateLoaded = false;

    const { result, rerender } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.facts[2]).toMatchObject({ kind: 'amount', value: '≈ —' });

    currencyRateLoaded = true;
    await rerender({});

    expect(result.current.state.facts[2]).toMatchObject({ kind: 'amount', value: '≈ 2,400 EGP' });
  });

  it('hints the skeleton with the store’s commitment for the route id while the detail loads', async () => {
    storeCommitments = [otherCommitment, usdCommitment];
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockImplementation(() => pending.promise);

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.loadingCommitmentHint).toBe(usdCommitment);
  });

  it('hints nothing when the store holds no commitment with the route id', async () => {
    storeCommitments = [otherCommitment];
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockImplementation(() => pending.promise);

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect('loadingCommitmentHint' in result.current.state).toBe(true);
    expect(result.current.state.loadingCommitmentHint).toBeUndefined();
    expect(result.current.state.skeletonCards).toEqual({ cycleCard: false, factRows: false });
  });

  it('hints the skeleton once the store gains the route’s commitment while the detail loads', async () => {
    storeCommitments = [otherCommitment];
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockImplementation(() => pending.promise);

    const { result, rerender } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.loadingCommitmentHint).toBeUndefined();

    storeCommitments = [otherCommitment, usdCommitment];
    await rerender({});

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.loadingCommitmentHint).toBe(usdCommitment);
  });

  it('surfaces the refresh error when the account lookup fails and leaves the account unresolved, and Retry looks it up again', async () => {
    seedRent();
    accountLookupError = true;

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('refreshErrorWithData'));
    expect(result.current.state.facts.find((fact) => fact.kind === 'account')?.value).toBe(
      'Unknown account',
    );
    expect(mockLoadAccountLookup).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(mockLoadAccountLookup).toHaveBeenCalledTimes(2));
  });
});

describe('useCommitmentDetail two copies mounted at once', () => {
  it('each copy holds its own detail and neither reloads when the other unmounts', async () => {
    seedRentAndGym();
    paymentsState = [payment, otherPayment];

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: commitment.id, cycle: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: otherCommitment.id, cycle: otherPayment.id }),
    });
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));

    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(upper.result.current.state.allPayments).toEqual(gymHistory);
    expect(lower.result.current.state.commitment?.id).toBe(commitment.id);
    expect(upper.result.current.state.commitment?.id).toBe(otherCommitment.id);

    await upper.unmount();

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);
  });

  it('two copies of the same commitment do not release each other', async () => {
    seedRent();
    paymentsState = [payment];

    const lower = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);

    await upper.unmount();

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);
  });

  it('a copy on a missing commitment resolves not found alone', async () => {
    seedRent();
    paymentsState = [payment];

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: commitment.id, cycle: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));

    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: 'commitment-missing', cycle: 'pay-missing' }),
    });
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('notFound'));

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
  });

  it('an unmounted copy leaves every store holding only the copy still mounted', async () => {
    seedRent();
    paymentsState = [payment];

    const lower = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));
    await act(async () => {
      lower.result.current.openPaySheet();
      upper.result.current.openPaySheet();
    });

    expect(Object.keys(useCommitmentDetailStore.getState().entries)).toHaveLength(2);
    expect(Object.keys(useCommitmentDetailState.getState().entries)).toHaveLength(2);
    expect(Object.keys(usePaySheetState.getState().entries)).toHaveLength(2);

    await upper.unmount();

    expect(Object.keys(useCommitmentDetailStore.getState().entries)).toHaveLength(1);
    expect(Object.keys(useCommitmentDetailState.getState().entries)).toHaveLength(1);
    expect(Object.keys(usePaySheetState.getState().entries)).toEqual([
      lower.result.current.state.owner,
    ]);

    await lower.unmount();

    expect(useCommitmentDetailStore.getState().entries).toEqual({});
    expect(useCommitmentDetailState.getState().entries).toEqual({});
    expect(usePaySheetState.getState().entries).toEqual({});
  });

  it('Mark as paid opens only its own copy pay sheet, and each copy releases its own', async () => {
    seedRentAndGym();
    paymentsState = [payment, otherPayment];

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: commitment.id, cycle: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: otherCommitment.id, cycle: otherPayment.id }),
    });
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));
    const lowerOwner = lower.result.current.state.owner;

    await act(async () => lower.result.current.openPaySheet());

    const opened = usePaySheetState.getState().entries[lowerOwner];
    expect(Object.keys(usePaySheetState.getState().entries)).toEqual([lowerOwner]);
    expect(opened.visible).toBe(true);

    await upper.unmount();

    expect(usePaySheetState.getState().entries[lowerOwner]).toBe(opened);
    expect(Object.keys(usePaySheetState.getState().entries)).toEqual([lowerOwner]);

    await lower.unmount();

    expect(usePaySheetState.getState().entries).toEqual({});
  });

  it('a read that settles after its copy unmounts writes nothing back', async () => {
    seedRent();
    paymentsState = [payment];
    const pending = deferred<CommitmentPayment[]>();
    mockGetPaymentsByCommitment.mockReturnValue(pending.promise);

    const copy = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(mockGetById).toHaveBeenCalledWith(commitment.id));
    expect(copy.result.current.state.viewState).toBe('loading');
    expect(Object.keys(useCommitmentDetailState.getState().entries)).toHaveLength(1);

    await copy.unmount();
    await act(async () => {
      pending.resolve(rentHistory);
      await pending.promise;
    });

    expect(useCommitmentDetailState.getState().entries).toEqual({});
    expect(useCommitmentDetailStore.getState().entries).toEqual({});
  });

  it('a skip that settles after its copy unmounts writes nothing back', async () => {
    seedRent();
    paymentsState = [payment];
    const pendingSkip = deferred<void>();
    mockSkipPayment.mockReturnValue(pendingSkip.promise);

    const copy = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(copy.result.current.state.viewState).toBe('ready'));
    let skipping: Promise<void> = Promise.resolve();
    await act(async () => {
      skipping = copy.result.current.skipPayment();
    });

    await copy.unmount();
    await act(async () => {
      pendingSkip.resolve();
      await skipping;
    });

    expect(useCommitmentDetailState.getState().entries).toEqual({});
    expect(useCommitmentDetailStore.getState().entries).toEqual({});
  });
});

describe('useCommitmentDetail This cycle card (MA-262)', () => {
  const paidCycle = (transactionId: string | null): CommitmentPayment => ({
    ...payment,
    paid_date: '2026-05-01',
    amount_paid: 5000,
    transaction_id: transactionId,
  });

  function seedHistory(rows: CommitmentPayment[]): void {
    commitmentsById = { [commitment.id]: commitment };
    historyById = { [commitment.id]: rows };
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 4, 8, 10));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cards an unpaid cycle with Pay and Skip, its day line read against the day it loaded on', async () => {
    seedRent();

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.cycleCard).toMatchObject({
      dayLine: '7 days late',
      action: { kind: 'paySkip' },
    });
  });

  it.each([
    ['the tab copy', '/commitments/commitment-1'],
    ['the stacked copy', '/stacked/commitments/commitment-1'],
  ])(
    'View transaction on a paid cycle pushes the stacked transaction detail from %s',
    async (_copy, pathname) => {
      mockPathname.current = pathname;
      seedHistory([paidCycle('tx-1')]);

      const { result } = await renderHook(() => useCommitmentDetail());
      await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
      expect(result.current.state.cycleCard?.action).toEqual({
        kind: 'viewTransaction',
        transactionId: 'tx-1',
      });

      await act(async () => result.current.viewTransaction());

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith('/stacked/transactions/detail/tx-1');
    },
  );

  it('View transaction on a paid cycle with no transaction pushes nothing', async () => {
    seedHistory([paidCycle(null)]);

    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.cycleCard?.action).toEqual({ kind: 'none' });

    await act(async () => result.current.viewTransaction());

    expectNoNavigation();
  });

  it('cards nothing when the commitment has no cycle row', async () => {
    seedHistory([]);

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.payment).toBeUndefined();
    expect(result.current.state).toHaveProperty('cycleCard', undefined);
  });
});

describe('useCommitmentDetail lifecycle (MA-266)', () => {
  // The faked system date is 2026-05-08, so an end date of 2026-05-07 is the day before today.
  const endedUntil: Commitment = {
    ...commitment,
    duration_type: DurationType.UntilDate,
    end_date: '2026-05-07',
    is_active: 0,
  };
  const paidRow: CommitmentPayment = {
    ...payment,
    paid_date: '2026-05-08',
    amount_paid: 5000,
    transaction_id: 'tx-9',
  };
  const skippedRow: CommitmentPayment = { ...payment, skipped_date: '2026-05-08' };

  function seed(seeded: Commitment, rows: CommitmentPayment[]): void {
    commitmentsById = { [seeded.id]: seeded };
    historyById = { [seeded.id]: rows };
  }

  function heldRows(): CommitmentPayment[] | undefined {
    return Object.values(useCommitmentDetailStore.getState().entries)[0]?.allPayments;
  }

  function paymentRowIds(rows: readonly { id: string }[]): string[] {
    return rows.map((row) => row.id);
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 4, 8, 10));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows Edit on an active commitment', async () => {
    seedRent();

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.showsEdit).toBe(true);
  });

  it('hides Edit while the detail loads', async () => {
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockImplementation(() => pending.promise);

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.showsEdit).toBe(false);
  });

  it('reads Ended with no · varies on a variable until-date commitment whose end date is the day before today, opened at a settled cycle, with no card and no Edit', async () => {
    const settled: CommitmentPayment = { ...payment, paid_date: '2026-05-01', amount_paid: 5000 };
    seed({ ...endedUntil, amount_type: AmountType.Variable }, [settled]);

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.payment?.id).toBe(payment.id);
    expect(result.current.state.hero?.badgeLabel).toBe('Ended');
    expect(result.current.state.showsEdit).toBe(false);
    expect(result.current.state.cycleCard).toBeUndefined();
  });

  it.each<[string, CommitmentPayment, { kind: string; transactionId?: string }]>([
    ['paid', paidRow, { kind: 'viewTransaction', transactionId: 'tx-9' }],
    ['skipped', skippedRow, { kind: 'none' }],
  ])(
    'keeps an ended commitment’s card at an overdue cycle with Pay and Skip and no Edit, restates it %s on the open detail with the row in Payments, and draws none opened again',
    async (_name, settledRow, action) => {
      seed(endedUntil, [payment]);

      const { result, rerender, unmount } = await renderHook(() => useCommitmentDetail());

      await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
      expect(result.current.state.cycleCard?.action).toEqual({ kind: 'paySkip' });
      expect(result.current.state.showsEdit).toBe(false);
      expect(result.current.state.hero?.badgeLabel).toBe('Ended');
      expect(result.current.state.paymentRows).toEqual([]);

      historyById = { [commitment.id]: [settledRow] };
      paymentsState = [settledRow];
      await rerender({});

      await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(heldRows()?.[0]).toBe(settledRow));
      expect(result.current.state.payment).toBe(settledRow);
      expect(result.current.state.cycleCard?.action).toEqual(action);
      expect(paymentRowIds(result.current.state.paymentRows)).toEqual([payment.id]);

      await unmount();
      const again = await renderHook(() => useCommitmentDetail());

      await waitFor(() => expect(again.result.current.state.viewState).toBe('ready'));
      expect(again.result.current.state.payment?.id).toBe(payment.id);
      expect(again.result.current.state.cycleCard).toBeUndefined();
      expect(paymentRowIds(again.result.current.state.paymentRows)).toEqual([payment.id]);
    },
  );

  it('lists the shown row under Payments on a stopped commitment at a paid cycle', async () => {
    const settled: CommitmentPayment = { ...payment, paid_date: '2026-05-01', amount_paid: 5000 };
    seed({ ...commitment, is_active: 0 }, [settled]);

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.cycleCard).toBeUndefined();
    expect(paymentRowIds(result.current.state.paymentRows)).toEqual([payment.id]);
  });

  it('leaves the shown unpaid cycle out of Payments on an active commitment', async () => {
    const earlier: CommitmentPayment = { ...payment, id: 'pay-apr', due_date: '2026-04-01' };
    seed(commitment, [earlier, payment]);

    const { result } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.cycleCard).toBeDefined();
    expect(paymentRowIds(result.current.state.paymentRows)).toEqual([earlier.id]);
  });

  it('reads no Payments rows while the detail loads', async () => {
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockImplementation(() => pending.promise);

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.paymentRows).toEqual([]);
  });

  it('keeps the card when a Pay settles an after-2 commitment whose first row was skipped, hiding Edit and reading Ended', async () => {
    const afterTwo: Commitment = {
      ...commitment,
      duration_type: DurationType.AfterCount,
      end_after_count: 2,
    };
    const firstSkipped: CommitmentPayment = {
      ...payment,
      id: 'pay-apr',
      due_date: '2026-04-01',
      paid_date: null,
      skipped_date: '2026-04-02',
    };
    const second: CommitmentPayment = { ...payment, id: 'pay-may', due_date: '2026-05-01' };
    const secondPaid: CommitmentPayment = { ...second, ...paidRow, id: 'pay-may' };
    seed(afterTwo, [firstSkipped, second]);
    mockParams = { id: commitment.id, cycle: second.id };

    const { result, rerender } = await renderHook(() => useCommitmentDetail());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.showsEdit).toBe(true);
    expect(result.current.state.cycleCard?.action).toEqual({ kind: 'paySkip' });

    historyById = { [commitment.id]: [firstSkipped, secondPaid] };
    paymentsState = [secondPaid];
    await rerender({});

    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(heldRows()?.[1]).toBe(secondPaid));
    expect(result.current.state.cycleCard?.action).toEqual({
      kind: 'viewTransaction',
      transactionId: 'tx-9',
    });
    expect(result.current.state.showsEdit).toBe(false);
    expect(result.current.state.hero?.badgeLabel).toBe('Ended');
  });

  it('draws the skeleton’s rows alone while a stopped commitment the store holds loads', async () => {
    storeCommitments = [{ ...commitment, is_active: 0 }];
    paymentsState = [payment];
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockImplementation(() => pending.promise);

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.skeletonCards).toEqual({ cycleCard: false, factRows: true });
  });
});

describe('useCommitmentDetail skeleton cycle hint (MA-267)', () => {
  beforeEach(() => {
    const pending = deferred<Commitment | undefined>();
    mockGetById.mockImplementation(() => pending.promise);
  });

  it('hints the skeleton with the store’s row for the route’s cycle while the detail loads', async () => {
    paymentsState = [otherPayment, payment];

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.loadingCycleHint).toBe(payment);
  });

  it('hints no cycle when the store holds no row with the route’s cycle', async () => {
    paymentsState = [otherPayment];

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect('loadingCycleHint' in result.current.state).toBe(true);
    expect(result.current.state.loadingCycleHint).toBeUndefined();
  });

  it('hints no cycle when the route names none', async () => {
    mockParams = { id: commitment.id };
    paymentsState = [payment, otherPayment];

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect('loadingCycleHint' in result.current.state).toBe(true);
    expect(result.current.state.loadingCycleHint).toBeUndefined();
  });

  it('hints the skeleton once the store gains the route’s cycle while the detail loads', async () => {
    paymentsState = [otherPayment];

    const { result, rerender } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.loadingCycleHint).toBeUndefined();

    paymentsState = [otherPayment, payment];
    await rerender({});

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.loadingCycleHint).toBe(payment);
  });
});
