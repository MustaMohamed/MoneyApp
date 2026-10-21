import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
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
import type { CommitmentPaymentAmounts } from '@/modules/transactions/domain/transaction_amounts';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { deferred } from '@/test_helpers/deferred';

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
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
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
    markAsPaid: jest.fn().mockResolvedValue(paymentAmounts()),
    markAsSkipped: jest.fn().mockResolvedValue(undefined),
    undoSkip: jest.fn().mockResolvedValue(undefined),
    runHousekeeping: jest.fn().mockResolvedValue(undefined),
    getMonthSnapshot: jest.fn().mockResolvedValue(snapshot()),
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
      loading: false,
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
    const payRequest = deferred<CommitmentPaymentAmounts>();
    const repository = makeRepository({
      markAsPaid: jest.fn().mockReturnValue(payRequest.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);

    const payAction = store.getState().markAsPaid('payment', paymentDetails);
    const skipAction = store.getState().skipPayment('payment');

    expect(store.getState().transitioningPaymentIds).toEqual(['payment']);
    payRequest.resolve(paymentAmounts());
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
      markAsPaid: jest.fn().mockResolvedValue(paymentAmounts({ paymentAmount: 11 })),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    (repository.runHousekeeping as jest.Mock).mockReset().mockReturnValue(refresh.promise);

    await store.getState().markAsPaid('payment', { ...paymentDetails, amount_paid: 10.999 });

    expect(store.getState().payments[0].amount_paid).toBe(11);

    refresh.resolve();
    await flushMicrotasks();
  });

  it('keeps the resolved amount after the background revalidation rejects', async () => {
    const refreshError = new Error('post-pay refresh failed');
    const repository = makeRepository({
      // 10.999 in, 11 out, so a patch keeping the raw input is distinguishable from the resolved.
      markAsPaid: jest.fn().mockResolvedValue(paymentAmounts({ paymentAmount: 11 })),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);
    (repository.runHousekeeping as jest.Mock).mockReset().mockRejectedValue(refreshError);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await store.getState().markAsPaid('payment', { ...paymentDetails, amount_paid: 10.999 });
    await flushMicrotasks();

    // `revalidateAfterMutation` is fire-and-forget with a log-only catch, so this patch is final.
    expect(store.getState().payments[0].amount_paid).toBe(11);
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

describe('commitment store selectors', () => {
  async function loadedStore(payments: CommitmentPayment[], commitments = [commitment()]) {
    const repository = makeRepository({
      getMonthSnapshot: jest.fn().mockResolvedValue(snapshot(MAY, commitments, payments)),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY, MAY_8_LOCAL);
    return store;
  }

  it('reads the five states from the dates against today and skips skipped rows in total count', async () => {
    const overdue = payment({ id: 'overdue', due_date: '2026-05-07' });
    const due = payment({ id: 'due', due_date: MAY_8 });
    const upcoming = payment({ id: 'upcoming', due_date: '2026-05-09' });
    const paid = payment({ id: 'paid', due_date: '2026-05-01', paid_date: '2026-05-02' });
    const skipped = payment({ id: 'skipped', due_date: '2026-05-03', skipped_date: '2026-05-04' });
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
    const payRequest = deferred<CommitmentPaymentAmounts>();
    const repository = makeRepository({
      markAsPaid: jest.fn().mockReturnValue(payRequest.promise),
    });
    const store = createCommitmentStore(repository);
    await store.getState().loadMonthSnapshot(MAY);

    const payAction = store.getState().markAsPaid('payment', paymentDetails);
    const undoAction = store.getState().undoSkip('payment', MAY_8_LOCAL);

    await expect(undoAction).rejects.toThrow('Payment transition already in progress: payment');
    expect(repository.undoSkip).not.toHaveBeenCalled();
    payRequest.resolve(paymentAmounts());
    await payAction;
  });
});
