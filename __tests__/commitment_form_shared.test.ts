import {
  COMMITMENT_SCHEMA,
  buildAddDefaults,
  buildEditDefaults,
  detectPreset,
} from '@/screens/commitments/commitment_form.shared';
import {
  AmountType,
  Currency,
  DurationType,
  RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import type { Commitment } from '@/database/entities/commitment.entity';

const VALID_BASE = {
  amount_type: AmountType.Fixed,
  name: 'Rent',
  amount: 5000,
  currency: Currency.EGP,
  category_id: 'cat-1',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2024-01-01',
  duration_type: DurationType.Forever,
};

const MOCK_COMMITMENT: Commitment = {
  id: 'c-1',
  name: 'Rent',
  amount_type: AmountType.Fixed,
  amount: 5000,
  currency: Currency.EGP,
  category_id: 'cat-1',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2024-01-01',
  account_id: null,
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('COMMITMENT_SCHEMA', () => {
  it('passes for valid Fixed commitment', () => {
    expect(COMMITMENT_SCHEMA.safeParse(VALID_BASE).success).toBe(true);
  });

  it('fails when Fixed has no amount', () => {
    const result = COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, amount: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.includes('amount'))).toBe(true);
    }
  });

  it('passes when Variable has no amount', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      amount_type: AmountType.Variable,
      amount: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('fails when UntilDate has no end_date', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      duration_type: DurationType.UntilDate,
      end_date: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.includes('end_date'))).toBe(true);
    }
  });

  it('passes when UntilDate has end_date', () => {
    expect(
      COMMITMENT_SCHEMA.safeParse({
        ...VALID_BASE,
        duration_type: DurationType.UntilDate,
        end_date: '2025-12-31',
      }).success,
    ).toBe(true);
  });

  it('fails when AfterCount has no end_after_count', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      duration_type: DurationType.AfterCount,
      end_after_count: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.includes('end_after_count'))).toBe(true);
    }
  });

  it('passes when AfterCount has end_after_count', () => {
    expect(
      COMMITMENT_SCHEMA.safeParse({
        ...VALID_BASE,
        duration_type: DurationType.AfterCount,
        end_after_count: 12,
      }).success,
    ).toBe(true);
  });

  it('fails when name is empty', () => {
    expect(COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, name: '' }).success).toBe(false);
  });

  it('fails when category_id is empty', () => {
    expect(COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, category_id: '' }).success).toBe(false);
  });
});

describe('detectPreset', () => {
  it('returns Monthly for every=1, Months', () => {
    expect(detectPreset(1, RecurrencePeriod.Months)).toBe(RecurrencePreset.Monthly);
  });
  it('returns Weekly for every=1, Weeks', () => {
    expect(detectPreset(1, RecurrencePeriod.Weeks)).toBe(RecurrencePreset.Weekly);
  });
  it('returns Annually for every=1, Years', () => {
    expect(detectPreset(1, RecurrencePeriod.Years)).toBe(RecurrencePreset.Annually);
  });
  it('returns Custom for every=2, Months', () => {
    expect(detectPreset(2, RecurrencePeriod.Months)).toBe(RecurrencePreset.Custom);
  });
  it('returns Custom for every=1, Days', () => {
    expect(detectPreset(1, RecurrencePeriod.Days)).toBe(RecurrencePreset.Custom);
  });
});

describe('buildAddDefaults', () => {
  it('returns Fixed amount_type', () => {
    expect(buildAddDefaults().amount_type).toBe(AmountType.Fixed);
  });
  it('returns Forever duration_type', () => {
    expect(buildAddDefaults().duration_type).toBe(DurationType.Forever);
  });
  it('returns EGP currency', () => {
    expect(buildAddDefaults().currency).toBe(Currency.EGP);
  });
  it('returns today as start_date', () => {
    expect(buildAddDefaults().start_date).toBe(new Date().toISOString().slice(0, 10));
  });
  it('returns undefined amount', () => {
    expect(buildAddDefaults().amount).toBeUndefined();
  });
});

describe('buildEditDefaults', () => {
  it('maps all fields from entity', () => {
    const d = buildEditDefaults(MOCK_COMMITMENT);
    expect(d.name).toBe('Rent');
    expect(d.amount_type).toBe(AmountType.Fixed);
    expect(d.amount).toBe(5000);
    expect(d.currency).toBe(Currency.EGP);
    expect(d.category_id).toBe('cat-1');
    expect(d.duration_type).toBe(DurationType.Forever);
    expect(d.start_date).toBe('2024-01-01');
  });
  it('converts null amount to undefined', () => {
    expect(buildEditDefaults({ ...MOCK_COMMITMENT, amount: null }).amount).toBeUndefined();
  });
  it('converts null account_id to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).account_id).toBeUndefined();
  });
  it('converts null notes to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).notes).toBeUndefined();
  });
  it('converts null end_date to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).end_date).toBeUndefined();
  });
  it('converts null end_after_count to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).end_after_count).toBeUndefined();
  });
});
