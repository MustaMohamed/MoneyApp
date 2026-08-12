import { AccountType, Currency } from '@/constants/enums';
import { Size } from '@/constants/theme';
import { DEFAULT_ACCOUNT_COLOR } from '@/modules/accounts/constants/account_palette';
import {
  N3_ROW_MIN_HEIGHT,
  N3_ROW_STYLE,
  resolveAccountRowA11yLabel,
  resolveAccountRowAmount,
  resolveAccountRowDotColor,
} from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.geometry';
import { makeTestAccount } from '@/test_helpers/transaction';

// makeTestAccount defaults to EGP, `color: null` and both balances 0, so each
// fixture below is the one or two fields its assertion is actually about.
const egpAccount = makeTestAccount({
  name: 'CIB Current',
  type: AccountType.Bank,
  current_balance: 48250.4,
});
const usdAccount = makeTestAccount({ currency: Currency.USD, current_balance: 1350.5 });

describe('N3 row geometry — the truncation contract (S3)', () => {
  it('takes its height from the budget-category row token, as a minimum', () => {
    expect(N3_ROW_MIN_HEIGHT).toBe(Size.budgetCategoryRowHeight);
    expect(N3_ROW_STYLE.minHeight).toBe(N3_ROW_MIN_HEIGHT);
  });

  it('carries no fixed height, so a truncated name cannot change the row', () => {
    expect(Object.keys(N3_ROW_STYLE)).not.toContain('height');
  });

  it('carries no colour key — the group paints the fill, the row is transparent', () => {
    expect(Object.keys(N3_ROW_STYLE)).not.toContain('backgroundColor');
    expect(Object.keys(N3_ROW_STYLE)).not.toContain('borderColor');
  });

  it('is frozen, so one stray assignment cannot move every row at once', () => {
    expect(Object.isFrozen(N3_ROW_STYLE)).toBe(true);
  });
});

describe('N3 row colour dot (S5)', () => {
  // Both sides are written out as literals rather than rebuilt from
  // ACCOUNT_PALETTE, which would be expect(f(X)).toEqual(f(X)). An earlier
  // draft reached for ACCOUNT_PALETTE[0] — which *is* DEFAULT_ACCOUNT_COLOR,
  // so a resolver ignoring its argument entirely passed this and both
  // fallback cases below.
  it('paints a known palette hex with itself', () => {
    expect(resolveAccountRowDotColor('#C9973A')).toBe('#C9973A');
  });

  // The tripwire that keeps the assertion above from collapsing back into
  // `x === x` if the palette is ever reordered or the default re-pointed.
  it('and that hex is not the fallback', () => {
    expect(DEFAULT_ACCOUNT_COLOR).not.toBe('#C9973A');
  });

  it('falls back for a hex outside the 32', () => {
    expect(resolveAccountRowDotColor('#ABCDEF')).toBe(DEFAULT_ACCOUNT_COLOR);
  });

  it('falls back for a null colour, without reaching the lookup', () => {
    expect(resolveAccountRowDotColor(null)).toBe(DEFAULT_ACCOUNT_COLOR);
  });
});

describe('N3 row amount (S4) — decimals by currency, balance by field', () => {
  it('renders EGP with no decimals — CURRENCY_CONFIG wins over the mockup', () => {
    expect(resolveAccountRowAmount(egpAccount).value).toBe('48,250');
  });

  it('renders USD cents', () => {
    expect(resolveAccountRowAmount(usdAccount).value).toBe('1,350.50');
  });

  it('reads current_balance, not opening_balance', () => {
    // Business rule 6 makes the two equal at creation, so this is the only
    // fixture shape that can catch a regression to the old field.
    const account = makeTestAccount({ current_balance: 999, opening_balance: 111 });
    expect(resolveAccountRowAmount(account).value).toBe('999');
  });

  it('renders the ISO code, not the currency label', () => {
    expect(resolveAccountRowAmount(usdAccount).code).toBe('USD');
  });
});

describe('N3 row accessibility (S5)', () => {
  it('announces name, type and amount as one label', () => {
    expect(resolveAccountRowA11yLabel(egpAccount)).toBe('CIB Current, Bank, 48,250 EGP');
  });
});
