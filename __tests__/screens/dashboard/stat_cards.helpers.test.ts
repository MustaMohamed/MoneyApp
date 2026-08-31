import type { DashboardNetWorth } from '@/modules/accounts/domain/account_aggregation';
import {
  resolveMonthSpendUsdAmount,
  resolveNetWorthStatColor,
} from '@/modules/dashboard/screens/dashboard/components/stat_cards.helpers';

describe('resolveMonthSpendUsdAmount — stat_cards.tsx:249', () => {
  it('shows cents on a non-whole USD month spend — base value: 1,251, head: 1,250.75', () => {
    expect(resolveMonthSpendUsdAmount(1250.75)).toEqual({ value: '1,250.75', code: 'USD' });
  });

  it('shows the row-12 whole-number shape — base value: 100, head: 100.00', () => {
    expect(resolveMonthSpendUsdAmount(100)).toEqual({ value: '100.00', code: 'USD' });
  });
});

describe('resolveNetWorthStatColor — stat_cards.tsx netColor', () => {
  const amountNetWorth = (netWorth: number): DashboardNetWorth => ({
    kind: 'amount',
    assets: 10000,
    liabilities: 10000 - netWorth,
    netWorth,
    assetsForeign: undefined,
    netWorthForeign: undefined,
  });

  it('rate-needed stays warning', () => {
    expect(resolveNetWorthStatColor({ kind: 'rate-needed', foreignCount: 1 })).toBe('#E8B130');
  });

  it('a negative net worth renders gold, not red', () => {
    expect(resolveNetWorthStatColor(amountNetWorth(-5000))).toBe('#D4A44C');
  });

  it('a positive net worth renders gold', () => {
    expect(resolveNetWorthStatColor(amountNetWorth(5000))).toBe('#D4A44C');
  });
});
