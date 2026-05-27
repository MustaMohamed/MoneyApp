import {
  AmountType,
  Currency,
  DurationType,
  RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import {
  COMMITMENT_SCHEMA,
  buildAddDefaults,
  buildEditDefaults,
  detectPreset,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';

const VALID_BASE = {
  amountType: AmountType.Fixed,
  name: 'Rent',
  amount: 5000,
  currency: Currency.EGP,
  categoryId: 'cat-1',
  recurrenceEvery: 1,
  recurrencePeriod: RecurrencePeriod.Months,
  startDate: '2024-01-01',
  durationType: DurationType.Forever,
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
      amountType: AmountType.Variable,
      amount: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('fails when UntilDate has no endDate', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      durationType: DurationType.UntilDate,
      endDate: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.includes('endDate'))).toBe(true);
    }
  });

  it('passes when UntilDate has endDate', () => {
    expect(
      COMMITMENT_SCHEMA.safeParse({
        ...VALID_BASE,
        durationType: DurationType.UntilDate,
        endDate: '2025-12-31',
      }).success,
    ).toBe(true);
  });

  it('fails when AfterCount has no endAfterCount', () => {
    const result = COMMITMENT_SCHEMA.safeParse({
      ...VALID_BASE,
      durationType: DurationType.AfterCount,
      endAfterCount: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.includes('endAfterCount'))).toBe(true);
    }
  });

  it('passes when AfterCount has endAfterCount', () => {
    expect(
      COMMITMENT_SCHEMA.safeParse({
        ...VALID_BASE,
        durationType: DurationType.AfterCount,
        endAfterCount: 12,
      }).success,
    ).toBe(true);
  });

  it('fails when name is empty', () => {
    expect(COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, name: '' }).success).toBe(false);
  });

  it('fails when categoryId is empty', () => {
    expect(COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, categoryId: '' }).success).toBe(false);
  });

  it('fails when Fixed has amount of 0', () => {
    const result = COMMITMENT_SCHEMA.safeParse({ ...VALID_BASE, amount: 0 });
    expect(result.success).toBe(false);
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
  it('returns Fixed amountType', () => {
    expect(buildAddDefaults().amountType).toBe(AmountType.Fixed);
  });
  it('returns Forever durationType', () => {
    expect(buildAddDefaults().durationType).toBe(DurationType.Forever);
  });
  it('returns EGP currency', () => {
    expect(buildAddDefaults().currency).toBe(Currency.EGP);
  });
  it('returns today (local date) as startDate', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(buildAddDefaults().startDate).toBe(expected);
  });
  it('returns undefined amount', () => {
    expect(buildAddDefaults().amount).toBeUndefined();
  });
});

describe('buildEditDefaults', () => {
  it('maps all fields from entity', () => {
    const d = buildEditDefaults(MOCK_COMMITMENT);
    expect(d.name).toBe('Rent');
    expect(d.amountType).toBe(AmountType.Fixed);
    expect(d.amount).toBe(5000);
    expect(d.currency).toBe(Currency.EGP);
    expect(d.categoryId).toBe('cat-1');
    expect(d.durationType).toBe(DurationType.Forever);
    expect(d.startDate).toBe('2024-01-01');
  });
  it('converts null amount to undefined', () => {
    expect(buildEditDefaults({ ...MOCK_COMMITMENT, amount: null }).amount).toBeUndefined();
  });
  it('converts null account_id to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).accountId).toBeUndefined();
  });
  it('converts null notes to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).notes).toBeUndefined();
  });
  it('converts null end_date to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).endDate).toBeUndefined();
  });
  it('converts null end_after_count to undefined', () => {
    expect(buildEditDefaults(MOCK_COMMITMENT).endAfterCount).toBeUndefined();
  });
});
