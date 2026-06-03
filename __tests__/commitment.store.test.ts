import {
  CommitmentPaymentStatus,
  AmountType,
  RecurrencePeriod,
  DurationType,
  Currency,
} from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import type { ICommitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { CommitmentStore } from '@/modules/commitments/store/commitment.store';

// ---------------------------------------------------------------------------
// Mock computeDueDates so we can control its output
// ---------------------------------------------------------------------------
jest.mock('@/utils/compute_due_dates', () => ({
  computeDueDates: jest.fn().mockReturnValue(['2026-06-01', '2026-07-01']),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockCommitment = (overrides: Partial<Commitment> = {}): Commitment => ({
  id: 'c-1',
  name: 'Netflix',
  amount_type: AmountType.Fixed,
  amount: 250,
  currency: Currency.EGP,
  category_id: 'cat-1',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2026-01-01',
  account_id: 'acc-1',
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const mockPayment = (overrides: Partial<CommitmentPayment> = {}): CommitmentPayment => ({
  id: 'p-1',
  commitment_id: 'c-1',
  due_date: '2026-06-01',
  paid_date: null,
  skipped_date: null,
  amount_due: 250,
  amount_paid: null,
  currency: Currency.EGP,
  exchange_rate_snapshot: null,
  account_id: 'acc-1',
  transaction_id: null,
  status: CommitmentPaymentStatus.Upcoming,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function makeRepo(overrides: Partial<ICommitmentRepository> = {}): ICommitmentRepository {
  return {
    getAll: jest.fn().mockResolvedValue([mockCommitment()]),
    getById: jest.fn().mockResolvedValue(mockCommitment()),
    add: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),

    getPaymentsForMonth: jest.fn().mockResolvedValue([mockPayment()]),
    getPaymentsByCommitment: jest.fn().mockResolvedValue([mockPayment()]),
    getPaymentById: jest.fn().mockResolvedValue(mockPayment()),
    getLastPaidPayment: jest.fn().mockResolvedValue(undefined),
    getPaidCount: jest.fn().mockResolvedValue(0),
    getExistingDueDates: jest.fn().mockResolvedValue([]),

    insertPayments: jest.fn().mockResolvedValue(undefined),
    deleteUnpaidPayments: jest.fn().mockResolvedValue(undefined),

    markAsPaid: jest.fn().mockResolvedValue(undefined),
    markAsSkipped: jest.fn().mockResolvedValue(undefined),

    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

// ---------------------------------------------------------------------------
// loadCommitments
// ---------------------------------------------------------------------------

describe('commitmentStore.loadCommitments', () => {
  it('starts with commitments unloaded so screens can avoid empty-state flashes', () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);

    expect(store.commitmentsLoaded).toBe(false);
  });

  it('marks commitments loaded after repo data settles', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([]) });
    const store = new CommitmentStore(repo);

    await store.loadCommitments();

    expect(store.commitmentsLoaded).toBe(true);
  });

  it('populates state.commitments from repo', async () => {
    const commitment = mockCommitment();
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([commitment]) });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    expect(store.commitments).toEqual([commitment]);
  });

  it('calls repo.getAll()', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('db fail')) });
    const store = new CommitmentStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.loadCommitments()).rejects.toThrow('db fail');
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// loadPaymentsForMonth
// ---------------------------------------------------------------------------

describe('commitmentStore.loadPaymentsForMonth', () => {
  it('starts with payments unloaded so month empty states wait for the first fetch', () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);

    expect(store.paymentsLoaded).toBe(false);
  });

  it('marks payments loaded after repo data settles', async () => {
    const repo = makeRepo({ getPaymentsForMonth: jest.fn().mockResolvedValue([]) });
    const store = new CommitmentStore(repo);

    await store.loadPaymentsForMonth('2026-06');

    expect(store.paymentsLoaded).toBe(true);
  });

  it('populates state.payments from repo', async () => {
    const payment = mockPayment();
    const repo = makeRepo({ getPaymentsForMonth: jest.fn().mockResolvedValue([payment]) });
    const store = new CommitmentStore(repo);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.payments).toEqual([payment]);
  });

  it('calls repo.getPaymentsForMonth with the given yearMonth', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.loadPaymentsForMonth('2026-06');
    expect(repo.getPaymentsForMonth).toHaveBeenCalledWith('2026-06');
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo({
      getPaymentsForMonth: jest.fn().mockRejectedValue(new Error('payments fail')),
    });
    const store = new CommitmentStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.loadPaymentsForMonth('2026-06')).rejects.toThrow('payments fail');
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// setSelectedMonth
// ---------------------------------------------------------------------------

describe('commitmentStore.setSelectedMonth', () => {
  it('updates state.selectedMonth', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.setSelectedMonth('2026-08');
    expect(store.selectedMonth).toBe('2026-08');
  });

  it('calls loadPaymentsForMonth with the new yearMonth', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.setSelectedMonth('2026-08');
    expect(repo.getPaymentsForMonth).toHaveBeenCalledWith('2026-08');
  });

  it('clears previous-month payments while the newly selected month is loading', async () => {
    const aprilPayment = mockPayment({ id: 'p-april', due_date: '2026-04-01' });
    const mayRequest = deferred<CommitmentPayment[]>();
    const repo = makeRepo({
      getPaymentsForMonth: jest.fn((yearMonth: string) => {
        if (yearMonth === '2026-04') return Promise.resolve([aprilPayment]);
        if (yearMonth === '2026-05') return mayRequest.promise;
        return Promise.resolve([]);
      }),
    });
    const store = new CommitmentStore(repo);

    await store.setSelectedMonth('2026-04');
    expect(store.payments).toEqual([aprilPayment]);
    expect(store.paymentsLoaded).toBe(true);

    const mayLoad = store.setSelectedMonth('2026-05');

    expect(store.selectedMonth).toBe('2026-05');
    expect(store.payments).toEqual([]);
    expect(store.paymentsLoaded).toBe(false);

    mayRequest.resolve([]);
    await mayLoad;
  });

  it('ignores stale selected-month payment responses and only marks the latest request loaded', async () => {
    const aprilPayment = mockPayment({ id: 'p-april', due_date: '2026-04-01' });
    const mayPayment = mockPayment({ id: 'p-may', due_date: '2026-05-01' });
    const junePayment = mockPayment({ id: 'p-june', due_date: '2026-06-01' });
    const mayRequest = deferred<CommitmentPayment[]>();
    const juneRequest = deferred<CommitmentPayment[]>();
    const repo = makeRepo({
      getPaymentsForMonth: jest.fn((yearMonth: string) => {
        if (yearMonth === '2026-05') return mayRequest.promise;
        if (yearMonth === '2026-06') return juneRequest.promise;
        return Promise.resolve([aprilPayment]);
      }),
    });
    const store = new CommitmentStore(repo);

    await store.loadPaymentsForMonth('2026-04');
    expect(store.paymentsLoaded).toBe(true);

    const mayLoad = store.setSelectedMonth('2026-05');
    expect(store.paymentsLoaded).toBe(false);

    const juneLoad = store.setSelectedMonth('2026-06');
    expect(store.paymentsLoaded).toBe(false);

    juneRequest.resolve([junePayment]);
    await juneLoad;

    expect(store.selectedMonth).toBe('2026-06');
    expect(store.payments).toEqual([junePayment]);
    expect(store.paymentsLoaded).toBe(true);

    mayRequest.resolve([mayPayment]);
    await mayLoad;

    expect(store.selectedMonth).toBe('2026-06');
    expect(store.payments).toEqual([junePayment]);
    expect(store.paymentsLoaded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// addCommitment
// ---------------------------------------------------------------------------

describe('commitmentStore.addCommitment', () => {
  const newInput = {
    name: 'Spotify',
    amount_type: AmountType.Fixed,
    amount: 100,
    currency: Currency.EGP,
    category_id: 'cat-1',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-01-01',
    account_id: 'acc-1',
    notes: null,
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
  };

  it('calls repo.add with the input', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.addCommitment(newInput);
    expect(repo.add).toHaveBeenCalledWith(newInput);
  });

  it('reloads commitments after add', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.addCommitment(newInput);
    expect(repo.getAll).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// markAsPaid
// ---------------------------------------------------------------------------

describe('commitmentStore.markAsPaid', () => {
  const paymentDetails = {
    amount_paid: 250,
    account_id: 'acc-1',
    paid_date: '2026-06-01',
  };

  it('calls repo.markAsPaid with paymentId, details, and the matching commitment', async () => {
    const commitment = mockCommitment({ id: 'c-1' });
    const payment = mockPayment({ id: 'p-1', commitment_id: 'c-1' });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaymentsForMonth: jest.fn().mockResolvedValue([payment]),
      getPaidCount: jest.fn().mockResolvedValue(0),
    });
    const store = new CommitmentStore(repo);
    // Seed state
    await store.loadCommitments();
    await store.loadPaymentsForMonth('2026-06');
    await store.markAsPaid('p-1', paymentDetails);
    expect(repo.markAsPaid).toHaveBeenCalledWith('p-1', paymentDetails, commitment);
  });

  it('reloads payments after marking as paid', async () => {
    const commitment = mockCommitment({ id: 'c-1' });
    const payment = mockPayment({ id: 'p-1', commitment_id: 'c-1' });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaymentsForMonth: jest.fn().mockResolvedValue([payment]),
      getPaidCount: jest.fn().mockResolvedValue(0),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.loadPaymentsForMonth('2026-06');
    await store.markAsPaid('p-1', paymentDetails);
    // getPaymentsForMonth is called at least twice (initial load + after markAsPaid)
    expect(repo.getPaymentsForMonth).toHaveBeenCalledTimes(2);
  });

  it('calls checkAndDeactivateExpired after marking as paid', async () => {
    const commitment = mockCommitment({ id: 'c-1' });
    const payment = mockPayment({ id: 'p-1', commitment_id: 'c-1' });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaymentsForMonth: jest.fn().mockResolvedValue([payment]),
      getPaidCount: jest.fn().mockResolvedValue(0),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.loadPaymentsForMonth('2026-06');
    await store.markAsPaid('p-1', paymentDetails);
    // checkAndDeactivateExpired calls getPaidCount for active AfterCount commitments
    // Here commitment is Forever so getPaidCount won't be called, but getAll will be called again
    expect(repo.getAll).toHaveBeenCalledTimes(2); // initial load + checkAndDeactivateExpired reload
  });

  it('throws if commitment not found for payment', async () => {
    const payment = mockPayment({ id: 'p-1', commitment_id: 'c-MISSING' });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockCommitment({ id: 'c-1' })]),
      getPaymentsForMonth: jest.fn().mockResolvedValue([payment]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.loadPaymentsForMonth('2026-06');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.markAsPaid('p-1', paymentDetails)).rejects.toThrow(
      'Commitment not found for payment p-1',
    );
    consoleSpy.mockRestore();
  });

  it('throws if payment does not exist in state (paymentId not in payments)', async () => {
    // payment is undefined → commitment is undefined → throws
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockCommitment({ id: 'c-1' })]),
      getPaymentsForMonth: jest.fn().mockResolvedValue([]), // no payments
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.loadPaymentsForMonth('2026-06');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.markAsPaid('p-nonexistent', paymentDetails)).rejects.toThrow(
      'Commitment not found for payment p-nonexistent',
    );
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// skipPayment
// ---------------------------------------------------------------------------

describe('commitmentStore.skipPayment', () => {
  it('calls repo.markAsSkipped with the paymentId', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.skipPayment('p-1');
    expect(repo.markAsSkipped).toHaveBeenCalledWith('p-1');
  });

  it('reloads payments after skipping', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.skipPayment('p-1');
    expect(repo.getPaymentsForMonth).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// generatePayments
// ---------------------------------------------------------------------------

describe('commitmentStore.generatePayments', () => {
  it('calls computeDueDates for each commitment', async () => {
    const { computeDueDates } = require('@/utils/compute_due_dates');
    const commitment = mockCommitment();
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getExistingDueDates: jest.fn().mockResolvedValue([]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    (computeDueDates as jest.Mock).mockClear();
    await store.generatePayments();
    expect(computeDueDates).toHaveBeenCalledTimes(1);
    expect(computeDueDates).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: commitment.start_date,
        every: commitment.recurrence_every,
        period: commitment.recurrence_period,
      }),
    );
  });

  it('calls repo.insertPayments with new dates not in existing set', async () => {
    const { computeDueDates } = require('@/utils/compute_due_dates');
    (computeDueDates as jest.Mock).mockReturnValue(['2026-06-01', '2026-07-01']);

    const commitment = mockCommitment();
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getExistingDueDates: jest.fn().mockResolvedValue(['2026-06-01']), // already exists
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.generatePayments();

    expect(repo.insertPayments).toHaveBeenCalledTimes(1);
    const inserted: CommitmentPayment[] = (repo.insertPayments as jest.Mock).mock.calls[0][0];
    expect(inserted).toHaveLength(1);
    expect(inserted[0].due_date).toBe('2026-07-01');
  });

  it('skips insertPayments when no new dates', async () => {
    const { computeDueDates } = require('@/utils/compute_due_dates');
    (computeDueDates as jest.Mock).mockReturnValue(['2026-06-01']);

    const commitment = mockCommitment();
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getExistingDueDates: jest.fn().mockResolvedValue(['2026-06-01']),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.generatePayments();
    expect(repo.insertPayments).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Selector getters
// ---------------------------------------------------------------------------

describe('commitmentStore — selector getters', () => {
  function storeWithPayments(payments: CommitmentPayment[]) {
    const repo = makeRepo({ getPaymentsForMonth: jest.fn().mockResolvedValue(payments) });
    const store = new CommitmentStore(repo);
    return store;
  }

  it('getOverdue filters by Overdue status', async () => {
    const p1 = mockPayment({ id: 'p-1', status: CommitmentPaymentStatus.Overdue });
    const p2 = mockPayment({ id: 'p-2', status: CommitmentPaymentStatus.Upcoming });
    const store = storeWithPayments([p1, p2]);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.getOverdue()).toEqual([p1]);
  });

  it('getDueToday filters by Due status', async () => {
    const p1 = mockPayment({ id: 'p-1', status: CommitmentPaymentStatus.Due });
    const p2 = mockPayment({ id: 'p-2', status: CommitmentPaymentStatus.Upcoming });
    const store = storeWithPayments([p1, p2]);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.getDueToday()).toEqual([p1]);
  });

  it('getPaid filters by Paid status', async () => {
    const p1 = mockPayment({ id: 'p-1', status: CommitmentPaymentStatus.Paid });
    const p2 = mockPayment({ id: 'p-2', status: CommitmentPaymentStatus.Overdue });
    const store = storeWithPayments([p1, p2]);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.getPaid()).toEqual([p1]);
  });

  it('getUpcoming filters by Upcoming status', async () => {
    const p1 = mockPayment({ id: 'p-1', status: CommitmentPaymentStatus.Upcoming });
    const p2 = mockPayment({ id: 'p-2', status: CommitmentPaymentStatus.Paid });
    const store = storeWithPayments([p1, p2]);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.getUpcoming()).toEqual([p1]);
  });

  it('getSkipped filters by Skipped status', async () => {
    const p1 = mockPayment({ id: 'p-1', status: CommitmentPaymentStatus.Skipped });
    const p2 = mockPayment({ id: 'p-2', status: CommitmentPaymentStatus.Upcoming });
    const store = storeWithPayments([p1, p2]);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.getSkipped()).toEqual([p1]);
  });

  it('getTotalCount returns all payments length', async () => {
    const payments = [mockPayment({ id: 'p-1' }), mockPayment({ id: 'p-2' })];
    const store = storeWithPayments(payments);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.getTotalCount()).toBe(2);
  });

  it('getPaidCount returns count of Paid payments', async () => {
    const payments = [
      mockPayment({ id: 'p-1', status: CommitmentPaymentStatus.Paid }),
      mockPayment({ id: 'p-2', status: CommitmentPaymentStatus.Paid }),
      mockPayment({ id: 'p-3', status: CommitmentPaymentStatus.Upcoming }),
    ];
    const store = storeWithPayments(payments);
    await store.loadPaymentsForMonth('2026-06');
    expect(store.getPaidCount()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// updateCommitment
// ---------------------------------------------------------------------------

describe('commitmentStore.updateCommitment', () => {
  const updateInput: import('@/modules/commitments/repositories/commitment.repository').UpdateCommitmentInput =
    {
      name: 'Netflix Updated',
      amount_type: AmountType.Fixed,
      amount: 300,
      currency: Currency.EGP,
      category_id: 'cat-1',
      recurrence_every: 1,
      recurrence_period: RecurrencePeriod.Months,
      start_date: '2026-01-01',
      account_id: 'acc-1',
      notes: null,
      duration_type: DurationType.Forever,
      end_date: null,
      end_after_count: null,
    };

  it('calls repo.update with id and data', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.updateCommitment('c-1', updateInput);
    expect(repo.update).toHaveBeenCalledWith('c-1', updateInput);
  });

  it('calls repo.deleteUnpaidPayments as part of regeneratePayments', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.updateCommitment('c-1', updateInput);
    expect(repo.deleteUnpaidPayments).toHaveBeenCalledWith('c-1');
  });

  it('calls repo.getById as part of regeneratePayments', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.updateCommitment('c-1', updateInput);
    expect(repo.getById).toHaveBeenCalledWith('c-1');
  });

  it('calls repo.insertPayments as part of regeneratePayments', async () => {
    const repo = makeRepo({
      getById: jest.fn().mockResolvedValue(mockCommitment()),
      getExistingDueDates: jest.fn().mockResolvedValue([]),
    });
    const store = new CommitmentStore(repo);
    await store.updateCommitment('c-1', updateInput);
    expect(repo.insertPayments).toHaveBeenCalled();
  });

  it('reloads commitments after update', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.updateCommitment('c-1', updateInput);
    expect(repo.getAll).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deactivateCommitment
// ---------------------------------------------------------------------------

describe('commitmentStore.deactivateCommitment', () => {
  it('calls repo.deactivate with the id', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.deactivateCommitment('c-1');
    expect(repo.deactivate).toHaveBeenCalledWith('c-1');
  });

  it('reloads commitments after deactivation', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.deactivateCommitment('c-1');
    expect(repo.getAll).toHaveBeenCalled();
  });

  it('reloads payments for selectedMonth after deactivation', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.setSelectedMonth('2026-09');
    (repo.getPaymentsForMonth as jest.Mock).mockClear();
    await store.deactivateCommitment('c-1');
    expect(repo.getPaymentsForMonth).toHaveBeenCalledWith('2026-09');
  });
});

// ---------------------------------------------------------------------------
// regeneratePayments
// ---------------------------------------------------------------------------

describe('commitmentStore.regeneratePayments', () => {
  it('calls repo.deleteUnpaidPayments with the commitmentId', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.regeneratePayments('c-1');
    expect(repo.deleteUnpaidPayments).toHaveBeenCalledWith('c-1');
  });

  it('calls repo.getById to fetch the commitment', async () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    await store.regeneratePayments('c-1');
    expect(repo.getById).toHaveBeenCalledWith('c-1');
  });

  it('calls repo.insertPayments with generated payments for new dates', async () => {
    const { computeDueDates } = require('@/utils/compute_due_dates');
    (computeDueDates as jest.Mock).mockReturnValue(['2026-06-01', '2026-07-01']);
    const repo = makeRepo({
      getById: jest.fn().mockResolvedValue(mockCommitment()),
      getExistingDueDates: jest.fn().mockResolvedValue([]),
    });
    const store = new CommitmentStore(repo);
    await store.regeneratePayments('c-1');
    expect(repo.insertPayments).toHaveBeenCalledTimes(1);
    const inserted: CommitmentPayment[] = (repo.insertPayments as jest.Mock).mock.calls[0][0];
    expect(inserted).toHaveLength(2);
  });

  it('skips insertPayments when no new dates after filtering existing', async () => {
    const { computeDueDates } = require('@/utils/compute_due_dates');
    (computeDueDates as jest.Mock).mockReturnValue(['2026-06-01']);
    const repo = makeRepo({
      getById: jest.fn().mockResolvedValue(mockCommitment()),
      getExistingDueDates: jest.fn().mockResolvedValue(['2026-06-01']),
    });
    const store = new CommitmentStore(repo);
    await store.regeneratePayments('c-1');
    expect(repo.insertPayments).not.toHaveBeenCalled();
  });

  it('returns early without inserting if commitment not found', async () => {
    const repo = makeRepo({
      getById: jest.fn().mockResolvedValue(undefined),
    });
    const store = new CommitmentStore(repo);
    await store.regeneratePayments('c-missing');
    expect(repo.insertPayments).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// checkAndDeactivateExpired
// ---------------------------------------------------------------------------

describe('commitmentStore.checkAndDeactivateExpired', () => {
  it('deactivates AfterCount commitment when paidCount >= end_after_count', async () => {
    const commitment = mockCommitment({
      id: 'c-1',
      duration_type: DurationType.AfterCount,
      end_after_count: 3,
      is_active: 1,
    });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaidCount: jest.fn().mockResolvedValue(3),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.checkAndDeactivateExpired();
    expect(repo.deactivate).toHaveBeenCalledWith('c-1');
  });

  it('does not deactivate AfterCount commitment when paidCount < end_after_count', async () => {
    const commitment = mockCommitment({
      id: 'c-1',
      duration_type: DurationType.AfterCount,
      end_after_count: 5,
      is_active: 1,
    });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaidCount: jest.fn().mockResolvedValue(2),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.checkAndDeactivateExpired();
    expect(repo.deactivate).not.toHaveBeenCalled();
  });

  it('deactivates UntilDate commitment when today > end_date', async () => {
    const commitment = mockCommitment({
      id: 'c-1',
      duration_type: DurationType.UntilDate,
      end_date: '2020-01-01', // well in the past
      is_active: 1,
    });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.checkAndDeactivateExpired();
    expect(repo.deactivate).toHaveBeenCalledWith('c-1');
  });

  it('skips inactive commitments', async () => {
    const commitment = mockCommitment({
      id: 'c-1',
      duration_type: DurationType.AfterCount,
      end_after_count: 1,
      is_active: 0,
    });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaidCount: jest.fn().mockResolvedValue(5),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.checkAndDeactivateExpired();
    expect(repo.deactivate).not.toHaveBeenCalled();
  });

  it('reloads commitments after checking', async () => {
    const commitment = mockCommitment({ duration_type: DurationType.Forever });
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([commitment]) });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    const callsBefore = (repo.getAll as jest.Mock).mock.calls.length;
    await store.checkAndDeactivateExpired();
    expect((repo.getAll as jest.Mock).mock.calls.length).toBe(callsBefore + 1);
  });
});

// ---------------------------------------------------------------------------
// makePayments status logic (via generatePayments)
// ---------------------------------------------------------------------------

describe('commitmentStore.generatePayments — payment status assignment', () => {
  it('assigns Overdue status to past due dates', async () => {
    const { computeDueDates } = require('@/utils/compute_due_dates');
    // A date definitely in the past
    (computeDueDates as jest.Mock).mockReturnValue(['2020-01-01']);

    const commitment = mockCommitment();
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getExistingDueDates: jest.fn().mockResolvedValue([]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.generatePayments();

    const inserted: CommitmentPayment[] = (repo.insertPayments as jest.Mock).mock.calls[0][0];
    expect(inserted[0].status).toBe(CommitmentPaymentStatus.Overdue);
  });

  it('assigns Due status to dates matching today', async () => {
    const { computeDueDates } = require('@/utils/compute_due_dates');
    const todayStr = new Date().toISOString().slice(0, 10);
    (computeDueDates as jest.Mock).mockReturnValue([todayStr]);

    const commitment = mockCommitment();
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getExistingDueDates: jest.fn().mockResolvedValue([]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.generatePayments();

    const inserted: CommitmentPayment[] = (repo.insertPayments as jest.Mock).mock.calls[0][0];
    expect(inserted[0].status).toBe(CommitmentPaymentStatus.Due);
  });
});

// ---------------------------------------------------------------------------
// checkAndDeactivateExpired — UntilDate not yet expired
// ---------------------------------------------------------------------------

describe('commitmentStore.checkAndDeactivateExpired — UntilDate not expired', () => {
  it('does not deactivate UntilDate commitment when end_date is in the future', async () => {
    const commitment = mockCommitment({
      id: 'c-future',
      duration_type: DurationType.UntilDate,
      end_date: '2099-12-31', // far in the future
      is_active: 1,
    });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.checkAndDeactivateExpired();
    expect(repo.deactivate).not.toHaveBeenCalled();
  });

  it('does not deactivate UntilDate commitment when end_date is null', async () => {
    const commitment = mockCommitment({
      id: 'c-null-end',
      duration_type: DurationType.UntilDate,
      end_date: null,
      is_active: 1,
    });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.checkAndDeactivateExpired();
    expect(repo.deactivate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Error paths — catch branches
// ---------------------------------------------------------------------------

describe('commitmentStore — error paths', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('addCommitment propagates repo.add errors', async () => {
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(new Error('add fail')) });
    const store = new CommitmentStore(repo);
    await expect(store.addCommitment({} as never)).rejects.toThrow('add fail');
  });

  it('updateCommitment propagates repo.update errors', async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new Error('update fail')) });
    const store = new CommitmentStore(repo);
    await expect(store.updateCommitment('c-1', {} as never)).rejects.toThrow('update fail');
  });

  it('deactivateCommitment propagates repo.deactivate errors', async () => {
    const repo = makeRepo({
      deactivate: jest.fn().mockRejectedValue(new Error('deactivate fail')),
    });
    const store = new CommitmentStore(repo);
    await expect(store.deactivateCommitment('c-1')).rejects.toThrow('deactivate fail');
  });

  it('markAsPaid propagates repo.markAsPaid errors', async () => {
    const commitment = mockCommitment({ id: 'c-1' });
    const payment = mockPayment({ id: 'p-1', commitment_id: 'c-1' });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaymentsForMonth: jest.fn().mockResolvedValue([payment]),
      markAsPaid: jest.fn().mockRejectedValue(new Error('markAsPaid fail')),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await store.loadPaymentsForMonth('2026-06');
    await expect(
      store.markAsPaid('p-1', { amount_paid: 200, account_id: 'acc-1', paid_date: '2026-06-01' }),
    ).rejects.toThrow('markAsPaid fail');
  });

  it('skipPayment propagates repo.markAsSkipped errors', async () => {
    const repo = makeRepo({
      markAsSkipped: jest.fn().mockRejectedValue(new Error('skip fail')),
    });
    const store = new CommitmentStore(repo);
    await expect(store.skipPayment('p-1')).rejects.toThrow('skip fail');
  });

  it('generatePayments propagates repo.getExistingDueDates errors', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([mockCommitment()]),
      getExistingDueDates: jest.fn().mockRejectedValue(new Error('dates fail')),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await expect(store.generatePayments()).rejects.toThrow('dates fail');
  });

  it('regeneratePayments propagates repo.deleteUnpaidPayments errors', async () => {
    const repo = makeRepo({
      deleteUnpaidPayments: jest.fn().mockRejectedValue(new Error('delete fail')),
    });
    const store = new CommitmentStore(repo);
    await expect(store.regeneratePayments('c-1')).rejects.toThrow('delete fail');
  });

  it('checkAndDeactivateExpired propagates repo.getPaidCount errors', async () => {
    const commitment = mockCommitment({
      id: 'c-1',
      duration_type: DurationType.AfterCount,
      end_after_count: 3,
      is_active: 1,
    });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaidCount: jest.fn().mockRejectedValue(new Error('paidCount fail')),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    await expect(store.checkAndDeactivateExpired()).rejects.toThrow('paidCount fail');
  });
});

// ---------------------------------------------------------------------------
// getTotalMonthlyCommitted
// ---------------------------------------------------------------------------

describe('commitmentStore.getTotalMonthlyCommitted', () => {
  it('sums amount for active commitments, ignoring inactive ones', async () => {
    const active1 = mockCommitment({ id: 'c-a1', amount: 200, is_active: 1 });
    const active2 = mockCommitment({ id: 'c-a2', amount: 100, is_active: 1 });
    const inactive = mockCommitment({ id: 'c-i1', amount: 500, is_active: 0 });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([active1, active2, inactive]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    expect(store.getTotalMonthlyCommitted()).toBe(300);
  });

  it('treats null amount as 0', async () => {
    const variableCommitment = mockCommitment({ id: 'c-var', amount: null, is_active: 1 });
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([variableCommitment]),
    });
    const store = new CommitmentStore(repo);
    await store.loadCommitments();
    expect(store.getTotalMonthlyCommitted()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deactivateCommitment — signature smoke test (refactor guard)
// ---------------------------------------------------------------------------

describe('commitmentStore — deactivateCommitment signature smoke test', () => {
  it('deactivateCommitment exists and is a function on the store', () => {
    const repo = makeRepo();
    const store = new CommitmentStore(repo);
    const { deactivateCommitment } = store;
    expect(typeof deactivateCommitment).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('commitmentStore.reset', () => {
  it('returns state to INITIAL_STATE', async () => {
    const commitment = mockCommitment();
    const payment = mockPayment();
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([commitment]),
      getPaymentsForMonth: jest.fn().mockResolvedValue([payment]),
    });
    const store = new CommitmentStore(repo);
    // Populate state
    await store.loadCommitments();
    await store.loadPaymentsForMonth('2026-06');
    await store.setSelectedMonth('2026-09');
    // State is now non-empty
    expect(store.commitments).toHaveLength(1);
    expect(store.payments).toHaveLength(1);
    // Reset
    store.reset();
    expect(store.commitments).toEqual([]);
    expect(store.payments).toEqual([]);
  });
});
