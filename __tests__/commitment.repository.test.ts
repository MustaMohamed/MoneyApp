import {
  AmountType,
  AccountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
  TransactionType,
} from '@/constants/enums';
import { getDb } from '@/database/client';
import { getAccountByIdIncludingArchived } from '@/modules/accounts/database/accounts';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  addPayments,
  deleteUnpaidPaymentsByCommitment,
  getActiveCommitmentDueDates,
  getExistingDueDates,
  getLastPaidPayment,
  getPaidCountByCommitment,
  insertPaymentRows,
  getPaymentById,
  getPaymentsByCommitment,
  getPaymentsByMonth,
  markCommitmentAsPaid,
  updatePaymentStatus,
} from '@/modules/commitments/database/commitment_payments';
import {
  addCommitment,
  deactivateCommitment,
  deactivateExpiredCommitments,
  getCommitmentById,
  getCommitments,
  updateCommitment,
} from '@/modules/commitments/database/commitments';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  CommitmentRepository,
  type NewCommitmentInput,
  type PaymentDetails,
} from '@/modules/commitments/repositories/commitment.repository';

jest.mock('@/modules/commitments/database/commitments');
jest.mock('@/modules/commitments/database/commitment_payments');
jest.mock('@/modules/accounts/database/accounts');
jest.mock('@/database/client');
jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'test-uuid-1234') }));

const transactionDb = {};
const mockDb = {
  withExclusiveTransactionAsync: jest.fn(async (work: (db: unknown) => Promise<void>) => {
    await work(transactionDb);
  }),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getDb as jest.Mock).mockResolvedValue(mockDb);
  (getCommitments as jest.Mock).mockResolvedValue([]);
  (getCommitmentById as jest.Mock).mockResolvedValue(null);
  (addCommitment as jest.Mock).mockResolvedValue(undefined);
  (updateCommitment as jest.Mock).mockResolvedValue(undefined);
  (deactivateCommitment as jest.Mock).mockResolvedValue(undefined);
  (deactivateExpiredCommitments as jest.Mock).mockResolvedValue(undefined);
  (getPaymentsByMonth as jest.Mock).mockResolvedValue([]);
  (getActiveCommitmentDueDates as jest.Mock).mockResolvedValue([]);
  (getPaymentsByCommitment as jest.Mock).mockResolvedValue([]);
  (getPaymentById as jest.Mock).mockResolvedValue(null);
  (getLastPaidPayment as jest.Mock).mockResolvedValue(null);
  (getPaidCountByCommitment as jest.Mock).mockResolvedValue(0);
  (getExistingDueDates as jest.Mock).mockResolvedValue([]);
  (addPayments as jest.Mock).mockResolvedValue(undefined);
  (insertPaymentRows as jest.Mock).mockResolvedValue(undefined);
  (deleteUnpaidPaymentsByCommitment as jest.Mock).mockResolvedValue(undefined);
  (markCommitmentAsPaid as jest.Mock).mockResolvedValue(undefined);
  (updatePaymentStatus as jest.Mock).mockResolvedValue(undefined);
  (getAccountByIdIncludingArchived as jest.Mock).mockResolvedValue(baseAccount);
});

const repo = new CommitmentRepository();

const baseAccount: Account = {
  id: 'acc-1',
  name: 'Main account',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 5_000,
  current_balance: 5_000,
  color: null,
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  balance_review_required: 0,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const baseCommitment: Commitment = {
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
};

const baseInput: NewCommitmentInput = {
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
};

const basePayment: CommitmentPayment = {
  id: 'p-1',
  commitment_id: 'c-1',
  due_date: '2026-05-01',
  paid_date: null,
  skipped_date: null,
  amount_due: 250,
  amount_paid: null,
  currency: Currency.EGP,
  exchange_rate_snapshot: null,
  account_id: null,
  transaction_id: null,
  status: CommitmentPaymentStatus.Due,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('CommitmentRepository.getAll', () => {
  it('calls getCommitments with db and returns result', async () => {
    const expected = [baseCommitment];
    (getCommitments as jest.Mock).mockResolvedValue(expected);

    const result = await repo.getAll();

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(getCommitments).toHaveBeenCalledWith(mockDb);
    expect(result).toBe(expected);
  });

  it('returns empty array when no commitments exist', async () => {
    const result = await repo.getAll();
    expect(result).toEqual([]);
  });
});

describe('CommitmentRepository.getById', () => {
  it('calls getCommitmentById with db and id, returns commitment', async () => {
    (getCommitmentById as jest.Mock).mockResolvedValue(baseCommitment);

    const result = await repo.getById('c-1');

    expect(getCommitmentById).toHaveBeenCalledWith(mockDb, 'c-1');
    expect(result).toBe(baseCommitment);
  });

  it('returns undefined when commitment not found (null from DB)', async () => {
    const result = await repo.getById('nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('CommitmentRepository.add', () => {
  it('generates a UUID and calls addCommitment with full Commitment object', async () => {
    await repo.add(baseInput);

    expect(addCommitment).toHaveBeenCalledTimes(1);
    const [calledDb, commitment] = (addCommitment as jest.Mock).mock.calls[0];
    expect(calledDb).toBe(mockDb);
    expect(commitment.id).toBe('test-uuid-1234');
  });

  it('sets is_active = 1', async () => {
    await repo.add(baseInput);

    const [, commitment] = (addCommitment as jest.Mock).mock.calls[0];
    expect(commitment.is_active).toBe(1);
  });

  it('writes ISO 8601 timestamps', async () => {
    await repo.add(baseInput);

    const [, commitment] = (addCommitment as jest.Mock).mock.calls[0];
    expect(commitment.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(commitment.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('spreads input data into the commitment', async () => {
    await repo.add(baseInput);

    const [, commitment] = (addCommitment as jest.Mock).mock.calls[0];
    expect(commitment.name).toBe(baseInput.name);
    expect(commitment.amount).toBe(baseInput.amount);
    expect(commitment.currency).toBe(baseInput.currency);
    expect(commitment.category_id).toBe(baseInput.category_id);
  });
});

describe('CommitmentRepository.update', () => {
  it('calls updateCommitment with id and data', async () => {
    const updateData = {
      name: 'Spotify',
      amount_type: AmountType.Fixed,
      amount: 150,
      currency: Currency.EGP,
      category_id: 'cat-2',
      recurrence_every: 1,
      recurrence_period: RecurrencePeriod.Months,
      start_date: '2026-01-01',
      account_id: 'acc-1',
      notes: null,
      duration_type: DurationType.Forever,
      end_date: null,
      end_after_count: null,
    };

    await repo.update('c-1', updateData);

    expect(updateCommitment).toHaveBeenCalledWith(mockDb, 'c-1', updateData);
  });
});

describe('CommitmentRepository.deactivate', () => {
  it('calls deactivateCommitment with id', async () => {
    await repo.deactivate('c-1');

    expect(deactivateCommitment).toHaveBeenCalledWith(mockDb, 'c-1');
  });
});

describe('CommitmentRepository.getPaymentsForMonth', () => {
  it('calls getPaymentsByMonth with db and yearMonth', async () => {
    const expected = [basePayment];
    (getPaymentsByMonth as jest.Mock).mockResolvedValue(expected);

    const result = await repo.getPaymentsForMonth('2026-05');

    expect(getPaymentsByMonth).toHaveBeenCalledWith(mockDb, '2026-05');
    expect(result).toBe(expected);
  });
});

describe('CommitmentRepository.getMonthSnapshot', () => {
  it('returns commitments and month payments together with the loaded month', async () => {
    (getCommitments as jest.Mock).mockResolvedValue([baseCommitment]);
    (getPaymentsByMonth as jest.Mock).mockResolvedValue([basePayment]);

    await expect(repo.getMonthSnapshot('2026-05')).resolves.toEqual({
      loadedMonth: '2026-05',
      commitments: [baseCommitment],
      payments: [basePayment],
    });

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(getCommitments).toHaveBeenCalledWith(mockDb);
    expect(getPaymentsByMonth).toHaveBeenCalledWith(mockDb, '2026-05');
  });

  it('does not publish a partial result when the second read fails', async () => {
    (getCommitments as jest.Mock).mockResolvedValue([baseCommitment]);
    (getPaymentsByMonth as jest.Mock).mockRejectedValue(new Error('payment read failed'));

    await expect(repo.getMonthSnapshot('2026-05')).rejects.toThrow('payment read failed');
  });
});

describe('CommitmentRepository.runHousekeeping', () => {
  it('uses one DB handle and one exclusive transaction for the complete work unit', async () => {
    const commitment = {
      ...baseCommitment,
      start_date: '2026-05-08',
      duration_type: DurationType.AfterCount,
      end_after_count: 1,
    };
    (getCommitments as jest.Mock).mockResolvedValue([commitment]);

    await repo.runHousekeeping(new Date('2026-05-08T10:11:12.000Z'));

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(mockDb.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(getCommitments).toHaveBeenCalledWith(transactionDb);
    expect(getActiveCommitmentDueDates).toHaveBeenCalledWith(transactionDb);
    expect(insertPaymentRows).toHaveBeenCalledWith(transactionDb, [
      expect.objectContaining({
        id: 'test-uuid-1234',
        commitment_id: 'c-1',
        due_date: '2026-05-08',
        status: CommitmentPaymentStatus.Due,
        created_at: '2026-05-08T10:11:12.000Z',
        updated_at: '2026-05-08T10:11:12.000Z',
      }),
    ]);
    expect(deactivateExpiredCommitments).toHaveBeenCalledWith(
      transactionDb,
      '2026-05-08',
      '2026-05-08T10:11:12.000Z',
    );
  });
});

describe('CommitmentRepository.getPaymentsByCommitment', () => {
  it('calls getPaymentsByCommitment with db and commitmentId', async () => {
    const expected = [basePayment];
    (getPaymentsByCommitment as jest.Mock).mockResolvedValue(expected);

    const result = await repo.getPaymentsByCommitment('c-1');

    expect(getPaymentsByCommitment).toHaveBeenCalledWith(mockDb, 'c-1');
    expect(result).toBe(expected);
  });
});

describe('CommitmentRepository.getPaymentById', () => {
  it('calls getPaymentById with db and id, returns payment', async () => {
    (getPaymentById as jest.Mock).mockResolvedValue(basePayment);

    const result = await repo.getPaymentById('p-1');

    expect(getPaymentById).toHaveBeenCalledWith(mockDb, 'p-1');
    expect(result).toBe(basePayment);
  });

  it('returns undefined when payment not found', async () => {
    const result = await repo.getPaymentById('nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('CommitmentRepository.getLastPaidPayment', () => {
  it('calls getLastPaidPayment with db and commitmentId', async () => {
    const paidPayment = { ...basePayment, status: CommitmentPaymentStatus.Paid };
    (getLastPaidPayment as jest.Mock).mockResolvedValue(paidPayment);

    const result = await repo.getLastPaidPayment('c-1');

    expect(getLastPaidPayment).toHaveBeenCalledWith(mockDb, 'c-1');
    expect(result).toBe(paidPayment);
  });

  it('returns undefined when no paid payment found', async () => {
    const result = await repo.getLastPaidPayment('c-1');
    expect(result).toBeUndefined();
  });
});

describe('CommitmentRepository.getPaidCount', () => {
  it('calls getPaidCountByCommitment with db and commitmentId', async () => {
    (getPaidCountByCommitment as jest.Mock).mockResolvedValue(3);

    const result = await repo.getPaidCount('c-1');

    expect(getPaidCountByCommitment).toHaveBeenCalledWith(mockDb, 'c-1');
    expect(result).toBe(3);
  });
});

describe('CommitmentRepository.getExistingDueDates', () => {
  it('calls getExistingDueDates with db and commitmentId', async () => {
    const dates = ['2026-05-01', '2026-06-01'];
    (getExistingDueDates as jest.Mock).mockResolvedValue(dates);

    const result = await repo.getExistingDueDates('c-1');

    expect(getExistingDueDates).toHaveBeenCalledWith(mockDb, 'c-1');
    expect(result).toBe(dates);
  });
});

describe('CommitmentRepository.insertPayments', () => {
  it('calls addPayments with db and payments array', async () => {
    const payments = [basePayment];

    await repo.insertPayments(payments);

    expect(addPayments).toHaveBeenCalledWith(mockDb, payments);
  });
});

describe('CommitmentRepository.deleteUnpaidPayments', () => {
  it('calls deleteUnpaidPaymentsByCommitment with db and commitmentId', async () => {
    await repo.deleteUnpaidPayments('c-1');

    expect(deleteUnpaidPaymentsByCommitment).toHaveBeenCalledWith(mockDb, 'c-1');
  });
});

describe('CommitmentRepository.markAsPaid', () => {
  const details: PaymentDetails = {
    amount_paid: 250,
    account_id: 'acc-1',
    paid_date: '2026-05-08',
  };

  it('calls markCommitmentAsPaid with a native transaction and account delta', async () => {
    await repo.markAsPaid('p-1', details, baseCommitment);

    expect(markCommitmentAsPaid).toHaveBeenCalledTimes(1);
    const [calledDb, calledPaymentId, calledDetails, calledTx, calledDelta] = (
      markCommitmentAsPaid as jest.Mock
    ).mock.calls[0];
    expect(calledDb).toBe(mockDb);
    expect(calledPaymentId).toBe('p-1');
    expect(calledDetails).toBe(details);
    expect(calledTx.id).toBe('test-uuid-1234');
    expect(calledTx.type).toBe(TransactionType.Expense);
    expect(calledTx.amount).toBe(details.amount_paid);
    expect(calledTx.currency).toBe(baseCommitment.currency);
    expect(calledTx.account_id).toBe(details.account_id);
    expect(calledTx.commitment_payment_id).toBe('p-1');
    expect(calledDelta).toEqual({
      accountId: 'acc-1',
      currentBalance: -250,
      revolvingBalance: 0,
    });
  });

  it.each([
    [Currency.EGP, Currency.EGP, 500, undefined, 500, 500, null],
    [Currency.USD, Currency.EGP, 10, 50, 500, 500, 50],
    [Currency.EGP, Currency.USD, 500, 50, 10, 500, 50],
    [Currency.USD, Currency.USD, 10, 50, 10, 500, 50],
  ] as const)(
    'normalizes %s commitment to %s account',
    async (
      commitmentCurrency,
      accountCurrency,
      faceAmount,
      rate,
      nativeAmount,
      egpAmount,
      storedRate,
    ) => {
      (getAccountByIdIncludingArchived as jest.Mock).mockResolvedValue({
        ...baseAccount,
        currency: accountCurrency,
      });

      await repo.markAsPaid(
        'p-1',
        {
          ...details,
          amount_paid: faceAmount,
          exchange_rate_snapshot: rate,
        },
        { ...baseCommitment, currency: commitmentCurrency },
      );

      const [, , , calledTx] = (markCommitmentAsPaid as jest.Mock).mock.calls[0];
      expect(calledTx).toMatchObject({
        amount: nativeAmount,
        currency: accountCurrency,
        egp_amount: egpAmount,
        exchange_rate: storedRate,
      });
    },
  );

  it('increases liability when a commitment is paid with a credit card', async () => {
    (getAccountByIdIncludingArchived as jest.Mock).mockResolvedValue({
      ...baseAccount,
      type: AccountType.CreditCard,
      current_balance: 1_000,
      revolving_balance: 500,
    });

    await repo.markAsPaid('p-1', details, baseCommitment);

    const [, , , , calledDelta] = (markCommitmentAsPaid as jest.Mock).mock.calls[0];
    expect(calledDelta).toEqual({
      accountId: 'acc-1',
      currentBalance: 250,
      revolvingBalance: 0,
    });
  });
});

describe('CommitmentRepository.markAsSkipped', () => {
  it('calls updatePaymentStatus with skipped status and skipped_date', async () => {
    await repo.markAsSkipped('p-1');

    expect(updatePaymentStatus).toHaveBeenCalledTimes(1);
    const [calledDb, calledId, calledStatus, calledFields] = (updatePaymentStatus as jest.Mock).mock
      .calls[0];
    expect(calledDb).toBe(mockDb);
    expect(calledId).toBe('p-1');
    expect(calledStatus).toBe(CommitmentPaymentStatus.Skipped);
    expect(calledFields.skipped_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
