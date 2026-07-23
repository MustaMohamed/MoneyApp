import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import {
  planMissingCommitmentPayments,
  type ActiveCommitmentDueDate,
} from '@/modules/commitments/repositories/commitment_housekeeping.helpers';

const NOW = new Date('2026-05-08T10:11:12.000Z');

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'fixed',
    name: 'Monthly bill',
    amount_type: AmountType.Fixed,
    amount: 200,
    currency: Currency.EGP,
    category_id: 'cat',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-04-08',
    account_id: 'account',
    notes: null,
    duration_type: DurationType.AfterCount,
    end_date: null,
    end_after_count: 3,
    is_active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
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
        status: CommitmentPaymentStatus.Overdue,
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
        status: CommitmentPaymentStatus.Upcoming,
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
        status: CommitmentPaymentStatus.Due,
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
      createId: () => 'last-payment',
    });

    expect(rows.map((row) => row.due_date)).toEqual(['2026-02-28']);
  });

  it('is idempotent when planned due dates are supplied on a second pass', () => {
    const input = {
      commitments: [commitment()],
      dueDates: [] as ActiveCommitmentDueDate[],
      now: NOW,
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
        createId,
      }),
    ).toEqual([]);
    expect(createId).not.toHaveBeenCalled();
  });
});
