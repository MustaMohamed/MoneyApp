import {
  computeBalanceDelta,
  computeCCPaymentForward,
  computeCCPaymentReversal,
} from '@/app/(app)/(tabs)/transactions/_transaction_form/edit_transaction.helpers';

describe('computeBalanceDelta', () => {
  it('returns positive delta when new amount is larger', () => {
    expect(computeBalanceDelta(100, 150)).toBe(50);
  });

  it('returns negative delta when new amount is smaller', () => {
    expect(computeBalanceDelta(200, 100)).toBe(-100);
  });

  it('returns zero delta when amounts are equal', () => {
    expect(computeBalanceDelta(100, 100)).toBe(0);
  });
});

describe('computeCCPaymentReversal', () => {
  it('splits correctly when payment exceeds minimum_payment', () => {
    // oldEgp=350, min_payment=200: installmentCovered=200, revolvingDelta=150
    const result = computeCCPaymentReversal(350, 200);
    expect(result.balanceDelta).toBe(350);
    expect(result.revolvingDelta).toBe(150);
  });

  it('covers only installment when payment is less than minimum_payment', () => {
    // oldEgp=100, min_payment=200: installmentCovered=100, revolvingDelta=0
    const result = computeCCPaymentReversal(100, 200);
    expect(result.balanceDelta).toBe(100);
    expect(result.revolvingDelta).toBe(0);
  });

  it('treats null minimum_payment as 0 (entire payment reduces revolving)', () => {
    // min_payment=null → installmentDue=0 → revolvingDelta=entire amount
    const result = computeCCPaymentReversal(300, null);
    expect(result.balanceDelta).toBe(300);
    expect(result.revolvingDelta).toBe(300);
  });

  it('handles zero payment', () => {
    const result = computeCCPaymentReversal(0, 200);
    expect(result.balanceDelta).toBe(0);
    expect(result.revolvingDelta).toBe(0);
  });
});

describe('computeCCPaymentForward', () => {
  it('reduces revolving when payment exceeds minimum_payment', () => {
    // newEgp=450, min_payment=200, currentRevolving=300
    // installmentCovered=200, revolvingReduction=250, newRevolving=max(0,300-250)=50
    const result = computeCCPaymentForward(450, 200, 300);
    expect(result.balanceDelta).toBe(450);
    expect(result.newRevolving).toBe(50);
  });

  it('does not reduce revolving when payment is less than minimum_payment', () => {
    // newEgp=100, min_payment=200, currentRevolving=300
    // installmentCovered=100, revolvingReduction=0, newRevolving=300
    const result = computeCCPaymentForward(100, 200, 300);
    expect(result.balanceDelta).toBe(100);
    expect(result.newRevolving).toBe(300);
  });

  it('clamps newRevolving to 0 (never goes negative)', () => {
    // newEgp=1000, min_payment=200, currentRevolving=300
    // revolvingReduction=800, newRevolving=max(0,300-800)=0
    const result = computeCCPaymentForward(1000, 200, 300);
    expect(result.balanceDelta).toBe(1000);
    expect(result.newRevolving).toBe(0);
  });

  it('treats null minimum_payment as 0 (entire payment reduces revolving)', () => {
    const result = computeCCPaymentForward(300, null, 400);
    expect(result.balanceDelta).toBe(300);
    expect(result.newRevolving).toBe(100);
  });
});
