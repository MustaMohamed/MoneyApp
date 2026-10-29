import { AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  formatCommitmentAmount,
  resolveDisplayAmount,
  STATUS_COUNTER_ORDER,
} from '@/modules/commitments/utils/commitment_status';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';

function mkPayment(over: Partial<CommitmentPayment>): CommitmentPayment {
  return makeTestPayment({
    due_date: '2026-05-01',
    amount_due: 100,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...over,
  });
}

function mkCommitment(over: Partial<Commitment>): Commitment {
  return makeTestCommitment({
    amount: 250,
    category_id: 'cat1',
    start_date: '2026-05-01',
    account_id: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...over,
  });
}

describe('resolveDisplayAmount', () => {
  it('paid: prefers amount_paid', () => {
    const r = resolveDisplayAmount(
      mkPayment({ paid_date: '2026-05-02', amount_paid: 90, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r).toEqual({ amount: 90, showTilde: false });
  });

  it('paid with null amount_paid: falls back to amount_due', () => {
    const r = resolveDisplayAmount(
      mkPayment({ paid_date: '2026-05-02', amount_paid: null, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r.amount).toBe(100);
  });

  it('paid with null amount_paid and null amount_due: falls back to commitment.amount', () => {
    const r = resolveDisplayAmount(
      mkPayment({ paid_date: '2026-05-02', amount_paid: null, amount_due: null }),
      mkCommitment({ amount: 250 }),
    );
    expect(r.amount).toBe(250);
  });

  it('unpaid: uses amount_due', () => {
    const r = resolveDisplayAmount(mkPayment({ amount_due: 100 }), mkCommitment({}));
    expect(r).toEqual({ amount: 100, showTilde: false });
  });

  it('unpaid with null amount_due: falls back to commitment.amount', () => {
    const r = resolveDisplayAmount(mkPayment({ amount_due: null }), mkCommitment({ amount: 250 }));
    expect(r.amount).toBe(250);
  });

  it('unpaid ignores amount_paid even when present', () => {
    const r = resolveDisplayAmount(
      mkPayment({ amount_due: null, amount_paid: 999 }),
      mkCommitment({ amount: 250 }),
    );
    expect(r.amount).toBe(250);
  });

  it('variable + unpaid: showTilde true', () => {
    const r = resolveDisplayAmount(
      mkPayment({}),
      mkCommitment({ amount_type: AmountType.Variable }),
    );
    expect(r.showTilde).toBe(true);
  });

  it('variable + paid: showTilde false', () => {
    const r = resolveDisplayAmount(
      mkPayment({ paid_date: '2026-05-02', amount_paid: 90 }),
      mkCommitment({ amount_type: AmountType.Variable }),
    );
    expect(r.showTilde).toBe(false);
  });

  it('all amounts null: amount undefined', () => {
    const r = resolveDisplayAmount(
      mkPayment({ amount_due: null, amount_paid: null }),
      mkCommitment({ amount: null }),
    );
    expect(r.amount).toBeUndefined();
  });

  it('undefined payment + undefined commitment: amount undefined, no tilde', () => {
    const r = resolveDisplayAmount(undefined, undefined);
    expect(r).toEqual({ amount: undefined, showTilde: false });
  });
});

describe('formatCommitmentAmount', () => {
  it('USD payment at 1234.5: currency-aware 2dp, no tilde', () => {
    const text = formatCommitmentAmount(
      mkPayment({
        amount_due: 1234.5,
        currency: Currency.USD,
      }),
      mkCommitment({ currency: Currency.USD }),
    );
    expect(text).toBe('1,234.50 USD');
  });

  it('EGP payment at 1234.56: currency-aware 0dp, no tilde', () => {
    const text = formatCommitmentAmount(
      mkPayment({
        amount_due: 1234.56,
        currency: Currency.EGP,
      }),
      mkCommitment({ currency: Currency.EGP }),
    );
    expect(text).toBe('1,235 EGP');
  });

  it('variable + unpaid: carries the leading tilde', () => {
    const text = formatCommitmentAmount(
      mkPayment({
        amount_due: 100,
        currency: Currency.EGP,
      }),
      mkCommitment({ amount_type: AmountType.Variable, currency: Currency.EGP }),
    );
    expect(text).toBe('~100 EGP');
  });

  it('no amount to format: undefined', () => {
    const text = formatCommitmentAmount(
      mkPayment({ amount_due: null, amount_paid: null }),
      mkCommitment({ amount: null }),
    );
    expect(text).toBeUndefined();
  });

  it('EGP payment at 249.50: renders "250 EGP", the ADR worked-example row value', () => {
    const text = formatCommitmentAmount(
      mkPayment({
        amount_due: 249.5,
        currency: Currency.EGP,
      }),
      mkCommitment({ currency: Currency.EGP }),
    );
    expect(text).toBe('250 EGP');
  });

  it('EGP payment at 0.40: escalates to "0.40 EGP" instead of rounding away to "0 EGP"', () => {
    const text = formatCommitmentAmount(
      mkPayment({
        amount_due: 0.4,
        currency: Currency.EGP,
      }),
      mkCommitment({ currency: Currency.EGP }),
    );
    expect(text).toBe('0.40 EGP');
  });
});

describe('STATUS_COUNTER_ORDER', () => {
  it('lists the counters Paid, Overdue, Due, Upcoming, Skipped', () => {
    expect(STATUS_COUNTER_ORDER).toEqual([
      CommitmentPaymentStatus.Paid,
      CommitmentPaymentStatus.Overdue,
      CommitmentPaymentStatus.Due,
      CommitmentPaymentStatus.Upcoming,
      CommitmentPaymentStatus.Skipped,
    ]);
  });
});
