import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  commitmentFiltersEqual,
  commitmentMatchesAdvancedFilters,
  commitmentMatchesSearch,
  countActiveCommitmentFilters,
} from '@/modules/commitments/screens/commitments/filter/filter.helpers';
import type { CommitmentAdvancedFilters } from '@/modules/commitments/screens/commitments/filter/filter.store';

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'commitment-1',
    name: 'Apartment Rent',
    amount_type: AmountType.Fixed,
    amount: 5000,
    currency: Currency.EGP,
    category_id: 'cat-home',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-07-01',
    account_id: 'account-default',
    notes: 'Lease memo',
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
    is_active: 1,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePayment(overrides: Partial<CommitmentPayment> = {}): CommitmentPayment {
  return {
    id: 'payment-1',
    commitment_id: 'commitment-1',
    due_date: '2026-07-05',
    paid_date: null,
    skipped_date: null,
    amount_due: 5000,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: null,
    transaction_id: null,
    status: CommitmentPaymentStatus.Upcoming,
    notes: 'Payment note',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeFilters(
  overrides: Partial<CommitmentAdvancedFilters> = {},
): CommitmentAdvancedFilters {
  return {
    accountIds: [],
    categoryIds: [],
    amountCurrency: Currency.EGP,
    amountTypes: [],
    recurrencePresets: [],
    ...overrides,
  };
}

describe('commitment filter helpers', () => {
  it('counts active filter sections, not selected items', () => {
    expect(
      countActiveCommitmentFilters(
        makeFilters({
          accountIds: ['a1', 'a2'],
          categoryIds: ['c1'],
          amountMin: 100,
          amountTypes: [AmountType.Fixed, AmountType.Variable],
          recurrencePresets: [RecurrencePreset.Monthly, RecurrencePreset.Custom],
        }),
      ),
    ).toBe(5);
  });

  it('compares filters with order-insensitive sets and inactive amount currency ignored', () => {
    expect(
      commitmentFiltersEqual(
        makeFilters({
          accountIds: ['a2', 'a1'],
          categoryIds: ['c1'],
          amountCurrency: Currency.EGP,
          amountTypes: [AmountType.Variable, AmountType.Fixed],
          recurrencePresets: [RecurrencePreset.Custom, RecurrencePreset.Monthly],
        }),
        makeFilters({
          accountIds: ['a1', 'a2'],
          categoryIds: ['c1'],
          amountCurrency: Currency.USD,
          amountTypes: [AmountType.Fixed, AmountType.Variable],
          recurrencePresets: [RecurrencePreset.Monthly, RecurrencePreset.Custom],
        }),
      ),
    ).toBe(true);

    expect(
      commitmentFiltersEqual(
        makeFilters({ amountMin: 100, amountCurrency: Currency.EGP }),
        makeFilters({ amountMin: 100, amountCurrency: Currency.USD }),
      ),
    ).toBe(false);
  });

  it('matches search across commitment, category, account, and notes', () => {
    const candidate = {
      payment: makePayment({ notes: 'Autopay receipt' }),
      commitment: makeCommitment({ name: 'Gym Membership', notes: 'Wellness memo' }),
      accountName: 'CIB Checking',
      categoryName: 'Health Club',
    };

    expect(commitmentMatchesSearch(candidate, 'gym')).toBe(true);
    expect(commitmentMatchesSearch(candidate, 'health')).toBe(true);
    expect(commitmentMatchesSearch(candidate, 'cib')).toBe(true);
    expect(commitmentMatchesSearch(candidate, 'receipt')).toBe(true);
    expect(commitmentMatchesSearch(candidate, 'missing')).toBe(false);
  });

  it('matches account and category filters from payment and commitment context', () => {
    const candidate = {
      payment: makePayment({ account_id: 'account-paid' }),
      commitment: makeCommitment({ account_id: 'account-default', category_id: 'cat-rent' }),
    };

    expect(
      commitmentMatchesAdvancedFilters(candidate, makeFilters({ accountIds: ['account-paid'] })),
    ).toBe(true);
    expect(
      commitmentMatchesAdvancedFilters(candidate, makeFilters({ accountIds: ['account-default'] })),
    ).toBe(true);
    expect(
      commitmentMatchesAdvancedFilters(candidate, makeFilters({ categoryIds: ['cat-rent'] })),
    ).toBe(true);
    expect(
      commitmentMatchesAdvancedFilters(candidate, makeFilters({ categoryIds: ['cat-food'] })),
    ).toBe(false);
  });

  it('matches amount range by displayed amount and currency', () => {
    expect(
      commitmentMatchesAdvancedFilters(
        {
          payment: makePayment({
            status: CommitmentPaymentStatus.Paid,
            amount_due: 500,
            amount_paid: 450,
            currency: Currency.EGP,
          }),
          commitment: makeCommitment(),
        },
        makeFilters({ amountMin: 400, amountMax: 460, amountCurrency: Currency.EGP }),
      ),
    ).toBe(true);

    expect(
      commitmentMatchesAdvancedFilters(
        {
          payment: makePayment({ amount_due: 500, currency: Currency.USD }),
          commitment: makeCommitment(),
        },
        makeFilters({ amountMin: 400, amountCurrency: Currency.EGP }),
      ),
    ).toBe(false);

    expect(
      commitmentMatchesAdvancedFilters(
        {
          payment: makePayment({ amount_due: null, currency: Currency.EGP }),
          commitment: makeCommitment({ amount_type: AmountType.Variable }),
        },
        makeFilters({ amountMin: 1, amountCurrency: Currency.EGP }),
      ),
    ).toBe(false);
  });

  it('matches amount type and recurrence preset filters', () => {
    expect(
      commitmentMatchesAdvancedFilters(
        {
          payment: makePayment(),
          commitment: makeCommitment({
            amount_type: AmountType.Variable,
            recurrence_every: 1,
            recurrence_period: RecurrencePeriod.Weeks,
          }),
        },
        makeFilters({
          amountTypes: [AmountType.Variable],
          recurrencePresets: [RecurrencePreset.Weekly],
        }),
      ),
    ).toBe(true);

    expect(
      commitmentMatchesAdvancedFilters(
        {
          payment: makePayment(),
          commitment: makeCommitment({
            recurrence_every: 2,
            recurrence_period: RecurrencePeriod.Months,
          }),
        },
        makeFilters({ recurrencePresets: [RecurrencePreset.Custom] }),
      ),
    ).toBe(true);
  });
});
