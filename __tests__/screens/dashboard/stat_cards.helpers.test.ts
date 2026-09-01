import { Currency } from '@/constants/enums';
import type { DashboardNetWorth } from '@/modules/accounts/domain/account_aggregation';
import {
  resolveMonthSpendRows,
  resolveMonthSpendUsdAmount,
  resolveNetWorthStatColor,
  shouldShowNetWorthProportionBar,
} from '@/modules/dashboard/screens/dashboard/components/stat_cards.helpers';

describe('resolveMonthSpendUsdAmount — stat_cards.tsx:249', () => {
  it('shows cents on a non-whole USD month spend — base value: 1,251, head: 1,250.75', () => {
    expect(resolveMonthSpendUsdAmount(1250.75)).toEqual({ value: '1,250.75', code: 'USD' });
  });

  it('shows the row-12 whole-number shape — base value: 100, head: 100.00', () => {
    expect(resolveMonthSpendUsdAmount(100)).toEqual({ value: '100.00', code: 'USD' });
  });
});

// Two native ledger totals, base-native first; values pass through untouched — no conversion.
describe('resolveMonthSpendRows — base-first ordering (#347)', () => {
  const egpParts = { value: '3,000', code: 'EGP' };
  const usdParts = { value: '20.00', code: 'USD' };

  it('keeps the EGP row first under an EGP base', () => {
    expect(resolveMonthSpendRows(Currency.EGP, egpParts, usdParts)).toEqual([egpParts, usdParts]);
  });

  it('puts the USD row first under a USD base', () => {
    expect(resolveMonthSpendRows(Currency.USD, egpParts, usdParts)).toEqual([usdParts, egpParts]);
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

// Both wrong renders from #345, plus the {1000, -500} row that isolates the part-bound clause.
describe('shouldShowNetWorthProportionBar — the compound gate (#345)', () => {
  it('hides the bar for an all-credit zero-debt portfolio (was 100% negative colour)', () => {
    // `Math.abs(-300)` made total 300 and assetsPct 0: a debt-free user saw an all-debt bar.
    expect(shouldShowNetWorthProportionBar({ assets: 0, liabilities: -300 })).toBe(false);
  });

  it('hides the bar when an overdrawn bank pushes assets negative (was flex: -0.43)', () => {
    // Bank -500, savings 200, CC 1000: assets -300, liabilities 1000, assetsPct -0.43.
    expect(shouldShowNetWorthProportionBar({ assets: -300, liabilities: 1000 })).toBe(false);
  });

  it.each([
    [{ assets: 1000, liabilities: -500 }, false],
    [{ assets: -500, liabilities: 1000 }, false],
    [{ assets: 0, liabilities: 0 }, false],
    [{ assets: 500, liabilities: 500 }, true],
    [{ assets: 0.01, liabilities: 0 }, true],
    [{ assets: 0, liabilities: 0.01 }, true],
  ] as const)('%j -> %s', (parts, expected) => {
    expect(shouldShowNetWorthProportionBar(parts)).toBe(expected);
  });
});
