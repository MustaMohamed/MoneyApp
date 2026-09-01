import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  formatLiabilityRowValue,
  resolveBreakdownRowColors,
  resolveNetWorthForeignCaption,
  shouldShowProportionBar,
} from '@/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers';
import { roundMoney } from '@/utils/money';

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
});

describe('the breakdown copy takes the currency code as a parameter', () => {
  it('renders the assets header in the base currency', () => {
    expect(Strings.dashboardBreakdownAssetsHeader('350.00', Currency.USD, 2)).toBe(
      '350.00 USD · 2 accts',
    );
    expect(Strings.dashboardBreakdownAssetsHeader('10,000', Currency.EGP, 1)).toBe(
      '10,000 EGP · 1 acct',
    );
  });

  it('renders the liabilities header in the base currency', () => {
    expect(Strings.dashboardBreakdownLiabilitiesHeader('100.00', Currency.USD, 1)).toBe(
      '100.00 USD · 1 card',
    );
    expect(Strings.dashboardBreakdownLiabilitiesHeader('4,885', Currency.EGP, 2)).toBe(
      '4,885 EGP · 2 cards',
    );
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

// `LiabilityRow.balance` is signed: positive is owed, negative is in credit.
describe('formatLiabilityRowValue — the single composition point for a liability row (#259 C3)', () => {
  it.each([
    [500, '−500'],
    [5000, '−5,000'],
    [-500, '+500'],
    [-300, '+300'],
    [0.4, '−0.40'],
    [-0.4, '+0.40'],
    [-0, '0'],
    [0.001, '0.00'],
  ] as const)('%s -> %s', (balance, expected) => {
    expect(formatLiabilityRowValue(balance, Currency.EGP)).toBe(expected);
  });

  it('composes U+2212, never an ASCII hyphen, on an owed row', () => {
    const rendered = formatLiabilityRowValue(500, Currency.EGP);
    expect(rendered.codePointAt(0)).toBe(0x2212);
    expect(rendered).not.toContain('-');
  });

  it('agrees with the section header on the half-cent rounding case', () => {
    // 9.51 USD at 40.01 is 380.4951, rounds to 380.50, displays as 381.
    expect(formatLiabilityRowValue(roundMoney(9.51 * 40.01), Currency.EGP)).toBe('−381');
  });

  // EGP's zero decimals would print 1,500.50 as `1,500` and drop the cents; USD keeps them.
  it.each([
    [1500.5, '−1,500.50'],
    [-1500.5, '+1,500.50'],
    [500, '−500.00'],
  ] as const)('USD base: %s -> %s', (balance, expected) => {
    expect(formatLiabilityRowValue(balance, Currency.USD)).toBe(expected);
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
