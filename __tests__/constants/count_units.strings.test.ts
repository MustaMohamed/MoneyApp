import { Strings } from '@/constants/strings';

describe('Month-spend card footer: the transaction count', () => {
  it('dashMonthSpentTxs reads 0 txs, 1 tx and 2 txs', () => {
    expect(Strings.dashMonthSpentTxs(0)).toBe('0 txs');
    expect(Strings.dashMonthSpentTxs(1)).toBe('1 tx');
    expect(Strings.dashMonthSpentTxs(2)).toBe('2 txs');
  });
});

describe('Commitment detail duration row: the payment count', () => {
  it('commitmentsDurationAfterCountOf reads After 1 payment and After 2 payments', () => {
    expect(Strings.commitmentsDurationAfterCountOf(1)).toBe('After 1 payment');
    expect(Strings.commitmentsDurationAfterCountOf(2)).toBe('After 2 payments');
  });
});
