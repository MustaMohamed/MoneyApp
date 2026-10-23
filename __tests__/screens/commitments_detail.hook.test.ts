import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createContext, createElement, useContext, type PropsWithChildren } from 'react';

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

type DetailParams = { id: string; originTxId?: string; originTxCopy?: string };

const mockGetPaymentsByCommitment = jest.fn();
const mockSkipPayment = jest.fn();
const mockPathname = { current: '/commitments/pay-1' };
const mockParamsContext = createContext<DetailParams | null>(null);
let mockParams: DetailParams = { id: 'pay-1' };
// Each copy reads the params its own wrapper supplies, so two can mount on different payments.
const mockUseParams = (): DetailParams => useContext(mockParamsContext) ?? mockParams;
const TODAY = '2026-05-08';

let commitmentsState: Commitment[] = [];
let paymentsState: CommitmentPayment[] = [];

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
    getPaymentsByCommitment: (...args: unknown[]) => mockGetPaymentsByCommitment(...args),
  },
}));

function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: commitmentsState,
    payments: paymentsState,
    today: TODAY,
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

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.current = '/commitments/pay-1';
  mockParams = { id: 'pay-1' };
  commitmentsState = [];
  paymentsState = [];
  mockGetPaymentsByCommitment.mockResolvedValue([]);
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
  commitmentsState = [commitment];
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

describe('useCommitmentDetail', () => {
  it('renders without throwing', async () => {
    await expect(renderHook(() => useCommitmentDetail())).resolves.toBeDefined();
  });

  it('payment is undefined when store has no matching payment', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(result.current.state.payment).toBeUndefined();
  });

  it('allPayments starts as empty array', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    expect(result.current.state.allPayments).toEqual([]);
  });

  it('holds loading until the history query resolves', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const pending = deferred<CommitmentPayment[]>();
    mockGetPaymentsByCommitment.mockReturnValue(pending.promise);

    const { result } = await renderHook(() => useCommitmentDetail());

    expect(result.current.state.viewState).toBe('loading');

    await act(async () => {
      pending.resolve(rentHistory);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.allPayments).toEqual(rentHistory);
  });

  it('resolves not found when the store holds no matching commitment', async () => {
    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('notFound'));
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
    mockPathname.current = '/stacked/commitments/pay-1';
    mockParams.originTxId = 'tx-1';
    await openEditFromReadyDetail();

    runHostLanding('onSaved');

    expectNoNavigation();
  });

  it('a deactivate from the stacked copy pops back to the stacked transaction it came from', async () => {
    mockPathname.current = '/stacked/commitments/pay-1';
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
    mockPathname.current = '/stacked/commitments/pay-1';
    mockParams = { id: 'pay-1', originTxId: 'tx-1', originTxCopy: 'tabbed' };
    await openEditFromReadyDetail();
    expectNoNavigation();

    runHostLanding('onDeactivated');

    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a deactivate from a stacked copy with no origin steps back once', async () => {
    mockPathname.current = '/stacked/commitments/pay-1';
    await openEditFromReadyDetail();
    expectNoNavigation();

    runHostLanding('onDeactivated');

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('completes a committed skip before an effect-driven history refresh failure', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);
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
      '[commitmentDetail] getPaymentsByCommitment failed',
      historyError,
    );
    await waitFor(() => expect(result.current.state.viewState).toBe('refreshErrorWithData'));
    expect(useCommitmentDetailStore.getState().entries[owner].allPayments).toBe(rentHistory);
    expect(result.current.state.allPayments[0].skipped_date).toBe(TODAY);
    expect(result.current.state.skipConfirmVisible).toBe(false);
    consoleSpy.mockRestore();
  });

  it('a store publish with rows on screen refreshes in place, never reading loading', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const nextPayment: CommitmentPayment = { ...payment, id: 'pay-next', due_date: '2026-06-01' };
    const refreshedHistory = [payment, nextPayment];
    const pending = deferred<CommitmentPayment[]>();
    mockGetPaymentsByCommitment
      .mockResolvedValueOnce(rentHistory)
      .mockReturnValueOnce(pending.promise);
    const seen: string[] = [];

    const { result, rerender } = await renderHook(() => {
      const hook = useCommitmentDetail();
      seen.push(hook.state.viewState);
      return hook;
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const seenBeforePublish = seen.length;

    paymentsState = [{ ...payment }];
    await rerender({});

    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.allPayments).toEqual(rentHistory);

    await act(async () => {
      pending.resolve(refreshedHistory);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.state.allPayments).toHaveLength(2));
    expect(result.current.state.viewState).toBe('ready');
    expect(seen.slice(seenBeforePublish)).not.toContain('loading');
  });

  it('a first query that fails shows the load error, and retry re-runs it', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPaymentsByCommitment
      .mockRejectedValueOnce(new Error('first load failed'))
      .mockRejectedValueOnce(new Error('retry failed'))
      .mockResolvedValueOnce(rentHistory);

    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('firstLoadError'));
    expect(result.current.state.allPayments).toEqual([]);

    await act(async () => result.current.reload());
    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.state.viewState).toBe('firstLoadError'));

    await act(async () => result.current.reload());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(3);
    expect(result.current.state.allPayments).toEqual(rentHistory);
    consoleSpy.mockRestore();
  });

  it('a warm refresh failure keeps the rows, and a successful retry clears it', async () => {
    commitmentsState = [commitment];
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

    await act(async () => result.current.reload());

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('a route move to another commitment reads loading with no rows and drops the late result', async () => {
    commitmentsState = [commitment, otherCommitment];
    paymentsState = [payment, otherPayment];
    const lateRent = deferred<CommitmentPayment[]>();
    const gym = deferred<CommitmentPayment[]>();
    const lateRentRows = [{ ...payment, paid_date: TODAY }];
    mockGetPaymentsByCommitment
      .mockResolvedValueOnce(rentHistory)
      .mockReturnValueOnce(lateRent.promise)
      .mockReturnValueOnce(gym.promise);
    const seen: string[] = [];

    const { result, rerender } = await renderHook(() => {
      const hook = useCommitmentDetail();
      seen.push(hook.state.viewState);
      return hook;
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const owner = result.current.state.owner;

    paymentsState = [{ ...payment }, otherPayment];
    await rerender({});
    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2));

    const seenBeforeMove = seen.length;
    mockParams = { id: otherPayment.id };
    await rerender({});
    await waitFor(() => expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(3));
    expect(mockGetPaymentsByCommitment).toHaveBeenLastCalledWith(otherCommitment.id);
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

    await act(async () => {
      gym.resolve(gymHistory);
      await gym.promise;
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.allPayments).toEqual(gymHistory);
    expect(useCommitmentDetailStore.getState().entries[owner].commitmentId).toBe(
      otherCommitment.id,
    );
  });

  it('the history row reads the store status while the re-query is in flight', async () => {
    commitmentsState = [commitment];
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
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);
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
  it('each copy holds its own history and neither reloads when the other unmounts', async () => {
    commitmentsState = [commitment, otherCommitment];
    paymentsState = [payment, otherPayment];
    mockGetPaymentsByCommitment.mockImplementation((commitmentId: string) =>
      Promise.resolve(commitmentId === commitment.id ? rentHistory : gymHistory),
    );

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: otherPayment.id }),
    });
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));

    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(upper.result.current.state.allPayments).toEqual(gymHistory);

    await upper.unmount();

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
    expect(mockGetPaymentsByCommitment).toHaveBeenCalledTimes(2);
  });

  it('two copies of the same payment do not release each other', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);

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

  it('a copy on a missing payment resolves not found alone', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));

    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: 'pay-missing' }),
    });
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('notFound'));

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.allPayments).toEqual(rentHistory);
  });

  it('an unmounted copy leaves every store holding only the copy still mounted', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);

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
    commitmentsState = [commitment, otherCommitment];
    paymentsState = [payment, otherPayment];
    mockGetPaymentsByCommitment.mockImplementation((commitmentId: string) =>
      Promise.resolve(commitmentId === commitment.id ? rentHistory : gymHistory),
    );

    const lower = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: payment.id }),
    });
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useCommitmentDetail(), {
      wrapper: paramsWrapper({ id: otherPayment.id }),
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

  it('a history query that settles after its copy unmounts writes nothing back', async () => {
    commitmentsState = [commitment];
    paymentsState = [payment];
    const pending = deferred<CommitmentPayment[]>();
    mockGetPaymentsByCommitment.mockReturnValue(pending.promise);

    const copy = await renderHook(() => useCommitmentDetail());
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
    commitmentsState = [commitment];
    paymentsState = [payment];
    mockGetPaymentsByCommitment.mockResolvedValue(rentHistory);
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

describe('useCommitmentDetail current cycle', () => {
  async function currentPaymentOf(history: CommitmentPayment[], routeRow: CommitmentPayment) {
    commitmentsState = [commitment];
    paymentsState = [routeRow];
    mockGetPaymentsByCommitment.mockResolvedValue(history);
    const { result } = await renderHook(() => useCommitmentDetail());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    return result.current.state;
  }

  it('is the earliest unpaid row when an overdue, a due and an upcoming row exist', async () => {
    const overdueRow: CommitmentPayment = {
      ...payment,
      id: 'cycle-overdue',
      due_date: '2026-04-01',
    };
    const dueRow: CommitmentPayment = { ...payment, due_date: TODAY };
    const upcomingRow: CommitmentPayment = {
      ...payment,
      id: 'cycle-upcoming',
      due_date: '2026-06-01',
    };

    const state = await currentPaymentOf([overdueRow, dueRow, upcomingRow], dueRow);

    expect(state.currentPayment?.id).toBe('cycle-overdue');
    expect(state.today).toBe(TODAY);
  });

  it('passes over a first row whose skipped date is set', async () => {
    const skippedRow: CommitmentPayment = {
      ...payment,
      id: 'cycle-skipped',
      due_date: '2026-04-01',
      skipped_date: '2026-04-02',
    };
    const dueRow: CommitmentPayment = { ...payment, due_date: TODAY };

    const state = await currentPaymentOf([skippedRow, dueRow], dueRow);

    expect(state.currentPayment?.id).toBe(payment.id);
  });

  it('is undefined when every row is paid or skipped', async () => {
    const paidRow: CommitmentPayment = {
      ...payment,
      due_date: '2026-04-01',
      paid_date: '2026-04-01',
    };
    const skippedRow: CommitmentPayment = {
      ...payment,
      id: 'cycle-skipped',
      due_date: TODAY,
      skipped_date: TODAY,
    };

    const state = await currentPaymentOf([paidRow, skippedRow], paidRow);

    expect(state.currentPayment).toBeUndefined();
  });
});
