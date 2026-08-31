import { Currency } from '@/constants/enums';
import { transferCellAmountText } from '@/modules/transactions/screens/transactions/detail/detail.helpers';

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

  it('tripwire — a bare formatCurrencyAmount magnitude at 0dp is what the bug looked like', () => {
    expect(transferCellAmountText(0.4, Currency.EGP, '−').display).not.toBe('−0 EGP');
  });
});
