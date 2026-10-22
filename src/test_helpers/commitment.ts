import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import type { AccountCommitmentRef } from '@/modules/commitments/database/commitments';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';

const TEST_TIMESTAMP = '2026-07-22T12:00:00.000Z';

export function makeAccountCommitmentRef(
  overrides: Partial<AccountCommitmentRef> = {},
): AccountCommitmentRef {
  return {
    id: 'commitment-1',
    name: 'Gym',
    amount_type: AmountType.Fixed,
    amount: 500,
    currency: Currency.EGP,
    category_id: 'category-1',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-01-01',
    account_id: 'account-1',
    notes: null,
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
    is_active: 1,
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    next_due_date: '2026-10-01',
    ...overrides,
  };
}

/** A monthly fixed commitment, `Rent`, 8,000 EGP on account `cib`. */
export function makeTestCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'c1',
    name: 'Rent',
    amount_type: AmountType.Fixed,
    amount: 8000,
    currency: Currency.EGP,
    category_id: 'housing',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-01-01',
    account_id: 'cib',
    notes: null,
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
    is_active: 1,
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  };
}

/** An unpaid, unskipped payment of `makeTestCommitment`, 8,000 EGP due 2026-09-01. */
export function makeTestPayment(overrides: Partial<CommitmentPayment> = {}): CommitmentPayment {
  return {
    id: 'p1',
    commitment_id: 'c1',
    due_date: '2026-09-01',
    paid_date: null,
    skipped_date: null,
    amount_due: 8000,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: null,
    transaction_id: null,
    notes: null,
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  };
}
