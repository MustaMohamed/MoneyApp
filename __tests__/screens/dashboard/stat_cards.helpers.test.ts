import type { DashboardNetWorth } from '@/modules/accounts/domain/account_aggregation';
import {
  resolveMonthSpendUsdAmount,
  resolveNetWorthStatColor,
} from '@/modules/dashboard/screens/dashboard/components/stat_cards.helpers';

// #277 spec §6.4: USD-only by construction (a literal `USD` node sits beside this amount),
// so it carries two USD fixtures instead of two currency directions (F2). Extracted in the
// { value, code } shape c5 keeps -- exactly formatCurrencyParts's own return shape -- so
// c5's adoption (06e4d7b) was a body swap with zero test churn.
describe('resolveMonthSpendUsdAmount — stat_cards.tsx:249', () => {
  it('shows cents on a non-whole USD month spend — base value: 1,251, head: 1,250.75', () => {
    expect(resolveMonthSpendUsdAmount(1250.75)).toEqual({ value: '1,250.75', code: 'USD' });
  });

  it('shows the row-12 whole-number shape — base value: 100, head: 100.00', () => {
    expect(resolveMonthSpendUsdAmount(100)).toEqual({ value: '100.00', code: 'USD' });
  });
});

// #265 / the ADR: a net worth is a magnitude the user owns or owes — it stops being
// coloured by sign, so a negative net worth stops reading as a red/danger state and
// renders identically to a positive one. rate-needed stays warning (actionable: no rate
// to compute from). Fails at base 618517dc: the old branch returned Colors.dark.negative
// for the amount-at--5000 case.
describe('resolveNetWorthStatColor — stat_cards.tsx netColor', () => {
  const amountNetWorth = (netWorth: number): DashboardNetWorth => ({
    kind: 'amount',
    assets: 10000,
    liabilities: 10000 - netWorth,
    netWorth,
    assetsUsd: undefined,
    netWorthUsd: undefined,
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
