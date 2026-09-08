import { AccountType, Currency } from '@/constants/enums';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  resolveAccountCaption,
  resolveAccountsListContent,
} from '@/modules/accounts/screens/accounts/list/accounts_list.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';

describe('resolveAccountsListContent', () => {
  it.each([
    [true, 0, 'error'],
    [true, 3, 'error'],
    [false, 0, 'empty'],
    [false, 1, 'rows'],
  ])('loadError %s with %i rows shows %s', (loadError, accountCount, expected) => {
    expect(resolveAccountsListContent({ loadError, accountCount })).toBe(expected);
  });
});

// 50 is `INITIAL_STATE.rate`: greater than zero, so a bare `rate > 0` check would accept it.
const PLACEHOLDER_RATE = 50;

const stats = (overrides: Partial<AccountStats> = {}): AccountStats => ({
  month_in: 0,
  month_out: 0,
  week_in: 0,
  week_out: 0,
  ...overrides,
});

const account = (
  type: AccountType,
  currency: Currency,
  overrides: Partial<Account> = {},
): Account =>
  makeTestAccount({
    type,
    currency,
    current_balance: 0,
    opening_balance: 0,
    ...overrides,
  });

const caption = (
  target: Account,
  options: {
    rate?: number;
    stats?: AccountStats | undefined;
    isRateUsable?: boolean;
    baseCurrency?: Currency;
  } = {},
): string =>
  resolveAccountCaption({
    account: target,
    rate: options.rate ?? PLACEHOLDER_RATE,
    stats: options.stats,
    isRateUsable: options.isRateUsable ?? false,
    baseCurrency: options.baseCurrency ?? Currency.EGP,
  });

describe('resolveAccountCaption — bank', () => {
  it('reads the month in and out figures at EGP decimals', () => {
    const target = account(AccountType.Bank, Currency.EGP);
    expect(caption(target, { stats: stats({ month_in: 22300, month_out: 14950 }) })).toBe(
      'Month in 22,300 · out 14,950',
    );
  });

  it('keeps USD cents', () => {
    const target = account(AccountType.Bank, Currency.USD);
    expect(caption(target, { stats: stats({ month_in: 1250.75, month_out: 640.25 }) })).toBe(
      'Month in 1,250.75 · out 640.25',
    );
  });

  it('shows zeros when the snapshot has no figures for the account', () => {
    const target = account(AccountType.Bank, Currency.EGP);
    expect(caption(target, { stats: undefined })).toBe('Month in 0 · out 0');
  });
});

describe('resolveAccountCaption — smart wallet', () => {
  const wallet = (currency: Currency, balance: number): Account =>
    account(AccountType.SmartWallet, currency, {
      current_balance: balance,
      opening_balance: balance,
    });

  it('reads the base equivalent and the shipped rate text', () => {
    expect(
      caption(wallet(Currency.USD, 1354.25), {
        rate: 48.85,
        isRateUsable: true,
        baseCurrency: Currency.EGP,
      }),
    ).toBe('≈ 66,155 EGP at 48.85');
  });

  it('prints the rate at the two-decimal floor, so 50 reads 50.00', () => {
    expect(
      caption(wallet(Currency.USD, 100), { isRateUsable: true, baseCurrency: Currency.EGP }),
    ).toBe('≈ 5,000 EGP at 50.00');
  });

  it('divides in the EGP-under-USD-base direction', () => {
    expect(
      caption(wallet(Currency.EGP, 1000), { isRateUsable: true, baseCurrency: Currency.USD }),
    ).toBe('≈ 20.00 USD at 50.00');
  });

  it('falls back to the bank caption in the base currency', () => {
    expect(
      caption(wallet(Currency.EGP, 1000), {
        stats: stats({ month_in: 300, month_out: 100 }),
        isRateUsable: true,
        baseCurrency: Currency.EGP,
      }),
    ).toBe('Month in 300 · out 100');
  });

  it('falls back to the bank caption when the gate is shut at the placeholder rate', () => {
    expect(
      caption(wallet(Currency.USD, 1000), {
        stats: stats({ month_in: 12.5, month_out: 4 }),
        isRateUsable: false,
        baseCurrency: Currency.EGP,
      }),
    ).toBe('Month in 12.50 · out 4.00');
  });

  it('never reaches the rate formatter when the gate is shut, so a zero rate cannot throw', () => {
    expect(() =>
      caption(wallet(Currency.USD, 1000), {
        rate: 0,
        isRateUsable: false,
        baseCurrency: Currency.EGP,
      }),
    ).not.toThrow();
  });
});

describe('resolveAccountCaption — cash wallet', () => {
  it('reads month spend and week spend, skipping the avg/day row', () => {
    const target = account(AccountType.PhysicalWallet, Currency.EGP);
    expect(caption(target, { stats: stats({ month_out: 4820, week_out: 1140 }) })).toBe(
      'Month spend 4,820 · week 1,140',
    );
  });
});

describe('resolveAccountCaption — savings', () => {
  const savings = (balance: number): Account =>
    account(AccountType.PhysicalSavings, Currency.EGP, {
      current_balance: balance,
      opening_balance: balance,
    });

  it('reads the month start and a positive change with its composed plus', () => {
    expect(caption(savings(25000), { stats: stats({ month_in: 6000, month_out: 1000 }) })).toBe(
      'Month start 20,000 · +5,000',
    );
  });

  it('composes U+2212 for a negative month, never an ASCII hyphen', () => {
    const text = caption(savings(25000), { stats: stats({ month_out: 500 }) });
    expect(text).toBe('Month start 25,500 · −500');
    expect(text).not.toContain('-');
  });

  it('carries no sign on a flat month', () => {
    expect(caption(savings(25000), { stats: stats({ month_in: 1000, month_out: 1000 }) })).toBe(
      'Month start 25,000 · 0',
    );
  });
});

describe('resolveAccountCaption — credit card', () => {
  const card = (balance: number): Account =>
    account(AccountType.CreditCard, Currency.EGP, {
      current_balance: balance,
      opening_balance: balance,
      credit_limit: 40000,
      statement_due_day: 12,
    });

  it('reads the limit and the available credit', () => {
    expect(caption(card(8450))).toBe('Limit 40,000 · available 31,550');
  });

  it('carries the over-limit state through in place of the available amount', () => {
    expect(caption(card(45000))).toBe('Limit 40,000 · available Over limit');
  });
});

describe('resolveAccountCaption — only the smart wallet equivalent carries a currency code', () => {
  it.each([
    [AccountType.Bank, Currency.EGP],
    [AccountType.Bank, Currency.USD],
    [AccountType.PhysicalWallet, Currency.EGP],
    [AccountType.PhysicalWallet, Currency.USD],
    [AccountType.PhysicalSavings, Currency.EGP],
    [AccountType.PhysicalSavings, Currency.USD],
    [AccountType.CreditCard, Currency.EGP],
    [AccountType.CreditCard, Currency.USD],
  ])('%s in %s names no currency', (type, currency) => {
    const target = account(type, currency, {
      current_balance: 1000,
      opening_balance: 1000,
      credit_limit: 40000,
      statement_due_day: 12,
    });
    for (const baseCurrency of [Currency.EGP, Currency.USD]) {
      const text = caption(target, {
        stats: stats({ month_in: 1250.75, month_out: 640.25, week_in: 90.5, week_out: 12.05 }),
        isRateUsable: true,
        baseCurrency,
      });
      expect(text).not.toContain(Currency.EGP);
      expect(text).not.toContain(Currency.USD);
    }
  });
});
