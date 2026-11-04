import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import {
  planMissingCommitmentPayments,
  selectNewDueDates,
  type ActiveCommitmentDueDate,
} from '@/modules/commitments/repositories/commitment_housekeeping.helpers';
import { makeTestCommitment } from '@/test_helpers/commitment';

const NOW = new Date('2026-05-08T10:11:12.000Z');
const THROUGH = '2026-08-08';

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return makeTestCommitment({
    id: 'fixed',
    name: 'Monthly bill',
    amount: 200,
    category_id: 'cat',
    start_date: '2026-04-08',
    account_id: 'account',
    duration_type: DurationType.AfterCount,
    end_after_count: 3,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

describe('planMissingCommitmentPayments', () => {
  it('plans exact fixed and variable payment defaults from one captured timestamp', () => {
    const ids = ['payment-fixed-overdue', 'payment-fixed-upcoming', 'payment-variable-due'];
    const createId = jest.fn(() => ids.shift()!);
    const commitments = [
      commitment(),
      commitment({
        id: 'variable',
        name: 'Usage bill',
        amount_type: AmountType.Variable,
        amount: null,
        account_id: null,
        start_date: '2026-05-08',
        end_after_count: 1,
      }),
    ];

    const rows = planMissingCommitmentPayments({
      commitments,
      dueDates: [{ commitment_id: 'fixed', due_date: '2026-05-08' }],
      now: NOW,
      throughDate: THROUGH,
      createId,
    });

    expect(rows).toEqual([
      {
        id: 'payment-fixed-overdue',
        commitment_id: 'fixed',
        due_date: '2026-04-08',
        paid_date: null,
        skipped_date: null,
        amount_due: 200,
        amount_paid: null,
        currency: Currency.EGP,
        exchange_rate_snapshot: null,
        account_id: 'account',
        transaction_id: null,
        notes: null,
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
      },
      {
        id: 'payment-fixed-upcoming',
        commitment_id: 'fixed',
        due_date: '2026-06-08',
        paid_date: null,
        skipped_date: null,
        amount_due: 200,
        amount_paid: null,
        currency: Currency.EGP,
        exchange_rate_snapshot: null,
        account_id: 'account',
        transaction_id: null,
        notes: null,
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
      },
      {
        id: 'payment-variable-due',
        commitment_id: 'variable',
        due_date: '2026-05-08',
        paid_date: null,
        skipped_date: null,
        amount_due: null,
        amount_paid: null,
        currency: Currency.EGP,
        exchange_rate_snapshot: null,
        account_id: null,
        transaction_id: null,
        notes: null,
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
      },
    ]);
    expect(createId).toHaveBeenCalledTimes(3);
  });

  it('uses recurrence boundaries and suppresses every existing due date regardless of status', () => {
    const finite = commitment({
      id: 'finite',
      start_date: '2024-02-29',
      recurrence_period: RecurrencePeriod.Years,
      duration_type: DurationType.UntilDate,
      end_date: '2026-02-28',
      end_after_count: null,
    });
    const existing: ActiveCommitmentDueDate[] = [
      { commitment_id: 'finite', due_date: '2024-02-29' },
      { commitment_id: 'finite', due_date: '2025-02-28' },
    ];

    const rows = planMissingCommitmentPayments({
      commitments: [finite],
      dueDates: existing,
      now: NOW,
      throughDate: THROUGH,
      createId: () => 'last-payment',
    });

    expect(rows.map((row) => row.due_date)).toEqual(['2026-02-28']);
  });

  it('is idempotent when planned due dates are supplied on a second pass', () => {
    const input = {
      commitments: [commitment()],
      dueDates: [] as ActiveCommitmentDueDate[],
      now: NOW,
      throughDate: THROUGH,
      createId: jest.fn(() => 'generated'),
    };
    const first = planMissingCommitmentPayments(input);

    const second = planMissingCommitmentPayments({
      ...input,
      dueDates: first.map((row) => ({
        commitment_id: row.commitment_id,
        due_date: row.due_date,
      })),
    });

    expect(first).toHaveLength(3);
    expect(second).toEqual([]);
  });

  it('ignores inactive commitments without consuming IDs', () => {
    const createId = jest.fn(() => 'unused');

    expect(
      planMissingCommitmentPayments({
        commitments: [commitment({ is_active: 0 })],
        dueDates: [],
        now: NOW,
        throughDate: THROUGH,
        createId,
      }),
    ).toEqual([]);
    expect(createId).not.toHaveBeenCalled();
  });
});

describe('planMissingCommitmentPayments — after-N keeps N rows in all', () => {
  function plannedDates(overrides: Partial<Commitment>, heldDates: string[]): string[] {
    return planMissingCommitmentPayments({
      commitments: [commitment(overrides)],
      dueDates: heldDates.map((due_date) => ({ commitment_id: 'fixed', due_date })),
      now: NOW,
      throughDate: THROUGH,
      createId: () => 'generated',
    }).map((row) => row.due_date);
  }

  it('plans only the rows the held dates leave of N on a moved schedule', () => {
    expect(
      plannedDates({ start_date: '2026-01-15', end_after_count: 3 }, ['2026-01-01', '2026-02-01']),
    ).toEqual(['2026-01-15']);
  });

  it('plans nothing when N dates are already held off the new schedule', () => {
    expect(
      plannedDates({ start_date: '2026-01-15', end_after_count: 3 }, [
        '2026-01-01',
        '2026-02-01',
        '2026-03-01',
      ]),
    ).toEqual([]);
  });

  it('clamps a 31st start to each month end and stops at N rows', () => {
    expect(
      plannedDates({ start_date: '2026-01-31', end_after_count: 4 }, ['2026-01-31', '2026-01-15']),
    ).toEqual(['2026-02-28', '2026-03-31']);
  });

  it('clamps a leap-day yearly start to 28 February and stops at N rows', () => {
    expect(
      plannedDates(
        {
          start_date: '2024-02-29',
          recurrence_period: RecurrencePeriod.Years,
          end_after_count: 3,
        },
        ['2023-06-01'],
      ),
    ).toEqual(['2024-02-29', '2025-02-28']);
  });
});

describe('planMissingCommitmentPayments — rows through the window end', () => {
  const daily = {
    recurrence_period: RecurrencePeriod.Days,
    start_date: '2026-01-01',
    duration_type: DurationType.Forever,
    end_after_count: null,
  };

  it('plans every daily row from the start date through the window end, past the 64th', () => {
    const rows = planMissingCommitmentPayments({
      commitments: [commitment(daily)],
      dueDates: [],
      now: NOW,
      throughDate: '2026-08-08',
      createId: () => 'generated',
    });

    expect(rows).toHaveLength(220);
    expect(rows[0].due_date).toBe('2026-01-01');
    expect(rows.at(-1)?.due_date).toBe('2026-08-08');
  });

  it('tops an after-N commitment holding 70 rows up to N and no further', () => {
    const held = Array.from({ length: 70 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, 1 + index));
      return { commitment_id: 'fixed', due_date: date.toISOString().slice(0, 10) };
    });

    const rows = planMissingCommitmentPayments({
      commitments: [
        commitment({ ...daily, duration_type: DurationType.AfterCount, end_after_count: 100 }),
      ],
      dueDates: held,
      now: NOW,
      throughDate: '2026-12-31',
      createId: () => 'generated',
    });

    expect(held.at(-1)?.due_date).toBe('2026-03-11');
    expect(rows).toHaveLength(30);
    expect(rows[0].due_date).toBe('2026-03-12');
    expect(rows.at(-1)?.due_date).toBe('2026-04-10');
  });

  it('plans no row for a stopped commitment while a running one in the same pass reaches the end', () => {
    const rows = planMissingCommitmentPayments({
      commitments: [
        commitment({ ...daily, id: 'running' }),
        commitment({ ...daily, id: 'stopped', is_active: 0 }),
      ],
      dueDates: [],
      now: NOW,
      throughDate: '2030-12-31',
      createId: () => 'generated',
    });

    expect(rows.filter((row) => row.commitment_id === 'stopped')).toEqual([]);
    const running = rows.filter((row) => row.commitment_id === 'running');
    expect(running.at(-1)?.due_date).toBe('2030-12-31');
  });
});

describe('selectNewDueDates (MA-280)', () => {
  const DATES = [
    '2026-01-20',
    '2026-02-20',
    '2026-03-20',
    '2026-04-20',
    '2026-05-20',
    '2026-06-20',
    '2026-07-20',
  ];
  const FOREVER = { durationType: DurationType.Forever, endAfterCount: null };

  it('returns every date, in a new array, when none is held', () => {
    const selected = selectNewDueDates(DATES, new Set(), FOREVER);

    expect(selected).toEqual(DATES);
    expect(selected).not.toBe(DATES);
  });

  it('skips a held date and keeps the order of the rest', () => {
    expect(selectNewDueDates(DATES.slice(0, 3), new Set(['2026-02-20']), FOREVER)).toEqual([
      '2026-01-20',
      '2026-03-20',
    ]);
  });

  it('takes 3 dates for After 5 holding 2, skipping the held ones', () => {
    expect(
      selectNewDueDates(DATES, new Set(['2026-01-20', '2026-03-20']), {
        durationType: DurationType.AfterCount,
        endAfterCount: 5,
      }),
    ).toEqual(['2026-02-20', '2026-04-20', '2026-05-20']);
  });

  it.each([
    ['exactly N', ['2026-01-20', '2026-02-20']],
    ['more than N', ['2026-01-20', '2026-02-20', '2025-12-20']],
  ])('returns no date for After 2 holding %s dates', (_name, held) => {
    expect(
      selectNewDueDates(DATES, new Set(held), {
        durationType: DurationType.AfterCount,
        endAfterCount: 2,
      }),
    ).toEqual([]);
  });

  it('returns every date not held for After with no count', () => {
    expect(
      selectNewDueDates(DATES, new Set(['2026-04-20']), {
        durationType: DurationType.AfterCount,
        endAfterCount: null,
      }),
    ).toEqual(DATES.filter((date) => date !== '2026-04-20'));
  });

  it('ignores the count on Forever', () => {
    expect(
      selectNewDueDates(DATES, new Set(), { durationType: DurationType.Forever, endAfterCount: 1 }),
    ).toEqual(DATES);
  });
});
