import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import type { CommitmentMonthAggregate } from '@/modules/commitments/domain/commitment_month_totals';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import type {
  CommitmentMonthSnapshot,
  ICommitmentRepository,
  NewCommitmentInput,
  PaymentDetails,
  UpdateCommitmentInput,
  MarkAsPaidResult,
} from '@/modules/commitments/repositories/commitment.repository';
import {
  createCommitmentStore,
  monthAggregateKey,
} from '@/modules/commitments/store/commitment.store';
import type { CommitmentPaymentAmounts } from '@/modules/transactions/domain/transaction_amounts';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import {
  makeTestCommitment,
  makeTestHeldBucket,
  makeTestMonthAggregate,
  makeTestMonthPayment,
} from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';

const MAY = '2026-05';
const DAY_ONE = new Date(2026, 4, 8, 23, 30);
const DAY_TWO = new Date(2026, 4, 9, 0, 30);

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return makeTestCommitment({
    id: 'commitment',
    name: 'Netflix',
    amount: 250,
    category_id: 'category',
    account_id: 'account',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

function payment(overrides: Partial<CommitmentMonthPayment> = {}): CommitmentMonthPayment {
  return makeTestMonthPayment({
    id: 'payment',
    commitment_id: 'commitment',
    due_date: '2026-05-08',
    amount_due: 250,
    account_id: 'account',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

const MAY_8 = '2026-05-08';
// Built by the local constructor, so its local calendar date is MAY_8 in every zone.
const MAY_8_LOCAL = new Date(2026, 4, 8, 0, 30);

function snapshot(
  month = MAY,
  commitments = [commitment()],
  payments = [payment()],
  today = MAY_8,
): CommitmentMonthSnapshot {
  return { loadedMonth: month, today, commitments, payments };
}

function paymentAmounts(
  overrides: Partial<CommitmentPaymentAmounts> = {},
): CommitmentPaymentAmounts {
  return {
    paymentAmount: 250,
    accountNativeAmount: 250,
    accountCurrency: Currency.EGP,
    egpAmount: 250,
    exchangeRate: null,
    ...overrides,
  };
}

function markAsPaidResult(overrides: Partial<CommitmentPaymentAmounts> = {}): MarkAsPaidResult {
  return { amounts: paymentAmounts(overrides), transactionId: 'tx-1' };
}

function makeRepository(overrides: Partial<ICommitmentRepository> = {}): ICommitmentRepository {
  return {
    getById: jest.fn().mockResolvedValue(commitment()),
    add: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    getPaymentsByCommitment: jest.fn().mockResolvedValue([payment()]),
    getPaymentById: jest.fn().mockResolvedValue(payment()),
    markAsPaid: jest.fn().mockResolvedValue(markAsPaidResult()),
    markAsSkipped: jest.fn().mockResolvedValue(undefined),
    undoSkip: jest.fn().mockResolvedValue(undefined),
    runHousekeeping: jest.fn().mockResolvedValue(undefined),
    getMonthSnapshot: jest.fn().mockResolvedValue(snapshot()),
    getMonthAggregate: jest.fn(),
    ...overrides,
  };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

const newInput: NewCommitmentInput = {
  name: 'Spotify',
  amount_type: AmountType.Fixed,
  amount: 100,
  currency: Currency.EGP,
  category_id: 'category',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2026-01-01',
  account_id: 'account',
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
};

const updateInput: UpdateCommitmentInput = {
  ...newInput,
  name: 'Spotify updated',
};

const paymentDetails: PaymentDetails = {
  amount_paid: 250,
  account_id: 'account',
  paid_date: '2026-05-08',
};

describe('commitment store snapshot ownership', () => {
  it('starts cold with no loaded month or error', () => {
    const store = createCommitmentStore(makeRepository());

    expect(store.getState()).toMatchObject({
      commitments: [],
      payments: [],
      commitmentsLoaded: false,
      paymentsLoaded: false,
      loadedMonth: undefined,
      loadError: false,
      generation: 0,
      transitioningPaymentIds: [],
    });
  });

  it('publishes commitments, payments, loadedMonth and the local today atomically', async () => {
    const next = snapshot();
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(next),
    });
    const store = createCommitmentStore(repository);
    const published: unknown[] = [];
    const unsubscribe = store.subscribe((state) => {
      if (state.loadedMonth) {
        published.push({
          loadedMonth: state.loadedMonth,
          today: state.today,
          commitments: state.commitments,
          payments: state.payments,
        });
      }
    });

    await store.getState().loadMonthSnapshot(MAY, MAY_8_LOCAL);
    unsubscribe();

    expect(repository.getMonthSnapshot).toHaveBeenCalledWith(MAY, MAY_8);
    expect(published).toEqual([next]);
    expect(store.getState()).toMatchObject({
      commitmentsLoaded: true,
      paymentsLoaded: true,
      loadedMonth: MAY,
      loadError: false,
    });
  });

  it('shares concurrent same-month snapshot work for one generation', async () => {
    const request = deferred<CommitmentMonthSnapshot>();
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockReturnValue(request.promise),
    });
    const store = createCommitmentStore(repository);

    const first = store.getState().loadMonthSnapshot(MAY);
    const second = store.getState().loadMonthSnapshot(MAY);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);

    request.resolve(snapshot());
    await Promise.all([first, second]);
    expect(store.getState().loadedMonth).toBe(MAY);
  });

  it('suppresses stale month A when month B resolves first', async () => {
    const may = deferred<CommitmentMonthSnapshot>();
    const june = deferred<CommitmentMonthSnapshot>();
    const repository = makeRepository({
      getMonthSnapshot: jest.fn((month: string) => (month === MAY ? may.promise : june.promise)),
    });
    const store = createCommitmentStore(repository);

    const mayLoad = store.getState().loadMonthSnapshot(MAY);
    const juneLoad = store.getState().loadMonthSnapshot('2026-06');
    june.resolve(snapshot('2026-06', [commitment({ id: 'june' })], []));
    await juneLoad;
    may.resolve(snapshot(MAY, [commitment({ id: 'may' })], []));
    await mayLoad;

    expect(store.getState().loadedMonth).toBe('2026-06');
    expect(store.getState().commitments[0].id).toBe('june');
  });

  it('retains a warm snapshot and records an owned refresh error', async () => {
    const repository = makeRepository({
      getMonthSnapshot: jest
        .fn()
        .mockResolvedValueOnce(snapshot())
        .mockRejectedValueOnce(new Error('refresh failed')),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);

    await expect(store.getState().loadMonthSnapshot(MAY)).rejects.toThrow('refresh failed');

    expect(store.getState()).toMatchObject({
      commitments: [commitment()],
      payments: [payment()],
      loadedMonth: MAY,
      commitmentsLoaded: true,
      paymentsLoaded: true,
      loadError: true,
    });
  });

  it('changes selected month synchronously and starts one unified load', async () => {
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot('2026-06', [], [])),
    });
    const store = createCommitmentStore(repository);

    const load = store.getState().setSelectedMonth('2026-06');
    expect(store.getState().selectedMonth).toBe('2026-06');
    await load;

    expect(repository.getMonthSnapshot).toHaveBeenCalledWith(
      '2026-06',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('does not expose removed loop orchestration actions', () => {
    const state = createCommitmentStore(makeRepository()).getState();

    expect(state).not.toHaveProperty('generatePayments');
    expect(state).not.toHaveProperty('checkAndDeactivateExpired');
    expect(state).not.toHaveProperty('loadCommitments');
    expect(state).not.toHaveProperty('loadPaymentsForMonth');
  });
});

describe('commitment store housekeeping ownership', () => {
  it('keys success by local date and generation and skips repeat work', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().ensureHousekeepingCurrent(DAY_ONE);
    await store.getState().ensureHousekeepingCurrent(DAY_ONE);

    expect(repository.runHousekeeping).toHaveBeenCalledTimes(1);
    expect(repository.runHousekeeping).toHaveBeenCalledWith(DAY_ONE);
  });

  it('shares concurrent housekeeping for the same local date and generation', async () => {
    const request = deferred<void>();
    const repository = makeRepository({
      runHousekeeping: jest.fn().mockReturnValue(request.promise),
    });
    const store = createCommitmentStore(repository);

    const first = store.getState().ensureHousekeepingCurrent(DAY_ONE);
    const second = store.getState().ensureHousekeepingCurrent(DAY_ONE);
    expect(repository.runHousekeeping).toHaveBeenCalledTimes(1);
    request.resolve();
    await Promise.all([first, second]);
  });

  it('reruns on local day rollover', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().ensureHousekeepingCurrent(DAY_ONE);
    await store.getState().ensureHousekeepingCurrent(DAY_TWO);

    expect(repository.runHousekeeping).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['2026-05-08 to 05-09', new Date(2026, 4, 8, 23, 30), new Date(2026, 4, 9, 0, 30)],
    ['2026-05-31 to 06-01', new Date(2026, 4, 31, 23, 30), new Date(2026, 5, 1, 0, 30)],
    ['2028-02-28 to 02-29', new Date(2028, 1, 28, 23, 30), new Date(2028, 1, 29, 0, 30)],
  ])('reruns on the local day change %s while the UTC date holds', async (_turn, first, second) => {
    jest.spyOn(second, 'toISOString').mockReturnValue(first.toISOString());
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().ensureHousekeepingCurrent(first);
    await store.getState().ensureHousekeepingCurrent(second);

    expect(repository.runHousekeeping).toHaveBeenCalledTimes(2);
  });

  it('leaves a failed key stale so retry performs real work', async () => {
    const repository = makeRepository({
      runHousekeeping: jest
        .fn()
        .mockRejectedValueOnce(new Error('housekeeping failed'))
        .mockResolvedValueOnce(undefined),
    });
    const store = createCommitmentStore(repository);

    await expect(store.getState().ensureHousekeepingCurrent(DAY_ONE)).rejects.toThrow(
      'housekeeping failed',
    );
    await store.getState().ensureHousekeepingCurrent(DAY_ONE);

    expect(repository.runHousekeeping).toHaveBeenCalledTimes(2);
  });

  it('prevents old-generation completion from marking the new generation current', async () => {
    jest.useFakeTimers().setSystemTime(DAY_ONE);
    const oldWork = deferred<void>();
    const newWork = deferred<void>();
    const repository = makeRepository({
      runHousekeeping: jest
        .fn()
        .mockReturnValueOnce(oldWork.promise)
        .mockReturnValueOnce(newWork.promise),
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot()),
    });
    const store = createCommitmentStore(repository);

    const oldRequest = store.getState().ensureHousekeepingCurrent(DAY_ONE);
    const mutation = store.getState().addCommitment(newInput);
    await Promise.resolve();
    expect(store.getState().generation).toBe(1);
    newWork.resolve();
    await mutation;
    oldWork.resolve();
    await oldRequest;
    await store.getState().ensureHousekeepingCurrent(DAY_ONE);

    jest.useRealTimers();
    expect(repository.runHousekeeping).toHaveBeenCalledTimes(2);
  });

  it('does not let old housekeeping start a new-generation snapshot early', async () => {
    jest.useFakeTimers().setSystemTime(DAY_ONE);
    const oldWork = deferred<void>();
    const newWork = deferred<void>();
    const repository = makeRepository({
      runHousekeeping: jest
        .fn()
        .mockReturnValueOnce(oldWork.promise)
        .mockReturnValueOnce(newWork.promise),
    });
    const store = createCommitmentStore(repository);

    const firstMutation = store.getState().addCommitment(newInput);
    await Promise.resolve();
    await Promise.resolve();
    const secondMutation = store.getState().addCommitment({
      ...newInput,
      name: 'Second commitment',
    });
    await Promise.resolve();
    await Promise.resolve();

    oldWork.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const snapshotsStartedBeforeCurrentHousekeeping = (repository.getMonthSnapshot as jest.Mock)
      .mock.calls.length;

    newWork.resolve();
    await Promise.all([firstMutation, secondMutation]);
    await flushMicrotasks();

    jest.useRealTimers();
    expect(snapshotsStartedBeforeCurrentHousekeeping).toBe(0);
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
  });

  it('reset invalidates in-flight ownership and forces the same key to rerun', async () => {
    const oldWork = deferred<void>();
    const repository = makeRepository({
      runHousekeeping: jest
        .fn()
        .mockReturnValueOnce(oldWork.promise)
        .mockResolvedValueOnce(undefined),
    });
    const store = createCommitmentStore(repository);

    const oldRequest = store.getState().ensureHousekeepingCurrent(DAY_ONE);
    store.getState().reset();
    await store.getState().ensureHousekeepingCurrent(DAY_ONE);
    oldWork.resolve();
    await oldRequest;

    expect(repository.runHousekeeping).toHaveBeenCalledTimes(2);
    expect(store.getState().generation).toBe(1);
  });
});

describe('commitment store mutation invalidation', () => {
  it('resolves a committed add while failed revalidation records loadError', async () => {
    const refreshError = new Error('post-save refresh failed');
    const repository = makeRepository({
      runHousekeeping: jest.fn().mockRejectedValue(refreshError),
    });
    const store = createCommitmentStore(repository);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.getState().addCommitment(newInput)).resolves.toBeUndefined();
    await flushMicrotasks();

    expect(repository.add).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      generation: 1,
      loadError: true,
    });
    expect(consoleSpy).toHaveBeenCalledWith('[commitmentStore] revalidation failed:', refreshError);
    consoleSpy.mockRestore();
  });

  it('rejects update when required schedule regeneration fails', async () => {
    const refreshError = new Error('schedule regeneration failed');
    const repository = makeRepository({
      runHousekeeping: jest.fn().mockRejectedValue(refreshError),
    });
    const store = createCommitmentStore(repository);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.getState().updateCommitment('commitment', updateInput)).rejects.toThrow(
      refreshError,
    );

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect((repository.update as jest.Mock).mock.calls[0].slice(0, 2)).toEqual([
      'commitment',
      updateInput,
    ]);
    expect(repository.getMonthSnapshot).not.toHaveBeenCalled();
    expect(store.getState().loadError).toBe(true);
    consoleSpy.mockRestore();
  });

  it.each([
    {
      name: 'deactivate',
      persist: 'deactivate',
      run: (store: ReturnType<typeof createCommitmentStore>) =>
        store.getState().deactivateCommitment('commitment'),
    },
    {
      name: 'pay',
      persist: 'markAsPaid',
      run: (store: ReturnType<typeof createCommitmentStore>) =>
        store.getState().markAsPaid('payment', paymentDetails),
    },
    {
      name: 'skip',
      persist: 'markAsSkipped',
      run: (store: ReturnType<typeof createCommitmentStore>) =>
        store.getState().skipPayment('payment'),
    },
  ] as const)(
    'resolves committed $name persistence while failed revalidation stays nonblocking',
    async ({ persist, run }) => {
      const repository = makeRepository();
      const store = createCommitmentStore(repository);
      await store.getState().loadMonthSnapshot(MAY);
      const refreshError = new Error(`${persist} refresh failed`);
      (repository.runHousekeeping as jest.Mock).mockReset().mockRejectedValue(refreshError);
      (repository.getMonthSnapshot as jest.Mock).mockClear();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(run(store)).resolves.toBeUndefined();
      await flushMicrotasks();

      expect(repository[persist]).toHaveBeenCalledTimes(1);
      expect(repository.getMonthSnapshot).not.toHaveBeenCalled();
      expect(store.getState().loadError).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[commitmentStore] revalidation failed:',
        refreshError,
      );
      consoleSpy.mockRestore();
    },
  );

  it('increments generation before add housekeeping and snapshot refresh', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);
    (repository.runHousekeeping as jest.Mock).mockImplementation(async () => {
      expect(store.getState().generation).toBe(1);
    });

    await store.getState().addCommitment(newInput);
    await flushMicrotasks();

    expect(repository.add).toHaveBeenCalledWith(newInput);
    expect(repository.runHousekeeping).toHaveBeenCalledTimes(1);
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
  });

  it('preserves update schedule regeneration before owned housekeeping', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().updateCommitment('commitment', updateInput);
    await flushMicrotasks();

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect((repository.update as jest.Mock).mock.calls[0].slice(0, 2)).toEqual([
      'commitment',
      updateInput,
    ]);
    expect(repository.runHousekeeping).toHaveBeenCalledTimes(1);
    expect(store.getState().generation).toBe(1);
  });

  it('invalidates and reloads after deactivation', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().deactivateCommitment('commitment');
    await flushMicrotasks();

    expect(repository.deactivate).toHaveBeenCalledWith('commitment');
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(store.getState().generation).toBe(1);
  });

  it('preserves posting inputs and performs one owned housekeeping/snapshot follow-up', async () => {
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot()),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    (repository.runHousekeeping as jest.Mock).mockClear();
    (repository.getMonthSnapshot as jest.Mock).mockClear();

    await store.getState().markAsPaid('payment', paymentDetails);
    await flushMicrotasks();

    expect(repository.markAsPaid).toHaveBeenCalledWith('payment', paymentDetails);
    expect(repository.runHousekeeping).toHaveBeenCalledTimes(1);
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(store.getState().generation).toBe(1);
  });

  it('pays a row the loaded month does not hold, by id through the repository', async () => {
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot(MAY, [commitment()], [])),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);

    await expect(store.getState().markAsPaid('payment', paymentDetails)).resolves.toBeUndefined();

    expect(repository.markAsPaid).toHaveBeenCalledWith('payment', paymentDetails);
    expect(store.getState().payments).toEqual([]);
  });

  it('locks a payment against a stale Skip while Pay persistence is in flight', async () => {
    const payRequest = deferred<MarkAsPaidResult>();
    const repository = makeRepository({
      markAsPaid: jest.fn().mockReturnValue(payRequest.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);

    const payAction = store.getState().markAsPaid('payment', paymentDetails);
    const skipAction = store.getState().skipPayment('payment');

    expect(store.getState().transitioningPaymentIds).toEqual(['payment']);
    payRequest.resolve(markAsPaidResult());
    await payAction;
    await expect(skipAction).rejects.toThrow('Payment transition already in progress: payment');
    expect(repository.markAsSkipped).not.toHaveBeenCalled();
    expect(store.getState().transitioningPaymentIds).toEqual([]);
  });

  it('publishes paid status and metadata before the background snapshot refresh settles', async () => {
    const refresh = deferred<void>();
    const repository = makeRepository();
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    (repository.runHousekeeping as jest.Mock).mockReset().mockReturnValue(refresh.promise);

    await store.getState().markAsPaid('payment', paymentDetails);

    expect(store.getState().payments).toEqual([
      expect.objectContaining({
        id: 'payment',
        paid_date: paymentDetails.paid_date,
        skipped_date: null,
        amount_paid: paymentAmounts().paymentAmount,
        account_id: paymentDetails.account_id,
        transaction_id: 'tx-1',
      }),
    ]);
    expect(store.getState().payments[0]).not.toHaveProperty('status');
    expect(store.getState().transitioningPaymentIds).toEqual([]);

    refresh.resolve();
    await flushMicrotasks();
  });

  it('S-01: patches the amount the repository resolved, not the raw input', async () => {
    const refresh = deferred<void>();
    const repository = makeRepository({
      markAsPaid: jest.fn().mockResolvedValue(markAsPaidResult({ paymentAmount: 11 })),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    (repository.runHousekeeping as jest.Mock).mockReset().mockReturnValue(refresh.promise);

    await store.getState().markAsPaid('payment', { ...paymentDetails, amount_paid: 10.999 });

    expect(store.getState().payments[0].amount_paid).toBe(11);

    refresh.resolve();
    await flushMicrotasks();
  });

  it('patches the paid row with the EGP amount the repository resolved', async () => {
    const refresh = deferred<void>();
    const repository = makeRepository({
      getMonthSnapshot: jest
        .fn()
        .mockResolvedValue(
          snapshot(
            MAY,
            [commitment({ currency: Currency.USD, amount: 10 })],
            [payment({ currency: Currency.USD, amount_due: 10 })],
          ),
        ),
      markAsPaid: jest.fn().mockResolvedValue(
        markAsPaidResult({
          paymentAmount: 10,
          accountNativeAmount: 505,
          egpAmount: 505,
          exchangeRate: 50.5,
        }),
      ),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    expect(store.getState().payments[0].paid_egp_amount).toBeNull();
    (repository.runHousekeeping as jest.Mock).mockReset().mockReturnValue(refresh.promise);

    await store.getState().markAsPaid('payment', { ...paymentDetails, amount_paid: 10 });

    expect(store.getState().payments[0].paid_egp_amount).toBe(505);

    refresh.resolve();
    await flushMicrotasks();
  });

  it('keeps the resolved amount after the background revalidation rejects', async () => {
    const refreshError = new Error('post-pay refresh failed');
    const repository = makeRepository({
      // 10.999 in, 11 out, so a patch keeping the raw input is distinguishable from the resolved.
      markAsPaid: jest.fn().mockResolvedValue(markAsPaidResult({ paymentAmount: 11 })),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    (repository.runHousekeeping as jest.Mock).mockReset().mockRejectedValue(refreshError);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await store.getState().markAsPaid('payment', { ...paymentDetails, amount_paid: 10.999 });
    await flushMicrotasks();

    // `revalidateAfterMutation` is fire-and-forget with a log-only catch, so this patch is final.
    expect(store.getState().payments[0].amount_paid).toBe(11);
    expect(store.getState().payments[0].transaction_id).toBe('tx-1');
    consoleSpy.mockRestore();
  });

  it('invalidates and reloads once after skipping', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().skipPayment('payment');
    await flushMicrotasks();

    expect(repository.markAsSkipped).toHaveBeenCalledWith(
      'payment',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(store.getState().generation).toBe(1);
  });

  it('skips with the local calendar date on the repository and on the published copy', async () => {
    const refresh = deferred<void>();
    const repository = makeRepository();
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY, MAY_8_LOCAL);
    (repository.runHousekeeping as jest.Mock).mockReset().mockReturnValue(refresh.promise);

    await store.getState().skipPayment('payment', MAY_8_LOCAL);

    expect(repository.markAsSkipped).toHaveBeenCalledWith(
      'payment',
      MAY_8,
      MAY_8_LOCAL.toISOString(),
    );
    expect(store.getState().payments).toEqual([
      expect.objectContaining({
        id: 'payment',
        paid_date: null,
        skipped_date: MAY_8,
        updated_at: MAY_8_LOCAL.toISOString(),
      }),
    ]);

    refresh.resolve();
    await flushMicrotasks();
  });

  it('does not invalidate generation when persistence fails', async () => {
    const repository = makeRepository({
      add: jest.fn().mockRejectedValue(new Error('add failed')),
    });
    const store = createCommitmentStore(repository);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.getState().addCommitment(newInput)).rejects.toThrow('add failed');

    expect(store.getState().generation).toBe(0);
    expect(repository.runHousekeeping).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('commitment store transaction write announcement', () => {
  it('announces once when the payment writes a transaction row', async () => {
    const announce = jest.fn();
    const store = createCommitmentStore(makeRepository(), announce);
    await store.getState().loadMonthSnapshot(MAY);

    await store.getState().markAsPaid('payment', paymentDetails);
    await flushMicrotasks();

    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('does not announce when the payment fails', async () => {
    const announce = jest.fn();
    const repository = makeRepository({
      markAsPaid: jest.fn().mockRejectedValue(new Error('pay failed')),
    });
    const store = createCommitmentStore(repository, announce);
    await store.getState().loadMonthSnapshot(MAY);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.getState().markAsPaid('payment', paymentDetails)).rejects.toThrow(
      'pay failed',
    );

    expect(repository.markAsPaid).toHaveBeenCalledTimes(1);
    expect(announce).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not announce when a payment is skipped', async () => {
    const announce = jest.fn();
    const store = createCommitmentStore(makeRepository(), announce);
    await store.getState().loadMonthSnapshot(MAY);

    await store.getState().skipPayment('payment');
    await flushMicrotasks();

    expect(announce).not.toHaveBeenCalled();
  });

  it('raises the transaction store mutation version by default', async () => {
    const store = createCommitmentStore(makeRepository());
    await store.getState().loadMonthSnapshot(MAY);
    const beforeVersion = useTransactionStore.getState().mutationVersion;

    await store.getState().markAsPaid('payment', paymentDetails);
    await flushMicrotasks();

    expect(useTransactionStore.getState().mutationVersion).toBe(beforeVersion + 1);
  });
});

describe('commitment store shape', () => {
  it('does not expose counts or totals folded over loaded rows', () => {
    const state = createCommitmentStore(makeRepository()).getState();

    expect(state).not.toHaveProperty('getPaidCount');
    expect(state).not.toHaveProperty('getTotalCount');
    expect(state).not.toHaveProperty('getTotalMonthlyCommitted');
  });
});

describe('commitment store undoSkip', () => {
  const skipped = payment({ skipped_date: MAY_8 });

  it('undoes with the local calendar date and clears the published skip', async () => {
    const refresh = deferred<void>();
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot(MAY, [commitment()], [skipped])),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY, MAY_8_LOCAL);
    (repository.runHousekeeping as jest.Mock).mockReset().mockReturnValue(refresh.promise);

    await store.getState().undoSkip('payment', MAY_8_LOCAL);

    expect(repository.undoSkip).toHaveBeenCalledWith('payment', MAY_8, MAY_8_LOCAL.toISOString());
    expect(store.getState().payments).toEqual([
      expect.objectContaining({ id: 'payment', paid_date: null, skipped_date: null }),
    ]);
    expect(store.getState().transitioningPaymentIds).toEqual([]);

    refresh.resolve();
    await flushMicrotasks();
  });

  it('rethrows a refused undo and leaves the published skip set', async () => {
    const refusal = new Error('undo refused');
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot(MAY, [commitment()], [skipped])),
      undoSkip: jest.fn().mockRejectedValue(refusal),
    });
    const store = createCommitmentStore(repository);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await store.getState().loadMonthSnapshot(MAY, MAY_8_LOCAL);

    await expect(store.getState().undoSkip('payment', MAY_8_LOCAL)).rejects.toThrow(refusal);

    expect(store.getState().payments).toEqual([
      expect.objectContaining({ id: 'payment', skipped_date: MAY_8 }),
    ]);
    expect(store.getState().transitioningPaymentIds).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('refuses an undo while a pay on the same row is in flight, with no repository call', async () => {
    const payRequest = deferred<MarkAsPaidResult>();
    const repository = makeRepository({
      markAsPaid: jest.fn().mockReturnValue(payRequest.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);

    const payAction = store.getState().markAsPaid('payment', paymentDetails);
    const undoAction = store.getState().undoSkip('payment', MAY_8_LOCAL);

    await expect(undoAction).rejects.toThrow('Payment transition already in progress: payment');
    expect(repository.undoSkip).not.toHaveBeenCalled();
    payRequest.resolve(markAsPaidResult());
    await payAction;
  });
});

describe('commitment store month aggregate', () => {
  const JUNE = '2026-06';
  const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
  type Store = ReturnType<typeof createCommitmentStore>;

  function monthAggregate(paidEgp = 1200): CommitmentMonthAggregate {
    return makeTestMonthAggregate({
      paid: { egp: paidEgp, count: 1 },
      due: makeTestHeldBucket({ egp: 250, count: 1 }),
    });
  }

  function flushTasks() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useRealTimers();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('keys the slot by month and account', () => {
    expect(monthAggregateKey(MAY, undefined)).toBe('2026-05|');
    expect(monthAggregateKey(MAY, 'account')).toBe('2026-05|account');
  });

  it('runs housekeeping, reads the aggregate for the local today and publishes the slot', async () => {
    const aggregate = monthAggregate();
    const repository = makeRepository({
      getMonthAggregate: jest.fn().mockResolvedValue(aggregate),
    });
    const store = createCommitmentStore(repository);

    await store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);

    expect(repository.runHousekeeping).toHaveBeenCalledWith(MAY_8_LOCAL);
    expect(repository.getMonthAggregate).toHaveBeenCalledWith(MAY, MAY_8, undefined);
    expect((repository.runHousekeeping as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (repository.getMonthAggregate as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(store.getState().monthAggregate).toEqual({
      key: monthAggregateKey(MAY, undefined),
      aggregate,
    });
    expect(store.getState().monthAggregateErrorKey).toBeUndefined();
  });

  it('reads and keys the slot by the one account passed', async () => {
    const aggregate = monthAggregate();
    const repository = makeRepository({
      getMonthAggregate: jest.fn().mockResolvedValue(aggregate),
    });
    const store = createCommitmentStore(repository);

    await store.getState().loadMonthAggregate(MAY, 'account', MAY_8_LOCAL);

    expect(repository.getMonthAggregate).toHaveBeenCalledWith(MAY, MAY_8, 'account');
    expect(store.getState().monthAggregate).toEqual({
      key: monthAggregateKey(MAY, 'account'),
      aggregate,
    });
  });

  it('resolves a failed first load with the error key set, while the rows still publish', async () => {
    const repository = makeRepository({
      getMonthAggregate: jest.fn().mockRejectedValue(new Error('aggregate failed')),
    });
    const store = createCommitmentStore(repository);

    await expect(
      Promise.all([
        store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL),
        store.getState().loadMonthSnapshot(MAY, MAY_8_LOCAL),
      ]),
    ).resolves.toEqual([undefined, undefined]);

    expect(store.getState().monthAggregateErrorKey).toBe(monthAggregateKey(MAY, undefined));
    expect(store.getState().monthAggregate).toBeUndefined();
    expect(store.getState().payments).toEqual([payment()]);
    expect(store.getState().paymentsLoaded).toBe(true);
    expect(store.getState().loadError).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('keeps the error key and no slot while the same month and account load again', async () => {
    const retry = deferred<CommitmentMonthAggregate>();
    const aggregate = monthAggregate();
    const repository = makeRepository({
      getMonthAggregate: jest
        .fn()
        .mockRejectedValueOnce(new Error('aggregate failed'))
        .mockReturnValueOnce(retry.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);

    const reload = store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    await flushTasks();

    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(2);
    expect(store.getState().monthAggregateErrorKey).toBe(monthAggregateKey(MAY, undefined));
    expect(store.getState().monthAggregate).toBeUndefined();

    retry.resolve(aggregate);
    await reload;

    expect(store.getState().monthAggregate).toEqual({
      key: monthAggregateKey(MAY, undefined),
      aggregate,
    });
    expect(store.getState().monthAggregateErrorKey).toBeUndefined();
  });

  it('keeps the held slot while a reload runs', async () => {
    const reloadRequest = deferred<CommitmentMonthAggregate>();
    const next = monthAggregate(1500);
    const repository = makeRepository({
      getMonthAggregate: jest
        .fn()
        .mockResolvedValueOnce(monthAggregate())
        .mockReturnValueOnce(reloadRequest.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    const held = store.getState().monthAggregate;

    const reload = store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    await flushTasks();

    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(2);
    expect(held).toBeDefined();
    expect(store.getState().monthAggregate).toBe(held);

    reloadRequest.resolve(next);
    await reload;

    expect(store.getState().monthAggregate).toEqual({
      key: monthAggregateKey(MAY, undefined),
      aggregate: next,
    });
  });

  it('keeps the held slot when a reload fails, and a later success clears the error key', async () => {
    const next = monthAggregate(1500);
    const repository = makeRepository({
      getMonthAggregate: jest
        .fn()
        .mockResolvedValueOnce(monthAggregate())
        .mockRejectedValueOnce(new Error('reload failed'))
        .mockResolvedValueOnce(next),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    const held = store.getState().monthAggregate;

    await store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);

    expect(held).toBeDefined();
    expect(store.getState().monthAggregate).toBe(held);
    expect(store.getState().monthAggregateErrorKey).toBe(monthAggregateKey(MAY, undefined));

    await store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);

    expect(store.getState().monthAggregate).toEqual({
      key: monthAggregateKey(MAY, undefined),
      aggregate: next,
    });
    expect(store.getState().monthAggregateErrorKey).toBeUndefined();
  });

  it('drops a stale month that resolves after the newer month', async () => {
    const may = deferred<CommitmentMonthAggregate>();
    const june = deferred<CommitmentMonthAggregate>();
    const juneAggregate = monthAggregate(900);
    const repository = makeRepository({
      getMonthAggregate: jest.fn((month: string) => (month === MAY ? may.promise : june.promise)),
    });
    const store = createCommitmentStore(repository);

    const mayLoad = store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    const juneLoad = store.getState().loadMonthAggregate(JUNE, undefined, MAY_8_LOCAL);
    await flushTasks();
    june.resolve(juneAggregate);
    await juneLoad;
    may.resolve(monthAggregate(100));
    await mayLoad;

    expect(store.getState().monthAggregate).toEqual({
      key: monthAggregateKey(JUNE, undefined),
      aggregate: juneAggregate,
    });
  });

  const writes: [string, (store: Store) => Promise<void>][] = [
    ['markAsPaid', (store) => store.getState().markAsPaid('payment', paymentDetails)],
    ['skipPayment', (store) => store.getState().skipPayment('payment', MAY_8_LOCAL)],
    ['undoSkip', (store) => store.getState().undoSkip('payment', MAY_8_LOCAL)],
    ['addCommitment', (store) => store.getState().addCommitment(newInput)],
    ['deactivateCommitment', (store) => store.getState().deactivateCommitment('commitment')],
    ['updateCommitment', (store) => store.getState().updateCommitment('commitment', updateInput)],
  ];

  it.each(writes)(
    'reads the aggregate again after %s once a load has set the scope, and not before',
    async (_name, write) => {
      const repository = makeRepository({
        getMonthAggregate: jest.fn().mockResolvedValue(monthAggregate()),
      });
      const store = createCommitmentStore(repository);
      await store.getState().setSelectedMonth(MAY);

      await write(store);
      await flushTasks();
      expect(repository.getMonthAggregate).not.toHaveBeenCalled();

      await store.getState().loadMonthAggregate(MAY, 'account', MAY_8_LOCAL);
      (repository.getMonthAggregate as jest.Mock).mockClear();

      await write(store);
      await flushTasks();

      expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);
      expect(repository.getMonthAggregate).toHaveBeenCalledWith(
        MAY,
        expect.stringMatching(LOCAL_DATE),
        'account',
      );
    },
  );

  it('clears the slot and the error key on reset, and forgets the scope', async () => {
    const repository = makeRepository({
      getMonthAggregate: jest
        .fn()
        .mockResolvedValueOnce(monthAggregate())
        .mockRejectedValueOnce(new Error('aggregate failed')),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    await store.getState().loadMonthAggregate(JUNE, undefined, MAY_8_LOCAL);
    expect(store.getState().monthAggregate).toBeDefined();
    expect(store.getState().monthAggregateErrorKey).toBe(monthAggregateKey(JUNE, undefined));

    store.getState().reset();

    expect(store.getState().monthAggregate).toBeUndefined();
    expect(store.getState().monthAggregateErrorKey).toBeUndefined();

    (repository.getMonthAggregate as jest.Mock).mockClear();
    await store.getState().markAsPaid('payment', paymentDetails);
    await flushTasks();
    expect(repository.getMonthAggregate).not.toHaveBeenCalled();
  });

  it("discards a read made before a write, through the write's aggregate reload", async () => {
    const beforeWrite = deferred<CommitmentMonthAggregate>();
    const afterWrite = deferred<CommitmentMonthAggregate>();
    const repository = makeRepository({
      getMonthAggregate: jest
        .fn()
        .mockReturnValueOnce(beforeWrite.promise)
        .mockReturnValueOnce(afterWrite.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().setSelectedMonth(MAY);

    const load = store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    await flushTasks();
    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);

    await store.getState().markAsPaid('payment', paymentDetails);
    await flushTasks();
    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(2);

    beforeWrite.resolve(monthAggregate());
    await load;

    expect(store.getState().monthAggregate).toBeUndefined();
    expect(store.getState().monthAggregateErrorKey).toBeUndefined();
  });

  it('publishes nothing from a load that was in flight at reset', async () => {
    const request = deferred<CommitmentMonthAggregate>();
    const repository = makeRepository({
      getMonthAggregate: jest.fn().mockReturnValue(request.promise),
    });
    const store = createCommitmentStore(repository);

    const load = store.getState().loadMonthAggregate(MAY, undefined, MAY_8_LOCAL);
    await flushTasks();
    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);

    store.getState().reset();
    request.resolve(monthAggregate());
    await load;

    expect(store.getState().monthAggregate).toBeUndefined();
  });
});

describe('commitment store focus gate', () => {
  type Store = ReturnType<typeof createCommitmentStore>;

  const MORNING = new Date(2026, 4, 8, 8);
  const EVENING = new Date(2026, 4, 8, 23, 59);
  const aggregate = makeTestMonthAggregate({ due: makeTestHeldBucket({ egp: 250, count: 1 }) });

  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useRealTimers();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function flushTasks() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function gateRepository() {
    const reads = { failing: false };
    const read = <T>(value: T) =>
      reads.failing ? Promise.reject(new Error('read failed')) : Promise.resolve(value);
    const repository = makeRepository({
      getMonthSnapshot: jest.fn(() => read(snapshot())),
      getMonthAggregate: jest.fn(() => read(aggregate)),
    });
    return { repository, reads };
  }

  function clearReads(repository: ICommitmentRepository) {
    jest.mocked(repository.runHousekeeping).mockClear();
    jest.mocked(repository.getMonthSnapshot).mockClear();
    jest.mocked(repository.getMonthAggregate).mockClear();
  }

  async function landedStore(now = MORNING) {
    const { repository, reads } = gateRepository();
    const store = createCommitmentStore(repository, jest.fn());
    store.setState({ selectedMonth: MAY });
    await store.getState().loadMonthSnapshot(MAY, now);
    await store.getState().loadMonthAggregate(MAY, undefined, now);
    clearReads(repository);
    return { store, repository, reads };
  }

  function ensureBoth(store: Store, now: Date) {
    return Promise.all([
      store.getState().ensureMonthSnapshot(MAY, now),
      store.getState().ensureMonthAggregate(MAY, undefined, now),
    ]);
  }

  it('reads nothing and publishes nothing on the same local day and month after a landing', async () => {
    const { store, repository } = await landedStore(MORNING);
    const published = jest.fn();
    const unsubscribe = store.subscribe(published);

    await ensureBoth(store, EVENING);
    unsubscribe();

    expect(repository.runHousekeeping).not.toHaveBeenCalled();
    expect(repository.getMonthSnapshot).not.toHaveBeenCalled();
    expect(repository.getMonthAggregate).not.toHaveBeenCalled();
    expect(published).not.toHaveBeenCalled();
  });

  it.each([
    {
      turn: '05-08 to 05-09',
      before: new Date(2026, 4, 8, 23, 30),
      after: new Date(2026, 4, 9, 0, 30),
      today: '2026-05-09',
    },
    {
      turn: '05-31 to 06-01',
      before: new Date(2026, 4, 31, 23, 30),
      after: new Date(2026, 5, 1, 0, 30),
      today: '2026-06-01',
    },
    {
      turn: '2028-02-28 to 02-29',
      before: new Date(2028, 1, 28, 23, 30),
      after: new Date(2028, 1, 29, 0, 30),
      today: '2028-02-29',
    },
    {
      turn: '2028-02-29 to 03-01',
      before: new Date(2028, 1, 29, 23, 30),
      after: new Date(2028, 2, 1, 0, 30),
      today: '2028-03-01',
    },
  ])('reopens both at the local day change $turn', async ({ before, after, today }) => {
    const { store, repository } = await landedStore(before);

    await ensureBoth(store, after);

    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(repository.getMonthSnapshot).toHaveBeenCalledWith(MAY, today);
    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);
    expect(repository.getMonthAggregate).toHaveBeenCalledWith(MAY, today, undefined);
  });

  const writes: [string, (store: Store) => Promise<void>][] = [
    ['Add', (store) => store.getState().addCommitment(newInput)],
    ['Edit', (store) => store.getState().updateCommitment('commitment', updateInput)],
    ['Stop', (store) => store.getState().deactivateCommitment('commitment')],
    ['Pay', (store) => store.getState().markAsPaid('payment', paymentDetails)],
    ['Skip', (store) => store.getState().skipPayment('payment', MORNING)],
    ['Undo', (store) => store.getState().undoSkip('payment', MORNING)],
    ['announceExternalWrite', async (store) => store.getState().announceExternalWrite()],
  ];

  it.each(writes)(
    '%s with no later landing reopens both, and a read after it closes them',
    async (_name, write) => {
      const { store, repository, reads } = await landedStore();

      reads.failing = true;
      await write(store).catch(() => undefined);
      await flushTasks();
      reads.failing = false;
      clearReads(repository);

      await ensureBoth(store, EVENING);

      expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
      expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);

      clearReads(repository);
      await ensureBoth(store, EVENING);

      expect(repository.getMonthSnapshot).not.toHaveBeenCalled();
      expect(repository.getMonthAggregate).not.toHaveBeenCalled();
    },
  );

  it('drops a read in flight at announceExternalWrite, and the next ensure re-queries', async () => {
    const heldRows = deferred<CommitmentMonthSnapshot>();
    const heldFigures = deferred<CommitmentMonthAggregate>();
    const { repository } = gateRepository();
    jest.mocked(repository.getMonthSnapshot).mockReturnValueOnce(heldRows.promise);
    jest.mocked(repository.getMonthAggregate).mockReturnValueOnce(heldFigures.promise);
    const store = createCommitmentStore(repository, jest.fn());

    const inFlight = ensureBoth(store, MORNING);
    await flushTasks();
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);

    store.getState().announceExternalWrite();
    const published = jest.fn();
    const unsubscribe = store.subscribe(published);
    heldRows.resolve(snapshot());
    heldFigures.resolve(aggregate);
    await inFlight;
    unsubscribe();

    expect(published).not.toHaveBeenCalled();
    expect(store.getState().loadedMonth).toBeUndefined();
    clearReads(repository);

    await ensureBoth(store, MORNING);

    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);
  });

  it('shares one repository call and one publication with an ensure during a read', async () => {
    const heldRows = deferred<CommitmentMonthSnapshot>();
    const heldFigures = deferred<CommitmentMonthAggregate>();
    const { repository } = gateRepository();
    jest.mocked(repository.getMonthSnapshot).mockReturnValueOnce(heldRows.promise);
    jest.mocked(repository.getMonthAggregate).mockReturnValueOnce(heldFigures.promise);
    const store = createCommitmentStore(repository, jest.fn());
    const published = jest.fn();
    const unsubscribe = store.subscribe(published);

    const first = ensureBoth(store, MORNING);
    await flushTasks();
    const second = ensureBoth(store, MORNING);
    await flushTasks();
    heldRows.resolve(snapshot());
    heldFigures.resolve(aggregate);
    await Promise.all([first, second]);
    unsubscribe();

    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);
    // One for the rows and one for the figures.
    expect(published).toHaveBeenCalledTimes(2);
  });

  it('re-queries at the next ensure after a failed forced snapshot read', async () => {
    const { store, repository, reads } = await landedStore();
    reads.failing = true;
    await expect(store.getState().loadMonthSnapshot(MAY, MORNING)).rejects.toThrow('read failed');
    reads.failing = false;
    clearReads(repository);

    await store.getState().ensureMonthSnapshot(MAY, MORNING);

    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
  });

  it('re-queries at the next ensure after a failed aggregate', async () => {
    const { store, repository, reads } = await landedStore();
    reads.failing = true;
    await store.getState().loadMonthAggregate(MAY, undefined, MORNING);
    reads.failing = false;
    clearReads(repository);

    await store.getState().ensureMonthAggregate(MAY, undefined, MORNING);

    expect(repository.getMonthAggregate).toHaveBeenCalledTimes(1);
  });

  it('ensureMonthSnapshot rejects on a failed read and ensureMonthAggregate never does', async () => {
    const { repository, reads } = gateRepository();
    reads.failing = true;
    const store = createCommitmentStore(repository, jest.fn());

    await expect(store.getState().ensureMonthSnapshot(MAY, MORNING)).rejects.toThrow('read failed');
    await expect(
      store.getState().ensureMonthAggregate(MAY, undefined, MORNING),
    ).resolves.toBeUndefined();
  });

  it('reads a month the store does not hold', async () => {
    const { store, repository } = await landedStore();

    await store.getState().ensureMonthSnapshot('2026-06', MORNING);

    expect(repository.getMonthSnapshot).toHaveBeenCalledWith('2026-06', MAY_8);
  });

  it('reads a chip the store does not hold, and a chip back during that read ends on the held key', async () => {
    const { store, repository } = await landedStore();
    const chipRead = deferred<CommitmentMonthAggregate>();
    const backAgain = makeTestMonthAggregate({ paid: { egp: 1500, count: 1 } });
    jest
      .mocked(repository.getMonthAggregate)
      .mockImplementation((_month, _today, accountId) =>
        accountId === 'account' ? chipRead.promise : Promise.resolve(backAgain),
      );

    const chip = store.getState().ensureMonthAggregate(MAY, 'account', MORNING);
    await flushTasks();
    expect(repository.getMonthAggregate).toHaveBeenCalledWith(MAY, MAY_8, 'account');

    await store.getState().ensureMonthAggregate(MAY, undefined, MORNING);
    chipRead.resolve(aggregate);
    await chip;

    expect(repository.getMonthAggregate).toHaveBeenCalledWith(MAY, MAY_8, undefined);
    expect(store.getState().monthAggregate).toEqual({
      key: monthAggregateKey(MAY, undefined),
      aggregate: backAgain,
    });
  });

  it('publishes a read after a landing once, when it settles', async () => {
    const { store, repository } = await landedStore();
    const read = deferred<CommitmentMonthSnapshot>();
    jest.mocked(repository.getMonthSnapshot).mockReturnValueOnce(read.promise);
    const published = jest.fn();
    const unsubscribe = store.subscribe(published);

    const load = store.getState().loadMonthSnapshot(MAY, MORNING);
    await flushTasks();
    expect(published).not.toHaveBeenCalled();

    read.resolve(snapshot());
    await load;
    unsubscribe();

    expect(published).toHaveBeenCalledTimes(1);
  });

  it('publishes a failed read after a landing once, when it settles', async () => {
    const { store, repository } = await landedStore();
    const read = deferred<CommitmentMonthSnapshot>();
    jest.mocked(repository.getMonthSnapshot).mockReturnValueOnce(read.promise);
    const published = jest.fn();
    const unsubscribe = store.subscribe(published);

    const load = store.getState().loadMonthSnapshot(MAY, MORNING);
    await flushTasks();
    expect(published).not.toHaveBeenCalled();

    read.reject(new Error('read failed'));
    await expect(load).rejects.toThrow('read failed');
    unsubscribe();

    expect(published).toHaveBeenCalledTimes(1);
    expect(store.getState().loadError).toBe(true);
  });

  it('publishes loadError false before the repository resolves a read after a failure', async () => {
    const { store, repository, reads } = await landedStore();
    reads.failing = true;
    await expect(store.getState().loadMonthSnapshot(MAY, MORNING)).rejects.toThrow('read failed');
    reads.failing = false;
    const read = deferred<CommitmentMonthSnapshot>();
    jest.mocked(repository.getMonthSnapshot).mockReturnValueOnce(read.promise);
    const published = jest.fn();
    const unsubscribe = store.subscribe(published);

    const load = store.getState().loadMonthSnapshot(MAY, MORNING);
    await flushTasks();

    expect(published).toHaveBeenCalledTimes(1);
    expect(published.mock.calls[0][0]).toMatchObject({ loadError: false });

    read.resolve(snapshot());
    await load;
    unsubscribe();

    expect(published).toHaveBeenCalledTimes(2);
  });
});
