import { AccountType, Currency } from '@/constants/enums';
import { DEFAULT_ACCOUNT_COLOR } from '@/modules/accounts/constants/account_palette';
import {
  N3_ROW_MIN_HEIGHT,
  N3_ROW_STYLE,
  resolveAccountRowA11yLabel,
  resolveAccountRowDotColor,
} from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.geometry';
import { makeTestAccount } from '@/test_helpers/transaction';
import { ms } from '@/utils/responsive';

// `makeTestAccount` defaults to EGP, `color: null` and both balances 0.
const egpAccount = makeTestAccount({
  name: 'CIB Current',
  type: AccountType.Bank,
  current_balance: 48250.4,
});
const usdAccount = makeTestAccount({ currency: Currency.USD, current_balance: 1350.5 });

describe('N3 row geometry — the truncation contract (S3)', () => {
  it('is 58dp, the mockup value, as a minimum', () => {
    expect(N3_ROW_MIN_HEIGHT).toBe(ms(58));
    expect(N3_ROW_STYLE.minHeight).toBe(N3_ROW_MIN_HEIGHT);
  });

  it('carries exactly these keys — nothing added, nothing dropped', () => {
    // `style` beats `className` in RN, so a dropped key half-overrides `.list-group__item`.
    expect(Object.keys(N3_ROW_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'gap',
      'minHeight',
      'paddingHorizontal',
      'paddingVertical',
    ]);
  });

  it('is frozen, so one stray assignment cannot move every row at once', () => {
    expect(Object.isFrozen(N3_ROW_STYLE)).toBe(true);
  });
});

describe('N3 row colour dot (S5)', () => {
  // Literal hexes, not `ACCOUNT_PALETTE` lookups, which would assert `f(x)` equals `f(x)`.
  it('paints a known palette hex with itself', () => {
    expect(resolveAccountRowDotColor('#C9973A')).toBe('#C9973A');
  });

  // Keeps the assertion above from collapsing into `x === x` if the default is re-pointed.
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
  it('renders USD cents', () => {
    expect(resolveAccountRowA11yLabel(usdAccount)).toContain('1,350.50 USD');
  });

  it('reads current_balance, not opening_balance', () => {
    // `current_balance` equals `opening_balance` at creation, so only unequal fixtures catch it.
    const account = makeTestAccount({ current_balance: 999, opening_balance: 111 });
    expect(resolveAccountRowA11yLabel(account)).toContain('999');
    expect(resolveAccountRowA11yLabel(account)).not.toContain('111');
  });

  it('renders the ISO code, not the currency label', () => {
    expect(resolveAccountRowA11yLabel(usdAccount)).toContain('USD');
  });
});

describe('N3 row accessibility (S5)', () => {
  it('announces name, type and amount as one label', () => {
    expect(resolveAccountRowA11yLabel(egpAccount)).toBe('CIB Current, Bank, 48,250 EGP');
  });
});
