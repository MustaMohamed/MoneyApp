import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import type {
  CommitmentMonthSnapshot,
  ICommitmentRepository,
  NewCommitmentInput,
  PaymentDetails,
  UpdateCommitmentInput,
} from '@/modules/commitments/repositories/commitment.repository';
import { createCommitmentStore } from '@/modules/commitments/store/commitment.store';

const MAY = '2026-05';
const DAY_ONE = new Date('2026-05-08T23:30:00.000Z');
const DAY_TWO = new Date('2026-05-09T00:30:00.000Z');

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'commitment',
    name: 'Netflix',
    amount_type: AmountType.Fixed,
    amount: 250,
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
    is_active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function payment(overrides: Partial<CommitmentPayment> = {}): CommitmentPayment {
  return {
    id: 'payment',
    commitment_id: 'commitment',
    due_date: '2026-05-08',
    paid_date: null,
    skipped_date: null,
    amount_due: 250,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: 'account',
    transaction_id: null,
    status: CommitmentPaymentStatus.Due,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function snapshot(
  month = MAY,
  commitments = [commitment()],
  payments = [payment()],
): CommitmentMonthSnapshot {
  return { loadedMonth: month, commitments, payments };
}

function makeRepository(overrides: Partial<ICommitmentRepository> = {}): ICommitmentRepository {
  return {
    getAll: jest.fn().mockResolvedValue([commitment()]),
    getById: jest.fn().mockResolvedValue(commitment()),
    add: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    getPaymentsForMonth: jest.fn().mockResolvedValue([payment()]),
    getPaymentsByCommitment: jest.fn().mockResolvedValue([payment()]),
    getPaymentById: jest.fn().mockResolvedValue(payment()),
    getLastPaidPayment: jest.fn().mockResolvedValue(undefined),
    getPaidCount: jest.fn().mockResolvedValue(0),
    getExistingDueDates: jest.fn().mockResolvedValue([]),
    insertPayments: jest.fn().mockResolvedValue(undefined),
    deleteUnpaidPayments: jest.fn().mockResolvedValue(undefined),
    markAsPaid: jest.fn().mockResolvedValue(undefined),
    markAsSkipped: jest.fn().mockResolvedValue(undefined),
    runHousekeeping: jest.fn().mockResolvedValue(undefined),
    getMonthSnapshot: jest.fn().mockResolvedValue(snapshot()),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
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
      loading: false,
      loadError: false,
      generation: 0,
      transitioningPaymentIds: [],
    });
  });

  it('publishes commitments, payments, and loadedMonth atomically', async () => {
    const next = snapshot();
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(next),
    });
    const store = createCommitmentStore(repository);
    const published: CommitmentMonthSnapshot[] = [];
    const unsubscribe = store.subscribe((state) => {
      if (state.loadedMonth) {
        published.push({
          loadedMonth: state.loadedMonth,
          commitments: state.commitments,
          payments: state.payments,
        });
      }
    });

    await store.getState().loadMonthSnapshot(MAY);
    unsubscribe();

    expect(published).toEqual([next]);
    expect(store.getState()).toMatchObject({
      commitmentsLoaded: true,
      paymentsLoaded: true,
      loadedMonth: MAY,
      loading: false,
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
      loading: false,
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

    expect(repository.getMonthSnapshot).toHaveBeenCalledWith('2026-06');
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
  it('keys success by UTC date and generation and skips repeat work', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().ensureHousekeepingCurrent(DAY_ONE);
    await store.getState().ensureHousekeepingCurrent(DAY_ONE);

    expect(repository.runHousekeeping).toHaveBeenCalledTimes(1);
    expect(repository.runHousekeeping).toHaveBeenCalledWith(DAY_ONE);
  });

  it('shares concurrent housekeeping for the same UTC date and generation', async () => {
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

  it('reruns on UTC day rollover', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().ensureHousekeepingCurrent(DAY_ONE);
    await store.getState().ensureHousekeepingCurrent(DAY_TWO);

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
      loading: false,
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

    expect(repository.update).toHaveBeenCalledWith('commitment', updateInput);
    expect(repository.deleteUnpaidPayments).toHaveBeenCalledWith('commitment');
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

    expect(repository.update).toHaveBeenCalledWith('commitment', updateInput);
    expect(repository.deleteUnpaidPayments).toHaveBeenCalledWith('commitment');
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

    expect(repository.markAsPaid).toHaveBeenCalledWith('payment', paymentDetails, commitment());
    expect(repository.runHousekeeping).toHaveBeenCalledTimes(1);
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(store.getState().generation).toBe(1);
  });

  it('locks a payment against a stale Skip while Pay persistence is in flight', async () => {
    const payRequest = deferred<void>();
    const repository = makeRepository({
      markAsPaid: jest.fn().mockReturnValue(payRequest.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);

    const payAction = store.getState().markAsPaid('payment', paymentDetails);
    const skipAction = store.getState().skipPayment('payment');

    expect(store.getState().transitioningPaymentIds).toEqual(['payment']);
    payRequest.resolve();
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
        status: CommitmentPaymentStatus.Paid,
        paid_date: paymentDetails.paid_date,
        skipped_date: null,
        amount_paid: paymentDetails.amount_paid,
        account_id: paymentDetails.account_id,
      }),
    ]);
    expect(store.getState().transitioningPaymentIds).toEqual([]);

    refresh.resolve();
    await flushMicrotasks();
  });

  it('invalidates and reloads once after skipping', async () => {
    const repository = makeRepository();
    const store = createCommitmentStore(repository);

    await store.getState().skipPayment('payment');
    await flushMicrotasks();

    expect(repository.markAsSkipped).toHaveBeenCalledWith('payment');
    expect(repository.getMonthSnapshot).toHaveBeenCalledTimes(1);
    expect(store.getState().generation).toBe(1);
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

describe('commitment store selectors', () => {
  async function loadedStore(payments: CommitmentPayment[], commitments = [commitment()]) {
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot(MAY, commitments, payments)),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    return store;
  }

  it('preserves status selectors and skips skipped rows in total count', async () => {
    const overdue = payment({ id: 'overdue', status: CommitmentPaymentStatus.Overdue });
    const due = payment({ id: 'due', status: CommitmentPaymentStatus.Due });
    const upcoming = payment({ id: 'upcoming', status: CommitmentPaymentStatus.Upcoming });
    const paid = payment({ id: 'paid', status: CommitmentPaymentStatus.Paid });
    const skipped = payment({ id: 'skipped', status: CommitmentPaymentStatus.Skipped });
    const store = await loadedStore([overdue, due, upcoming, paid, skipped]);

    expect(store.getState().getOverdue()).toEqual([overdue]);
    expect(store.getState().getDueToday()).toEqual([due]);
    expect(store.getState().getUpcoming()).toEqual([upcoming]);
    expect(store.getState().getPaid()).toEqual([paid]);
    expect(store.getState().getSkipped()).toEqual([skipped]);
    expect(store.getState().getPaidCount()).toBe(1);
    expect(store.getState().getTotalCount()).toBe(4);
  });

  it('preserves active fixed totals and treats variable amounts as zero', async () => {
    const store = await loadedStore(
      [],
      [
        commitment({ id: 'fixed', amount: 250 }),
        commitment({ id: 'variable', amount: null }),
        commitment({ id: 'inactive', amount: 500, is_active: 0 }),
      ],
    );

    expect(store.getState().getTotalMonthlyCommitted()).toBe(250);
  });
});
