import {
  formatLiabilityRowValue,
  resolveBreakdownRowColors,
  resolveNetWorthUsdCaption,
  shouldShowProportionBar,
} from '@/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers';
import { roundMoney } from '@/utils/money';

// #277 spec §6.4: USD-only by construction (a literal `USD` node sits beside this amount),
// so it carries two USD fixtures instead of two currency directions (F2). M1 (USD 2->0)
// reds both; M2 (EGP 0->2) is a structural no-op here.
describe('resolveNetWorthUsdCaption — net_worth_breakdown_sheet.tsx:164', () => {
  it('shows cents on a non-whole USD net worth — base: 1,251, head: 1,250.75', () => {
    expect(resolveNetWorthUsdCaption(1250.75)).toBe('≈ 1,250.75 USD');
  });

  it('shows the row-12 whole-number shape — base: 100, head: 100.00', () => {
    expect(resolveNetWorthUsdCaption(100)).toBe('≈ 100.00 USD');
  });

  it('renders the absent-rate placeholder unchanged when netWorthUsd is undefined', () => {
    // Keyed on the FIELD being absent, not on `rate > 0` — see the comment this resolver
    // carries. A `?? 0` here would silently print `≈ 0.00 USD` for a user who never fetched
    // a rate.
    expect(resolveNetWorthUsdCaption(undefined)).toBe('— USD');
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
    expect(formatLiabilityRowValue(balance)).toBe(expected);
  });

  it('composes U+2212, never an ASCII hyphen, on an owed row', () => {
    const rendered = formatLiabilityRowValue(500);
    expect(rendered.codePointAt(0)).toBe(0x2212);
    expect(rendered).not.toContain('-');
  });

  it('agrees with the section header on the half-cent rounding case', () => {
    // 9.51 USD at 40.01 converts to 380.4951, rounds to 380.50, and displays
    // as 381 — the same figure `dashboard_helpers.test.ts`'s `liabilities`
    // pin asserts for the section header (untouched by this ticket). This is
    // the render-path successor to that pin, the old `:764` row.
    expect(formatLiabilityRowValue(roundMoney(9.51 * 40.01))).toBe('−381');
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
