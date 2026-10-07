import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  resolveBreakdownRowColors,
  resolveNetWorthForeignCaption,
  shouldShowProportionBar,
} from '@/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers';

describe('resolveNetWorthForeignCaption — the sheet’s ≈ caption', () => {
  it('shows cents on a non-whole USD net worth — base: 1,251, head: 1,250.75', () => {
    expect(resolveNetWorthForeignCaption(1250.75, Currency.EGP)).toBe('≈ 1,250.75 USD');
  });

  it('shows the row-12 whole-number shape — base: 100, head: 100.00', () => {
    expect(resolveNetWorthForeignCaption(100, Currency.EGP)).toBe('≈ 100.00 USD');
  });

  it('renders the absent-rate placeholder unchanged when netWorthForeign is undefined', () => {
    // A `?? 0` here would print `≈ 0.00 USD` for a user who never fetched a rate.
    expect(resolveNetWorthForeignCaption(undefined, Currency.EGP)).toBe('— USD');
  });

  it('renders the EGP caption under a USD base — net worth, not assets', () => {
    expect(resolveNetWorthForeignCaption(12212.5, Currency.USD)).toBe('≈ 12,213 EGP');
  });

  it('renders the absent-rate placeholder in EGP under a USD base', () => {
    expect(resolveNetWorthForeignCaption(undefined, Currency.USD)).toBe('— EGP');
  });

  it("composes U+2212, never Intl's ASCII hyphen, for a negative net worth (PR #375 r1)", () => {
    // netWorth -2,000 EGP @ 50 converts to -40.00 USD; the header already shows U+2212 via
    // formatOwnedAmountParts, and this caption must match, not fall back to formatCurrencyAmount.
    const caption = resolveNetWorthForeignCaption(-40, Currency.EGP);
    expect(caption).toBe('≈ −40.00 USD');
    expect(caption).not.toContain('-');
  });
});

describe('the breakdown copy', () => {
  it('renders the assets header from an amount already joined to its code', () => {
    expect(Strings.dashboardBreakdownAssetsHeader('350.00 USD', 2)).toBe('350.00 USD · 2 accts');
    expect(Strings.dashboardBreakdownAssetsHeader('10,000 EGP', 1)).toBe('10,000 EGP · 1 acct');
  });

  it('renders the liabilities header from an amount already joined to its code', () => {
    expect(Strings.dashboardBreakdownLiabilitiesHeader('100.00 USD', 1)).toBe(
      '100.00 USD · 1 card',
    );
    expect(Strings.dashboardBreakdownLiabilitiesHeader('4,885 EGP', 2)).toBe('4,885 EGP · 2 cards');
  });

  it('renders the ≈ placeholder in the foreign currency', () => {
    expect(Strings.netWorthBreakdownForeignUnavailable(Currency.EGP)).toBe('— EGP');
    expect(Strings.netWorthBreakdownForeignUnavailable(Currency.USD)).toBe('— USD');
  });
});

// Legend colour identifies the kind; a value never carries colour, owed is not actionable.
describe('resolveBreakdownRowColors — money-colour vocabulary (docs/adr/2026-08-27-money-colour-vocabulary.md)', () => {
  it.each([
    ['liability', { legend: '#E05A42', value: undefined }],
    ['liquid', { legend: '#4CAF82', value: undefined }],
    ['reserve', { legend: '#D4A44C', value: undefined }],
  ] as const)('%s', (kind, expected) => {
    expect(resolveBreakdownRowColors(kind)).toEqual(expected);
  });
});

// {1000, -500} totals 500 > 0, so only the `reserve >= 0` clause rejects it.
describe('shouldShowProportionBar — the compound gate (#259 C6)', () => {
  it.each([
    [{ liquid: -500, reserve: 1000 }, false],
    [{ liquid: 1000, reserve: -500 }, false],
    [{ liquid: 0, reserve: 0 }, false],
    [{ liquid: 500, reserve: 500 }, true],
    [{ liquid: 0, reserve: 0.01 }, true],
  ] as const)('%j -> %s', (parts, expected) => {
    expect(shouldShowProportionBar(parts)).toBe(expected);
  });
});
