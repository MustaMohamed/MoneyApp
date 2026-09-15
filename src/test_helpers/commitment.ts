import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import type { AccountCommitmentRef } from '@/modules/commitments/database/commitments';

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
