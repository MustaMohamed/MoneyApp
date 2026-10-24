import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createContext, createElement, useContext, type PropsWithChildren } from 'react';

import { AmountType } from '@/constants/enums';
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
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestCategory } from '@/test_helpers/transaction';

type DetailParams = {
  id: string;
  cycle?: string | string[];
  originTxId?: string;
  originTxCopy?: string;
};

const mockGetById = jest.fn();
const mockGetPaymentsByCommitment = jest.fn();
const mockSkipPayment = jest.fn();
const mockPathname = { current: '/commitments/commitment-1' };
const mockParamsContext = createContext<DetailParams | null>(null);
let mockParams: DetailParams = { id: 'commitment-1', cycle: 'pay-1' };
// Each copy reads the params its own wrapper supplies, so two can mount on different commitments.
const mockUseParams = (): DetailParams => useContext(mockParamsContext) ?? mockParams;
const TODAY = '2026-05-08';

let paymentsState: CommitmentPayment[] = [];
let commitmentsById: Record<string, Commitment> = {};
let historyById: Record<string, CommitmentPayment[]> = {};

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
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: {
    getById: (...args: unknown[]) => mockGetById(...args),
    getPaymentsByCommitment: (...args: unknown[]) => mockGetPaymentsByCommitment(...args),
  },
}));

// The month store holds no commitments: the detail reads its own from the repository.
function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    payments: paymentsState,
    skipPayment: mockSkipPayment,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
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

  it('heroes a variable commitment starting tomorrow with the varies badge and the starts caption, leaving recurrenceLabel bare', async () => {
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
      expect(result.current.state.recurrenceLabel).toBe('Every month');
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
