import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  formatCommitmentAmount,
  resolveDisplayAmount,
} from '@/modules/commitments/screens/commitments/commitment_status';

function mkPayment(over: Partial<CommitmentPayment>): CommitmentPayment {
  return {
    id: 'p1',
    commitment_id: 'c1',
    due_date: '2026-05-01',
    paid_date: null,
    skipped_date: null,
    amount_due: 100,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: null,
    transaction_id: null,
    status: CommitmentPaymentStatus.Upcoming,
    notes: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...over,
  };
}

function mkCommitment(over: Partial<Commitment>): Commitment {
  return {
    id: 'c1',
    name: 'Rent',
    amount_type: AmountType.Fixed,
    amount: 250,
    currency: Currency.EGP,
    category_id: 'cat1',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-05-01',
    account_id: null,
    notes: null,
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
    is_active: 1,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...over,
  };
}

describe('resolveDisplayAmount', () => {
  it('paid: prefers amount_paid', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Paid, amount_paid: 90, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r).toEqual({ amount: 90, showTilde: false });
  });

  it('paid with null amount_paid: falls back to amount_due', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Paid, amount_paid: null, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r.amount).toBe(100);
  });

  it('paid with null amount_paid and null amount_due: falls back to commitment.amount', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Paid, amount_paid: null, amount_due: null }),
      mkCommitment({ amount: 250 }),
    );
    expect(r.amount).toBe(250);
  });

  it('unpaid: uses amount_due', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Due, amount_due: 100 }),
      mkCommitment({}),
    );
    expect(r).toEqual({ amount: 100, showTilde: false });
  });

  it('unpaid with null amount_due: falls back to commitment.amount', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Due, amount_due: null }),
      mkCommitment({ amount: 250 }),
    );
    expect(r.amount).toBe(250);
  });

  it('unpaid ignores amount_paid even when present', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Due, amount_due: null, amount_paid: 999 }),
      mkCommitment({ amount: 250 }),
    );
    expect(r.amount).toBe(250);
  });

  it('variable + unpaid: showTilde true', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Upcoming }),
      mkCommitment({ amount_type: AmountType.Variable }),
    );
    expect(r.showTilde).toBe(true);
  });

  it('variable + paid: showTilde false', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Paid, amount_paid: 90 }),
      mkCommitment({ amount_type: AmountType.Variable }),
    );
    expect(r.showTilde).toBe(false);
  });

  it('all amounts null: amount undefined', () => {
    const r = resolveDisplayAmount(
      mkPayment({ status: CommitmentPaymentStatus.Due, amount_due: null, amount_paid: null }),
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
        status: CommitmentPaymentStatus.Due,
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
        status: CommitmentPaymentStatus.Due,
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
        status: CommitmentPaymentStatus.Upcoming,
        amount_due: 100,
        currency: Currency.EGP,
      }),
      mkCommitment({ amount_type: AmountType.Variable, currency: Currency.EGP }),
    );
    expect(text).toBe('~100 EGP');
  });

  it('no amount to format: undefined', () => {
    const text = formatCommitmentAmount(
      mkPayment({ status: CommitmentPaymentStatus.Due, amount_due: null, amount_paid: null }),
      mkCommitment({ amount: null }),
    );
    expect(text).toBeUndefined();
  });

  // MA-016 P8 F-2 (@sarah's ratified condition): pins the ADR's worked example (b) row
  // value — three 249.50 EGP commitments each render "250 EGP" — the row half of the
  // rows-vs-header approximation the ticket accepts. See
  // docs/adr/2026-08-21-currency-aware-display-decimals.md §1.
  it('EGP payment at 249.50: renders "250 EGP", the ADR worked-example row value', () => {
    const text = formatCommitmentAmount(
      mkPayment({
        status: CommitmentPaymentStatus.Due,
        amount_due: 249.5,
        currency: Currency.EGP,
      }),
      mkCommitment({ currency: Currency.EGP }),
    );
    expect(text).toBe('250 EGP');
  });

  // MA-016 second amendment round (@layla): formatCommitmentAmount never routed through
  // formatDisplayMagnitude, so a 0.40 EGP commitment read "0 EGP" here while the identical
  // magnitude on a transaction row already escalated to "0.40 EGP" — the same defect
  // class the composed-sign sites were fixed for, just unreached on this surface. Fixed by
  // routing through the shared magnitude/escalate rule (the m0/escalate half only — no
  // sign here to compose in the first place).
  it('EGP payment at 0.40: escalates to "0.40 EGP" instead of rounding away to "0 EGP"', () => {
    const text = formatCommitmentAmount(
      mkPayment({
        status: CommitmentPaymentStatus.Due,
        amount_due: 0.4,
        currency: Currency.EGP,
      }),
      mkCommitment({ currency: Currency.EGP }),
    );
    expect(text).toBe('0.40 EGP');
  });
});
