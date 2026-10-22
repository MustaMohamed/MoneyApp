import { AccountType, AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import {
  getPaymentMonthAggregate,
  getPaymentsByMonth,
  type PaymentMonthAggregateScope,
} from '@/modules/commitments/database/commitment_payments';
import {
  type CommitmentHeldBucket,
  type CommitmentMonthAggregate,
  computeCommitmentMonthTotals,
  HELD_BUCKETS,
  type HeldBucketName,
} from '@/modules/commitments/domain/commitment_month_totals';
import { sumCommitmentRowsEgp } from '@/modules/commitments/domain/commitment_section_sums';
import {
  carriedDueBound,
  isDueInMonth,
  resolvePaymentState,
} from '@/modules/commitments/domain/payment_state';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { bridgeBetterSQLite, getExpoSQLiteTestDatabase } from '@/test_helpers/sqlite';
import {
  createSeededDatabase,
  explainQueryPlan,
  insertRecords,
  type RealSQLiteDatabase,
} from '@/test_helpers/sqlite_fixtures';
import { makeTestAccount, makeTestTransaction } from '@/test_helpers/transaction';

const NOW = '2026-05-01T12:00:00.000Z';

const ACCOUNTS = [
  makeTestAccount({ id: 'acc_a', name: 'Current', type: AccountType.Bank, sort_order: 0 }),
  makeTestAccount({ id: 'acc_b', name: 'Savings', type: AccountType.Bank, sort_order: 1 }),
  makeTestAccount({
    id: 'acc_usd',
    name: 'Dollars',
    type: AccountType.Bank,
    currency: Currency.USD,
    sort_order: 2,
  }),
];

function commitment(overrides: Partial<Commitment> & Pick<Commitment, 'id'>): Commitment {
  return makeTestCommitment({
    name: overrides.id,
    amount: 200,
    category_id: 'cat_housing',
    account_id: 'acc_a',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });
}

const COMMITMENTS: Commitment[] = [
  commitment({ id: 'c_egp' }),
  commitment({ id: 'c_usd', amount: 10, currency: Currency.USD }),
  commitment({ id: 'c_var', amount_type: AmountType.Variable, amount: null }),
  commitment({ id: 'c_bare', amount: 300, account_id: null }),
];

function payment(
  overrides: Partial<CommitmentPayment> & Pick<CommitmentPayment, 'id' | 'due_date'>,
): CommitmentPayment {
  return makeTestPayment({
    commitment_id: 'c_egp',
    amount_due: 200,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  });
}

function usdPayment(
  overrides: Partial<CommitmentPayment> & Pick<CommitmentPayment, 'id' | 'due_date'>,
): CommitmentPayment {
  return payment({ commitment_id: 'c_usd', currency: Currency.USD, amount_due: 10, ...overrides });
}

function skipped(
  overrides: Partial<CommitmentPayment> & Pick<CommitmentPayment, 'id' | 'due_date'>,
): CommitmentPayment {
  return payment({ skipped_date: overrides.due_date, ...overrides });
}

interface PaidSpec {
  id: string;
  dueDate: string;
  paidDate: string;
  commitmentId?: string;
  currency?: Currency;
  amountDue?: number | null;
  amountPaid: number;
  accountId: string;
  transaction: Pick<Transaction, 'currency' | 'amount' | 'egp_amount'> &
    Partial<Pick<Transaction, 'exchange_rate'>>;
}

interface Seed {
  payments: CommitmentPayment[];
  transactions: Transaction[];
}

function paid(spec: PaidSpec): Seed {
  const transactionId = `tx_${spec.id}`;
  return {
    transactions: [
      makeTestTransaction({
        id: transactionId,
        account_id: spec.accountId,
        category_id: 'cat_housing',
        transaction_date: spec.paidDate,
        commitment_payment_id: spec.id,
        created_at: NOW,
        updated_at: NOW,
        exchange_rate: null,
        ...spec.transaction,
      }),
    ],
    payments: [
      payment({
        id: spec.id,
        commitment_id: spec.commitmentId ?? 'c_egp',
        due_date: spec.dueDate,
        paid_date: spec.paidDate,
        amount_due: spec.amountDue === undefined ? 200 : spec.amountDue,
        amount_paid: spec.amountPaid,
        currency: spec.currency ?? Currency.EGP,
        account_id: spec.accountId,
        transaction_id: transactionId,
      }),
    ],
  };
}

function rows(...parts: (Seed | CommitmentPayment)[]): Seed {
  return parts.reduce<Seed>(
    (seed, part) =>
      'payments' in part
        ? {
            payments: [...seed.payments, ...part.payments],
            transactions: [...seed.transactions, ...part.transactions],
          }
        : { payments: [...seed.payments, part], transactions: seed.transactions },
    { payments: [], transactions: [] },
  );
}

function held(overrides: Partial<CommitmentHeldBucket> = {}): CommitmentHeldBucket {
  return { egp: 0, usd: 0, count: 0, hasVariable: false, ...overrides };
}

const EMPTY: CommitmentMonthAggregate = {
  paid: { egp: 0, count: 0 },
  skipped: held(),
  overdue: held(),
  due: held(),
  upcoming: held(),
  carried: held(),
};

const sqlite = getExpoSQLiteTestDatabase();
const db = sqlite.database;
let realDb: RealSQLiteDatabase;

function seed({ payments, transactions }: Seed): void {
  insertRecords(realDb, 'transactions', transactions);
  insertRecords(realDb, 'commitment_payments', payments);
}

function aggregateFor(
  yearMonth: string,
  today: string,
  accountId?: string,
): Promise<CommitmentMonthAggregate> {
  const scope: PaymentMonthAggregateScope = {
    yearMonth,
    today,
    carriedBefore: carriedDueBound(yearMonth, today),
    ...(accountId === undefined ? {} : { accountId }),
  };
  return getPaymentMonthAggregate(db, scope);
}

beforeAll(() => {
  realDb = createSeededDatabase([['accounts', ACCOUNTS]]);
  bridgeBetterSQLite(sqlite, realDb);
});

beforeEach(() => {
  realDb.exec(
    'DELETE FROM commitment_payments; DELETE FROM transactions; DELETE FROM commitments;',
  );
  insertRecords(realDb, 'commitments', COMMITMENTS);
});

afterAll(() => {
  realDb.close();
  sqlite.reset();
});

describe('getPaymentMonthAggregate — paid rows', () => {
  it('sums the transactions’ EGP amounts over all four currency pairs, never amount_paid', async () => {
    seed(
      rows(
        paid({
          id: 'egp_to_egp',
          dueDate: '2026-05-02',
          paidDate: '2026-05-02',
          amountPaid: 200,
          accountId: 'acc_a',
          transaction: { currency: Currency.EGP, amount: 200, egp_amount: 200 },
        }),
        paid({
          id: 'egp_to_usd',
          dueDate: '2026-05-03',
          paidDate: '2026-05-03',
          amountPaid: 4,
          accountId: 'acc_usd',
          transaction: { currency: Currency.USD, amount: 4, egp_amount: 200, exchange_rate: 50 },
        }),
        paid({
          id: 'usd_to_egp',
          commitmentId: 'c_usd',
          currency: Currency.USD,
          amountDue: 10,
          dueDate: '2026-05-02',
          paidDate: '2026-05-02',
          amountPaid: 500,
          accountId: 'acc_a',
          transaction: { currency: Currency.EGP, amount: 500, egp_amount: 500, exchange_rate: 50 },
        }),
        paid({
          id: 'usd_to_usd',
          commitmentId: 'c_usd',
          currency: Currency.USD,
          amountDue: 10,
          dueDate: '2026-05-03',
          paidDate: '2026-05-03',
          amountPaid: 10,
          accountId: 'acc_usd',
          transaction: { currency: Currency.USD, amount: 10, egp_amount: 485, exchange_rate: 48.5 },
        }),
      ),
    );

    const aggregate = await aggregateFor('2026-05', '2026-05-20');

    expect(aggregate).toEqual({ ...EMPTY, paid: { egp: 1385, count: 4 } });
  });

  it('counts a late payment in its due month, not its paid month', async () => {
    seed(
      paid({
        id: 'late',
        dueDate: '2026-05-20',
        paidDate: '2026-06-03',
        amountPaid: 200,
        accountId: 'acc_a',
        transaction: { currency: Currency.EGP, amount: 200, egp_amount: 200 },
      }),
    );

    expect((await aggregateFor('2026-05', '2026-06-10')).paid).toEqual({ egp: 200, count: 1 });
    expect(await aggregateFor('2026-06', '2026-06-10')).toEqual(EMPTY);
  });
});

describe('getPaymentMonthAggregate — held buckets', () => {
  it('keeps each bucket’s EGP and USD legs apart', async () => {
    seed(
      rows(
        payment({ id: 'overdue_egp', due_date: '2026-05-10', amount_due: 200 }),
        usdPayment({ id: 'overdue_usd', due_date: '2026-05-10', amount_due: 10 }),
        payment({ id: 'due_egp', due_date: '2026-05-15', amount_due: 210 }),
        usdPayment({ id: 'due_usd', due_date: '2026-05-15', amount_due: 11 }),
        payment({ id: 'upcoming_egp', due_date: '2026-05-20', amount_due: 220 }),
        usdPayment({ id: 'upcoming_usd', due_date: '2026-05-20', amount_due: 12.5 }),
        payment({ id: 'carried_egp', due_date: '2026-04-10', amount_due: 230 }),
        usdPayment({ id: 'carried_usd', due_date: '2026-04-10', amount_due: 13 }),
        skipped({ id: 'skipped_egp', due_date: '2026-05-05', amount_due: 240 }),
        skipped({
          id: 'skipped_usd',
          commitment_id: 'c_usd',
          currency: Currency.USD,
          due_date: '2026-05-05',
          amount_due: 14,
        }),
      ),
    );

    expect(await aggregateFor('2026-05', '2026-05-15')).toEqual({
      paid: { egp: 0, count: 0 },
      overdue: held({ egp: 200, usd: 10, count: 2 }),
      due: held({ egp: 210, usd: 11, count: 2 }),
      upcoming: held({ egp: 220, usd: 12.5, count: 2 }),
      carried: held({ egp: 230, usd: 13, count: 2 }),
      skipped: held({ egp: 240, usd: 14, count: 2 }),
    });
  });

  it('splits the month’s unpaid rows by their due date against today', async () => {
    seed(
      rows(
        payment({ id: 'before', due_date: '2026-05-07', amount_due: 101 }),
        payment({ id: 'on', due_date: '2026-05-08', amount_due: 102 }),
        payment({ id: 'after', due_date: '2026-05-09', amount_due: 103 }),
      ),
    );

    expect(await aggregateFor('2026-05', '2026-05-08')).toEqual({
      ...EMPTY,
      overdue: held({ egp: 101, count: 1 }),
      due: held({ egp: 102, count: 1 }),
      upcoming: held({ egp: 103, count: 1 }),
    });
  });

  it('on the month’s last day, a row that day is due, the next day is outside, the prior month is carried', async () => {
    seed(
      rows(
        payment({ id: 'last_day', due_date: '2026-05-31', amount_due: 200 }),
        payment({ id: 'next_month', due_date: '2026-06-01', amount_due: 999 }),
        payment({ id: 'prior_month', due_date: '2026-04-30', amount_due: 300 }),
      ),
    );

    expect(await aggregateFor('2026-05', '2026-05-31')).toEqual({
      ...EMPTY,
      due: held({ egp: 200, count: 1 }),
      carried: held({ egp: 300, count: 1 }),
    });
  });

  it('counts a leap-day row in its February and carries it into March while unpaid', async () => {
    seed(
      rows(
        payment({ id: 'leap_day', due_date: '2028-02-29', amount_due: 200 }),
        usdPayment({ id: 'march_first', due_date: '2028-03-01', amount_due: 10 }),
      ),
    );

    expect(await aggregateFor('2028-02', '2028-02-29')).toEqual({
      ...EMPTY,
      due: held({ egp: 200, count: 1 }),
    });
    expect(await aggregateFor('2028-03', '2028-03-10')).toEqual({
      ...EMPTY,
      overdue: held({ usd: 10, count: 1 }),
      carried: held({ egp: 200, count: 1 }),
    });
  });
});

describe('getPaymentMonthAggregate — the carried bound', () => {
  beforeEach(() => {
    seed(
      rows(
        payment({ id: 'old_unpaid', due_date: '2026-03-10', amount_due: 200 }),
        paid({
          id: 'old_paid',
          dueDate: '2026-03-20',
          paidDate: '2026-03-20',
          amountPaid: 200,
          accountId: 'acc_a',
          transaction: { currency: Currency.EGP, amount: 200, egp_amount: 200 },
        }),
        skipped({ id: 'old_skipped', due_date: '2026-03-25', amount_due: 200 }),
        usdPayment({ id: 'may_before_today', due_date: '2026-05-10', amount_due: 10 }),
        usdPayment({ id: 'may_after_today', due_date: '2026-05-20', amount_due: 12 }),
      ),
    );
  });

  it('a past month carries the unpaid rows due before its first day', async () => {
    expect(await aggregateFor('2026-04', '2026-05-15')).toEqual({
      ...EMPTY,
      carried: held({ egp: 200, count: 1 }),
    });
  });

  it('the current month carries the unpaid rows due before its first day', async () => {
    expect(await aggregateFor('2026-05', '2026-05-15')).toEqual({
      ...EMPTY,
      overdue: held({ usd: 10, count: 1 }),
      upcoming: held({ usd: 12, count: 1 }),
      carried: held({ egp: 200, count: 1 }),
    });
  });

  it('a future month carries the unpaid rows due before today', async () => {
    expect(await aggregateFor('2026-07', '2026-05-15')).toEqual({
      ...EMPTY,
      carried: held({ egp: 200, usd: 10, count: 2 }),
    });
  });
});

describe('getPaymentMonthAggregate — variable rows', () => {
  const FIXED_ROWS: Record<HeldBucketName, CommitmentPayment> = {
    overdue: payment({ id: 'fixed_overdue', due_date: '2026-05-10', amount_due: 200 }),
    due: payment({ id: 'fixed_due', due_date: '2026-05-15', amount_due: 200 }),
    upcoming: payment({ id: 'fixed_upcoming', due_date: '2026-05-20', amount_due: 200 }),
    carried: payment({ id: 'fixed_carried', due_date: '2026-04-10', amount_due: 200 }),
    skipped: skipped({ id: 'fixed_skipped', due_date: '2026-05-05', amount_due: 200 }),
  };

  function variableRow(bucket: HeldBucketName, estimate: number | null): CommitmentPayment {
    const dueDate: Record<HeldBucketName, string> = {
      overdue: '2026-05-11',
      due: '2026-05-15',
      upcoming: '2026-05-21',
      carried: '2026-04-11',
      skipped: '2026-05-06',
    };
    const row = payment({
      id: `variable_${bucket}`,
      commitment_id: 'c_var',
      due_date: dueDate[bucket],
      amount_due: estimate,
    });
    return bucket === 'skipped' ? { ...row, skipped_date: dueDate[bucket] } : row;
  }

  it.each(
    HELD_BUCKETS.flatMap((bucket) => [
      { bucket, estimate: null, adds: 0 },
      { bucket, estimate: 75, adds: 75 },
    ]),
  )(
    'a variable row in $bucket with estimate $estimate flags that bucket alone and adds $adds',
    async ({ bucket, estimate, adds }) => {
      seed(rows(...Object.values(FIXED_ROWS), variableRow(bucket, estimate)));

      const aggregate = await aggregateFor('2026-05', '2026-05-15');

      for (const name of HELD_BUCKETS) {
        expect([name, aggregate[name]]).toEqual([
          name,
          name === bucket
            ? held({ egp: 200 + adds, count: 2, hasVariable: true })
            : held({ egp: 200, count: 1 }),
        ]);
      }
    },
  );

  it('a paid variable row counts its transaction amount, never its estimate, and flags nothing', async () => {
    seed(
      paid({
        id: 'variable_paid',
        commitmentId: 'c_var',
        amountDue: 75,
        dueDate: '2026-05-04',
        paidDate: '2026-05-04',
        amountPaid: 130,
        accountId: 'acc_a',
        transaction: { currency: Currency.EGP, amount: 130, egp_amount: 130 },
      }),
    );

    expect(await aggregateFor('2026-05', '2026-05-15')).toEqual({
      ...EMPTY,
      paid: { egp: 130, count: 1 },
    });
  });

  it('a skipped variable row adds its estimate, 0 without one, and flags the skipped sum', async () => {
    seed(
      rows(
        skipped({
          id: 'skipped_estimate',
          commitment_id: 'c_var',
          due_date: '2026-05-06',
          amount_due: 80,
        }),
        skipped({
          id: 'skipped_no_estimate',
          commitment_id: 'c_var',
          due_date: '2026-05-07',
          amount_due: null,
        }),
      ),
    );

    expect(await aggregateFor('2026-05', '2026-05-15')).toEqual({
      ...EMPTY,
      skipped: held({ egp: 80, count: 2, hasVariable: true }),
    });
  });
});

describe('getPaymentMonthAggregate — the amount a row holds', () => {
  it('an edit to the commitment after a skip leaves the skipped and unpaid figures unchanged', async () => {
    seed(
      rows(
        skipped({ id: 'skipped_before_edit', due_date: '2026-05-05', amount_due: 200 }),
        payment({ id: 'unpaid_before_edit', due_date: '2026-05-20', amount_due: 200 }),
      ),
    );
    const before = await aggregateFor('2026-05', '2026-05-15');

    realDb.prepare("UPDATE commitments SET amount = 900 WHERE id = 'c_egp'").run();
    const after = await aggregateFor('2026-05', '2026-05-15');

    expect(before.skipped.egp).toBe(200);
    expect(after.skipped).toEqual(before.skipped);
    expect(after.upcoming).toEqual(held({ egp: 200, count: 1 }));
  });
});

describe('getPaymentMonthAggregate — one account', () => {
  beforeEach(() => {
    seed(
      rows(
        paid({
          id: 'paid_from_b',
          dueDate: '2026-05-02',
          paidDate: '2026-05-02',
          amountPaid: 200,
          accountId: 'acc_b',
          transaction: { currency: Currency.EGP, amount: 200, egp_amount: 200 },
        }),
        payment({ id: 'due_falls_back', due_date: '2026-05-15', amount_due: 210 }),
        payment({
          id: 'upcoming_own_b',
          due_date: '2026-05-20',
          amount_due: 220,
          account_id: 'acc_b',
        }),
        payment({ id: 'carried_falls_back', due_date: '2026-04-10', amount_due: 230 }),
        skipped({
          id: 'skipped_own_b',
          due_date: '2026-05-05',
          amount_due: 240,
          account_id: 'acc_b',
        }),
        payment({
          id: 'due_no_account',
          commitment_id: 'c_bare',
          due_date: '2026-05-15',
          amount_due: 300,
        }),
      ),
    );
  });

  it('the commitment’s account A holds only the unpaid rows that fall back to it', async () => {
    expect(await aggregateFor('2026-05', '2026-05-15', 'acc_a')).toEqual({
      ...EMPTY,
      due: held({ egp: 210, count: 1 }),
      carried: held({ egp: 230, count: 1 }),
    });
  });

  it('account B holds the row paid from it and the unpaid and skipped rows that name it', async () => {
    expect(await aggregateFor('2026-05', '2026-05-15', 'acc_b')).toEqual({
      ...EMPTY,
      paid: { egp: 200, count: 1 },
      upcoming: held({ egp: 220, count: 1 }),
      skipped: held({ egp: 240, count: 1 }),
    });
  });

  it('no account holds every row, the account-less commitment’s included', async () => {
    expect(await aggregateFor('2026-05', '2026-05-15')).toEqual({
      ...EMPTY,
      paid: { egp: 200, count: 1 },
      due: held({ egp: 510, count: 2 }),
      upcoming: held({ egp: 220, count: 1 }),
      carried: held({ egp: 230, count: 1 }),
      skipped: held({ egp: 240, count: 1 }),
    });
  });
});

describe('getPaymentMonthAggregate — an empty month', () => {
  it('returns every bucket at zero with every flag false', async () => {
    expect(await aggregateFor('2026-06', '2026-06-10')).toEqual(EMPTY);
    expect(await aggregateFor('2026-06', '2026-06-10', 'acc_a')).toEqual(EMPTY);
  });
});

describe('getPaymentMonthAggregate — agreement with resolvePaymentState', () => {
  // Each selected month's first and last day, and the next month's first day: [due date, amount, skipped].
  const MONTH_EDGES: [string, number, boolean][] = [
    ['2026-03-01', 1, false],
    ['2026-03-31', 2, true],
    ['2026-04-01', 4, false],
    ['2026-04-30', 8, true],
    ['2026-05-01', 16, true],
    ['2026-05-31', 32, false],
    ['2026-06-01', 64, false],
    ['2026-07-01', 128, true],
    ['2026-07-31', 256, false],
    ['2026-08-01', 512, false],
  ];

  beforeEach(() => {
    seed(
      rows(
        payment({ id: 'old_unpaid', due_date: '2026-03-10' }),
        skipped({ id: 'old_skipped', due_date: '2026-03-12' }),
        payment({ id: 'april_unpaid', due_date: '2026-04-10' }),
        paid({
          id: 'april_paid',
          dueDate: '2026-04-20',
          paidDate: '2026-04-21',
          amountPaid: 200,
          accountId: 'acc_a',
          transaction: { currency: Currency.EGP, amount: 200, egp_amount: 200 },
        }),
        paid({
          id: 'may_paid',
          dueDate: '2026-05-02',
          paidDate: '2026-05-02',
          amountPaid: 200,
          accountId: 'acc_a',
          transaction: { currency: Currency.EGP, amount: 200, egp_amount: 200 },
        }),
        skipped({ id: 'may_skipped', due_date: '2026-05-05' }),
        payment({ id: 'may_overdue', due_date: '2026-05-10' }),
        usdPayment({ id: 'may_due', due_date: '2026-05-15' }),
        payment({ id: 'may_upcoming', commitment_id: 'c_var', due_date: '2026-05-20' }),
        payment({ id: 'july_upcoming', due_date: '2026-07-05' }),
        ...MONTH_EDGES.map(([dueDate, amount, isSkipped]) =>
          (isSkipped ? skipped : payment)({
            id: `edge_${dueDate}`,
            commitment_id: 'c_bare',
            due_date: dueDate,
            amount_due: amount,
          }),
        ),
      ),
    );
  });

  it.each([
    ['2026-04', '2026-05-15'],
    ['2026-05', '2026-05-15'],
    ['2026-07', '2026-05-15'],
    ['2026-03', '2026-03-12'],
  ])(
    '%s with today %s: the per-state counts and sums match the loaded rows',
    async (yearMonth, today) => {
      const loaded = await getPaymentsByMonth(db, yearMonth, carriedDueBound(yearMonth, today));
      const inState = (state: CommitmentPaymentStatus) =>
        loaded.filter((row) => resolvePaymentState(row, today) === state);
      const countOf = (state: CommitmentPaymentStatus) => inState(state).length;
      const legsOf = (state: CommitmentPaymentStatus) => {
        const sum = (currency: Currency) =>
          inState(state)
            .filter((row) => row.currency === currency)
            .reduce((total, row) => total + (row.amount_due ?? 0), 0);
        return { egp: sum(Currency.EGP), usd: sum(Currency.USD) };
      };

      const aggregate = await aggregateFor(yearMonth, today);

      expect(loaded.length).toBeGreaterThan(0);
      expect({
        paid: aggregate.paid.count,
        skipped: aggregate.skipped.count,
        overdue: aggregate.overdue.count + aggregate.carried.count,
        due: aggregate.due.count,
        upcoming: aggregate.upcoming.count,
      }).toEqual({
        paid: countOf(CommitmentPaymentStatus.Paid),
        skipped: countOf(CommitmentPaymentStatus.Skipped),
        overdue: countOf(CommitmentPaymentStatus.Overdue),
        due: countOf(CommitmentPaymentStatus.Due),
        upcoming: countOf(CommitmentPaymentStatus.Upcoming),
      });
      expect({
        skipped: { egp: aggregate.skipped.egp, usd: aggregate.skipped.usd },
        overdue: {
          egp: aggregate.overdue.egp + aggregate.carried.egp,
          usd: aggregate.overdue.usd + aggregate.carried.usd,
        },
        due: { egp: aggregate.due.egp, usd: aggregate.due.usd },
        upcoming: { egp: aggregate.upcoming.egp, usd: aggregate.upcoming.usd },
      }).toEqual({
        skipped: legsOf(CommitmentPaymentStatus.Skipped),
        overdue: legsOf(CommitmentPaymentStatus.Overdue),
        due: legsOf(CommitmentPaymentStatus.Due),
        upcoming: legsOf(CommitmentPaymentStatus.Upcoming),
      });
    },
  );

  it.each([
    ['2026-04', '2026-05-15'],
    ['2026-05', '2026-05-15'],
    ['2026-07', '2026-05-15'],
    ['2026-03', '2026-03-12'],
  ])(
    '%s with today %s: the section sums of the loaded paid and skipped rows match the hero figures',
    async (yearMonth, today) => {
      const rate = 50.5;
      seed(
        rows(
          skipped({
            id: 'may_skipped_variable',
            commitment_id: 'c_var',
            due_date: '2026-05-06',
            amount_due: 600,
          }),
          skipped({
            id: 'may_skipped_usd',
            commitment_id: 'c_usd',
            currency: Currency.USD,
            due_date: '2026-05-07',
            amount_due: 10,
          }),
          paid({
            id: 'may_paid_usd',
            dueDate: '2026-05-03',
            paidDate: '2026-05-03',
            commitmentId: 'c_usd',
            currency: Currency.USD,
            amountDue: 10,
            amountPaid: 10,
            accountId: 'acc_usd',
            transaction: {
              currency: Currency.USD,
              amount: 10,
              egp_amount: 505.25,
              exchange_rate: 50.525,
            },
          }),
        ),
      );
      const variableIds = new Set(
        COMMITMENTS.filter((item) => item.amount_type === AmountType.Variable).map(
          (item) => item.id,
        ),
      );
      const loaded = await getPaymentsByMonth(db, yearMonth, carriedDueBound(yearMonth, today));
      const sumOf = (state: CommitmentPaymentStatus) => {
        const total = sumCommitmentRowsEgp(
          loaded
            .filter((row) => resolvePaymentState(row, today) === state)
            .filter((row) => isDueInMonth(row, yearMonth))
            .map((row) => ({ payment: row, isVariable: variableIds.has(row.commitment_id) })),
          rate,
        );
        return { egp: total?.egp, showTilde: total?.showTilde };
      };

      const totals = computeCommitmentMonthTotals(await aggregateFor(yearMonth, today), rate);

      expect(sumOf(CommitmentPaymentStatus.Paid)).toEqual(totals.paid);
      expect(sumOf(CommitmentPaymentStatus.Skipped)).toEqual(totals.skipped);
    },
  );
});

describe('getPaymentMonthAggregate — query plan', () => {
  const DUE_DATE_SEARCH = /^SEARCH payment USING INDEX idx_cp_due_date\b/;

  it.each<{ shape: string; accountId?: string }>([
    { shape: 'every account' },
    { shape: 'one account', accountId: 'acc_a' },
  ])(
    '$shape: one statement, each branch searching payments by the due-date index',
    async ({ accountId }) => {
      sqlite.getFirstAsync.mockClear();
      sqlite.getAllAsync.mockClear();

      await aggregateFor('2026-05', '2026-05-15', accountId);

      expect(sqlite.getAllAsync).not.toHaveBeenCalled();
      expect(sqlite.getFirstAsync).toHaveBeenCalledTimes(1);
      const [sql, ...rest] = sqlite.getFirstAsync.mock.calls[0];
      const plan = explainQueryPlan(realDb, sql, rest);

      expect(plan.filter((detail) => DUE_DATE_SEARCH.test(detail))).toHaveLength(2);
      for (const detail of plan) expect(detail).not.toMatch(/SCAN (payment|commitment)\b/);
    },
  );
});
