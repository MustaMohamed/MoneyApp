import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  formatLiabilityRowValue,
  resolveBreakdownRowColors,
  resolveNetWorthForeignCaption,
  shouldShowProportionBar,
} from '@/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers';
import { roundMoney } from '@/utils/money';

// #277 spec §6.4 pinned this at two USD fixtures because the caption's currency
// was a literal. It is `foreignCurrencyFor(base)` now, so the EGP-base rows below
// keep the old assertions byte-identical and a USD-base block states the other
// direction.
describe('resolveNetWorthForeignCaption — the sheet’s ≈ caption', () => {
  it('shows cents on a non-whole USD net worth — base: 1,251, head: 1,250.75', () => {
    expect(resolveNetWorthForeignCaption(1250.75, Currency.EGP)).toBe('≈ 1,250.75 USD');
  });

  it('shows the row-12 whole-number shape — base: 100, head: 100.00', () => {
    expect(resolveNetWorthForeignCaption(100, Currency.EGP)).toBe('≈ 100.00 USD');
  });

  it('renders the absent-rate placeholder unchanged when netWorthForeign is undefined', () => {
    // Keyed on the FIELD being absent, not on `rate > 0` — see the comment this resolver
    // carries. A `?? 0` here would silently print `≈ 0.00 USD` for a user who never fetched
    // a rate.
    expect(resolveNetWorthForeignCaption(undefined, Currency.EGP)).toBe('— USD');
  });

  // Scenario 12b. The number is the §3B fixture's `netWorthForeign`, which the
  // `computeNetWorth` row in `dashboard_helpers.test.ts` states independently —
  // and it is NOT the hero pill's 17,097.50, which shows assets. The two
  // rendering different fields is correct, and reconciling them compiles.
  it('renders the EGP caption under a USD base — net worth, not assets', () => {
    expect(resolveNetWorthForeignCaption(12212.5, Currency.USD)).toBe('≈ 12,213 EGP');
  });

  it('renders the absent-rate placeholder in EGP under a USD base', () => {
    expect(resolveNetWorthForeignCaption(undefined, Currency.USD)).toBe('— EGP');
  });
});

// Scenario 14. The two section headers stop hardcoding `EGP` in their template,
// and the ≈ placeholder stops hardcoding `USD`. Byte-identical at the codes they
// used to hardcode, which is the whole test: the change is a parameter, not a
// rewording.
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

// #265 / the ADR: a breakdown row's legend colour identifies its kind (categorical), and
// its value never carries a colour — a liability's magnitude is money owed, not an
// actionable state. The §8.4 guard is `value: undefined` for every kind.
describe('resolveBreakdownRowColors — money-colour vocabulary (docs/adr/2026-08-27-money-colour-vocabulary.md)', () => {
  it.each([
    ['liability', { legend: '#E05A42', value: undefined }],
    ['liquid', { legend: '#4CAF82', value: undefined }],
    ['reserve', { legend: '#D4A44C', value: undefined }],
  ] as const)('%s', (kind, expected) => {
    expect(resolveBreakdownRowColors(kind)).toEqual(expected);
  });
});

// #259 C2/C3: `LiabilityRow.balance` is now signed (positive owed, negative
// in credit) and this is the SINGLE site that composes a glyph onto it — the
// `transaction_row.helpers.ts` `primaryAmountFor` shape. The escalation rows
// (0.4, -0.4) and the true-zero row (-0) are load-bearing: below this file's
// change the old `net_worth_breakdown_sheet.tsx:311` composition rendered a
// bare `−0` for 0.4 EGP, which this table pins as fixed, not incidental.
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
    // 9.51 USD at 40.01 converts to 380.4951, rounds to 380.50, and displays
    // as 381 — the same figure `dashboard_helpers.test.ts`'s `liabilities`
    // pin asserts for the section header (untouched by this ticket). This is
    // the render-path successor to that pin, the old `:764` row.
    expect(formatLiabilityRowValue(roundMoney(9.51 * 40.01), Currency.EGP)).toBe('−381');
  });

  // Scenario 13, at the ONE of its nine sites that has a logic seam. `1,500.50`
  // under a USD base is the whole point: EGP's zero decimals print it as `1,500`
  // and silently drop 50 cents, which is what the hardcoded `Currency.EGP` here
  // did at the other currency. The other eight sites are inline `.tsx`
  // expressions with no seam and belong to the emulator (spec §8) — adding a
  // render suite for them is what `.claude/rules/tests.md:19` forbids.
  it.each([
    [1500.5, '−1,500.50'],
    [-1500.5, '+1,500.50'],
    [500, '−500.00'],
  ] as const)('USD base: %s -> %s', (balance, expected) => {
    expect(formatLiabilityRowValue(balance, Currency.USD)).toBe(expected);
  });
});

// #259 C6: the reserve clause is the load-bearing one in the {1000, -500}
// row — the total is 500 > 0, so only `reserve >= 0` fails there. Deleting
// that clause alone would still hide the {-500, 1000} row (the liquid clause
// catches it) but would wrongly show {1000, -500}, which is what makes this
// row a pin rather than redundant with the first.
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
