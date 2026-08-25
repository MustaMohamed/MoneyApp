import { AccountType, Currency } from '@/constants/enums';
import { Size } from '@/constants/theme';
import { DEFAULT_ACCOUNT_COLOR } from '@/modules/accounts/constants/account_palette';
import {
  N3_ROW_MIN_HEIGHT,
  N3_ROW_STYLE,
  resolveAccountRowA11yLabel,
  resolveAccountRowDotColor,
} from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.geometry';
import { makeTestAccount } from '@/test_helpers/transaction';
import { formatCurrencyParts } from '@/utils/format_amount';

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

  it('carries exactly these keys — nothing added, nothing dropped', () => {
    // One exact assertion rather than three `not.toContain`s, because absence
    // was only half of what spec §8 asked for. This pins, in one place:
    //   - no `height` — S3, truncation must not be able to change the row;
    //   - no `backgroundColor` / `borderColor` — §5.3, the group paints the
    //     fill and the row is transparent;
    //   - and the five layout keys *present*, which is the constant's own
    //     docstring reason for stating them. `style` beats `className` in RN,
    //     so dropping one silently half-overrides `.list-group__item` — the
    //     TILE_BOX_STYLE trap, invisible to every gate except the emulator.
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
    expect(formatCurrencyParts(egpAccount.current_balance, egpAccount.currency).value).toBe(
      '48,250',
    );
  });

  it('renders USD cents', () => {
    expect(formatCurrencyParts(usdAccount.current_balance, usdAccount.currency).value).toBe(
      '1,350.50',
    );
  });

  it('reads current_balance, not opening_balance', () => {
    // Business rule 6 makes the two equal at creation, so this is the only
    // fixture shape that can catch a regression to the old field.
    const account = makeTestAccount({ current_balance: 999, opening_balance: 111 });
    expect(formatCurrencyParts(account.current_balance, account.currency).value).toBe('999');
  });

  it('renders the ISO code, not the currency label', () => {
    expect(formatCurrencyParts(usdAccount.current_balance, usdAccount.currency).code).toBe('USD');
  });
});

describe('N3 row accessibility (S5)', () => {
  it('announces name, type and amount as one label', () => {
    expect(resolveAccountRowA11yLabel(egpAccount)).toBe('CIB Current, Bank, 48,250 EGP');
  });
});
