import { CommitmentPaymentStatus, DurationType } from '@/constants/enums';
import {
  carriedDueBound,
  isDueInMonth,
  isPaidPayment,
  isSkippedPayment,
  isUnpaidPayment,
  resolveCommitmentLifecycle,
  resolvePaymentState,
  resolveUndoSkip,
  type CommitmentLifecycle,
} from '@/modules/commitments/domain/payment_state';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';

interface Dates {
  due_date: string;
  paid_date: string | null;
  skipped_date: string | null;
}

function dates(overrides: Partial<Dates> = {}): Dates {
  return { due_date: '2026-10-31', paid_date: null, skipped_date: null, ...overrides };
}

describe('resolvePaymentState', () => {
  it('reads Paid when the paid date is set, over a set skipped date and any due date', () => {
    for (const due_date of ['2026-10-30', '2026-10-31', '2026-11-01']) {
      expect(
        resolvePaymentState(
          dates({ due_date, paid_date: '2026-10-29', skipped_date: '2026-10-29' }),
          '2026-10-31',
        ),
      ).toBe(CommitmentPaymentStatus.Paid);
    }
  });

  it('reads Skipped when only the skipped date is set, over any due date', () => {
    for (const due_date of ['2026-10-30', '2026-10-31', '2026-11-01']) {
      expect(
        resolvePaymentState(dates({ due_date, skipped_date: '2026-10-29' }), '2026-10-31'),
      ).toBe(CommitmentPaymentStatus.Skipped);
    }
  });

  it.each([
    ['2026-10-30', CommitmentPaymentStatus.Overdue],
    ['2026-10-31', CommitmentPaymentStatus.Due],
    ['2026-11-01', CommitmentPaymentStatus.Upcoming],
  ])('reads an unpaid row due %s against 2026-10-31 as %s', (due_date, expected) => {
    expect(resolvePaymentState(dates({ due_date }), '2026-10-31')).toBe(expected);
  });

  it.each([
    ['2028-02-28', CommitmentPaymentStatus.Overdue],
    ['2028-02-29', CommitmentPaymentStatus.Due],
    ['2028-03-01', CommitmentPaymentStatus.Upcoming],
  ])('reads an unpaid row due %s against the leap day 2028-02-29 as %s', (due_date, expected) => {
    expect(resolvePaymentState(dates({ due_date }), '2028-02-29')).toBe(expected);
  });

  it('reads a row due 2027-02-28 as Overdue on 2027-03-01', () => {
    expect(resolvePaymentState(dates({ due_date: '2027-02-28' }), '2027-03-01')).toBe(
      CommitmentPaymentStatus.Overdue,
    );
  });
});

describe('payment predicates', () => {
  it('reads paid from the paid date alone', () => {
    expect(isPaidPayment(dates({ paid_date: '2026-10-01' }))).toBe(true);
    expect(isPaidPayment(dates({ paid_date: '2026-10-01', skipped_date: '2026-10-01' }))).toBe(
      true,
    );
    expect(isPaidPayment(dates({ skipped_date: '2026-10-01' }))).toBe(false);
    expect(isPaidPayment(dates())).toBe(false);
  });

  it('reads skipped only when the paid date is empty', () => {
    expect(isSkippedPayment(dates({ skipped_date: '2026-10-01' }))).toBe(true);
    expect(isSkippedPayment(dates({ paid_date: '2026-10-01', skipped_date: '2026-10-01' }))).toBe(
      false,
    );
    expect(isSkippedPayment(dates())).toBe(false);
  });

  it('reads unpaid only when both dates are empty', () => {
    expect(isUnpaidPayment(dates())).toBe(true);
    expect(isUnpaidPayment(dates({ paid_date: '2026-10-01' }))).toBe(false);
    expect(isUnpaidPayment(dates({ skipped_date: '2026-10-01' }))).toBe(false);
  });
});

describe('carriedDueBound', () => {
  it.each([
    ['2026-10', '2026-10-21', '2026-10-01'],
    ['2026-12', '2026-10-21', '2026-10-21'],
    ['2026-08', '2026-10-21', '2026-08-01'],
  ])('bounds %s against today %s at %s', (yearMonth, today, expected) => {
    expect(carriedDueBound(yearMonth, today)).toBe(expected);
  });
});

describe('isDueInMonth', () => {
  it.each([
    ['2026-09-30', false],
    ['2026-10-01', true],
    ['2026-10-31', true],
    ['2026-11-01', false],
  ])('reads %s in 2026-10 as %s', (due_date, expected) => {
    expect(isDueInMonth({ due_date }, '2026-10')).toBe(expected);
  });

  it.each([
    ['2028-01-31', false],
    ['2028-02-29', true],
    ['2028-03-01', false],
  ])('reads %s in the leap February 2028-02 as %s', (due_date, expected) => {
    expect(isDueInMonth({ due_date }, '2028-02')).toBe(expected);
  });
});

describe('resolveUndoSkip', () => {
  type UndoCommitment = Pick<
    Commitment,
    'is_active' | 'duration_type' | 'end_date' | 'end_after_count'
  >;
  const TODAY = '2026-05-01';

  function undoCommitment(overrides: Partial<UndoCommitment> = {}): UndoCommitment {
    return {
      is_active: 0,
      duration_type: DurationType.Forever,
      end_date: null,
      end_after_count: null,
      ...overrides,
    };
  }

  it('clears the skip on an active commitment', () => {
    expect(resolveUndoSkip(undoCommitment({ is_active: 1 }), 1, TODAY)).toBe('clear');
  });

  it('reactivates an inactive after-N commitment the skip ended', () => {
    const afterThree = undoCommitment({
      duration_type: DurationType.AfterCount,
      end_after_count: 3,
    });
    expect(resolveUndoSkip(afterThree, 3, TODAY)).toBe('reactivate');
  });

  it('clears the skip on an inactive after-N commitment that stays at N without it', () => {
    const afterThree = undoCommitment({
      duration_type: DurationType.AfterCount,
      end_after_count: 3,
    });
    expect(resolveUndoSkip(afterThree, 4, TODAY)).toBe('clear');
  });

  it('refuses on an inactive after-N commitment short of N, which a Stop ended', () => {
    const afterThree = undoCommitment({
      duration_type: DurationType.AfterCount,
      end_after_count: 3,
    });
    expect(resolveUndoSkip(afterThree, 2, TODAY)).toBe('refuse');
  });

  it('clears the skip on an inactive until-date commitment whose end date is before today', () => {
    const untilApril = undoCommitment({
      duration_type: DurationType.UntilDate,
      end_date: '2026-04-30',
    });
    expect(resolveUndoSkip(untilApril, 1, TODAY)).toBe('clear');
  });

  it('refuses on an inactive until-date commitment whose end date is today', () => {
    const untilToday = undoCommitment({ duration_type: DurationType.UntilDate, end_date: TODAY });
    expect(resolveUndoSkip(untilToday, 1, TODAY)).toBe('refuse');
  });

  it('refuses on an inactive until-date commitment with no end date', () => {
    const untilNull = undoCommitment({ duration_type: DurationType.UntilDate, end_date: null });
    expect(resolveUndoSkip(untilNull, 1, TODAY)).toBe('refuse');
  });

  it('refuses on an inactive forever commitment', () => {
    expect(resolveUndoSkip(undoCommitment(), 1, TODAY)).toBe('refuse');
  });
});

describe('resolveCommitmentLifecycle', () => {
  type LifecycleCommitment = Pick<
    Commitment,
    'is_active' | 'duration_type' | 'end_date' | 'end_after_count'
  >;
  const TODAY = '2026-05-01';

  function lifecycleCommitment(overrides: Partial<LifecycleCommitment> = {}): LifecycleCommitment {
    return {
      is_active: 1,
      duration_type: DurationType.Forever,
      end_date: null,
      end_after_count: null,
      ...overrides,
    };
  }

  it.each<[string, CommitmentLifecycle, Partial<LifecycleCommitment>, number]>([
    ['an active forever commitment', 'active', {}, 0],
    ['an inactive forever commitment, which a Stop ended', 'stopped', { is_active: 0 }, 4],
  ])('reads %s as %s', (_name, expected, overrides, settledCount) => {
    expect(resolveCommitmentLifecycle(lifecycleCommitment(overrides), settledCount, TODAY)).toBe(
      expected,
    );
  });

  describe('after_count', () => {
    it.each<[string, CommitmentLifecycle, Partial<LifecycleCommitment>, number]>([
      [
        'an active after-3 commitment with 3 settled, before the sweep runs',
        'ended',
        { duration_type: DurationType.AfterCount, end_after_count: 3 },
        3,
      ],
      [
        'an inactive after-3 commitment with 3 settled',
        'ended',
        { is_active: 0, duration_type: DurationType.AfterCount, end_after_count: 3 },
        3,
      ],
      [
        'an inactive after-3 commitment with 2 settled, which a Stop ended',
        'stopped',
        { is_active: 0, duration_type: DurationType.AfterCount, end_after_count: 3 },
        2,
      ],
      [
        'an active after-3 commitment with 2 settled',
        'active',
        { duration_type: DurationType.AfterCount, end_after_count: 3 },
        2,
      ],
      [
        'an inactive after-count commitment with no count',
        'stopped',
        { is_active: 0, duration_type: DurationType.AfterCount, end_after_count: null },
        5,
      ],
    ])('reads %s as %s', (_name, expected, overrides, settledCount) => {
      expect(resolveCommitmentLifecycle(lifecycleCommitment(overrides), settledCount, TODAY)).toBe(
        expected,
      );
    });
  });

  describe('until_date', () => {
    it.each<[number, CommitmentLifecycle, CommitmentLifecycle]>([
      [1, 'ended', 'active'],
      [0, 'ended', 'stopped'],
    ])(
      'at is_active %s reads an end date the day before today as %s, and on today as %s',
      (isActive, dayBefore, onToday) => {
        const until = (end_date: string) =>
          lifecycleCommitment({
            is_active: isActive,
            duration_type: DurationType.UntilDate,
            end_date,
          });

        expect(resolveCommitmentLifecycle(until('2026-04-30'), 0, TODAY)).toBe(dayBefore);
        expect(resolveCommitmentLifecycle(until(TODAY), 0, TODAY)).toBe(onToday);
      },
    );

    it.each<[string, string, CommitmentLifecycle]>([
      ['2026-01-31', '2026-02-01', 'ended'],
      ['2026-01-31', '2026-01-31', 'active'],
      ['2026-04-30', '2026-05-01', 'ended'],
      ['2026-04-30', '2026-04-30', 'active'],
    ])('reads a month-end end date %s against today %s as %s', (end_date, today, expected) => {
      const until = lifecycleCommitment({ duration_type: DurationType.UntilDate, end_date });
      expect(resolveCommitmentLifecycle(until, 0, today)).toBe(expected);
    });

    it.each<[string, CommitmentLifecycle]>([
      ['2028-02-28', 'active'],
      ['2028-02-29', 'active'],
      ['2028-03-01', 'ended'],
    ])('reads the leap-day end date 2028-02-29 against today %s as %s', (today, expected) => {
      const untilLeapDay = lifecycleCommitment({
        duration_type: DurationType.UntilDate,
        end_date: '2028-02-29',
      });
      expect(resolveCommitmentLifecycle(untilLeapDay, 0, today)).toBe(expected);
    });

    it.each<[number, CommitmentLifecycle]>([
      [1, 'active'],
      [0, 'stopped'],
    ])(
      'never reads an until-date commitment with no end date as ended, at is_active %s',
      (isActive, expected) => {
        const untilNull = lifecycleCommitment({
          is_active: isActive,
          duration_type: DurationType.UntilDate,
          end_date: null,
        });
        expect(resolveCommitmentLifecycle(untilNull, 9, TODAY)).toBe(expected);
      },
    );
  });
});
