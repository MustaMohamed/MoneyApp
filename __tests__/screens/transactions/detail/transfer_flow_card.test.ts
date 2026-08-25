import { Currency } from '@/constants/enums';
import { transferCellAmountText } from '@/modules/transactions/screens/transactions/detail/detail.helpers';

// MA-016 P8 cycle 2 B-1: TransferFlowCard's Cell composed a sign of its own
// (signPrefix) beside `formatCurrencyAmount(amount, currency)` — a positive
// magnitude — so formatAmount's -0 guard never saw it, the same composed-sign
// shape fixed at transactions.helpers.ts, detail.helpers.ts and
// transaction_row.helpers.ts. It escaped detection because
// detail.helpers.ts's fromAmountText/toAmountText fields were asserted in
// detail_helpers.test.ts while the component itself never read them — #282
// moved transferCellAmountText here so the presentation field IS what Cell
// renders, and this suite asserts the shared function directly.
// docs/adr/2026-08-21-currency-aware-display-decimals.md §2.1.
describe('transferCellAmountText', () => {
  it('escalates to 2dp rather than print a sign beside a rounded-away EGP magnitude', () => {
    expect(transferCellAmountText(0.4, Currency.EGP, '−')).toEqual({
      display: '−0.40 EGP',
      accessible: '0.40 EGP',
    });
  });

  it('does not escalate once the site precision would print a nonzero digit', () => {
    expect(transferCellAmountText(0.6, Currency.EGP, '−')).toEqual({
      display: '−1 EGP',
      accessible: '1 EGP',
    });
  });

  it('an exact-zero magnitude carries no sign at all', () => {
    expect(transferCellAmountText(0, Currency.EGP, '−')).toEqual({
      display: '0 EGP',
      accessible: '0 EGP',
    });
  });

  it('USD at 2dp needs no escalation — the config precision already matches', () => {
    expect(transferCellAmountText(176, Currency.USD, '+')).toEqual({
      display: '+176.00 USD',
      accessible: '176.00 USD',
    });
  });

  // The tripwire: shows what formatCurrencyAmount's own composed-sign shape
  // (the bug this suite catches) would have produced, so this assertion
  // cannot pass vacuously if transferCellAmountText is ever routed back
  // through a bare formatCurrencyAmount call with a hand-prefixed sign.
  it('tripwire — a bare formatCurrencyAmount magnitude at 0dp is what the bug looked like', () => {
    expect(transferCellAmountText(0.4, Currency.EGP, '−').display).not.toBe('−0 EGP');
  });
});
