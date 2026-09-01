import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/store/account.store';
import { buildInfoRows } from '@/modules/dashboard/screens/dashboard/components/account_card';
import { makeTestAccount } from '@/test_helpers/transaction';

const STATS: AccountStats = { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };

// 50 is `INITIAL_STATE.rate`: greater than zero, so a bare `rate > 0` check would accept it.
const PLACEHOLDER_RATE = 50;

const usdBank = (balance: number): Account =>
  makeTestAccount({
    type: AccountType.Bank,
    currency: Currency.USD,
    current_balance: balance,
    opening_balance: balance,
  });

const egpBank = (balance: number): Account =>
  makeTestAccount({
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: balance,
    opening_balance: balance,
  });

const labels = (account: Account, isRateUsable: boolean, baseCurrency: Currency): string[] =>
  buildInfoRows(account, PLACEHOLDER_RATE, STATS, isRateUsable, baseCurrency).map(
    (row) => row.label,
  );

describe('buildInfoRows — the converted row follows the rate gate', () => {
  it('converts a USD balance when the rate is usable', () => {
    const rows = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, true, Currency.EGP);

    expect(labels(usdBank(100), true, Currency.EGP)).toContain(Strings.cardInEgpLabel);
    expect(rows.at(-1)?.value).toBe('5,000 EGP');
  });

  it('renders no converted row when the rate is unusable', () => {
    const rows = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, false, Currency.EGP);

    expect(labels(usdBank(100), false, Currency.EGP)).not.toContain(Strings.cardInEgpLabel);
    expect(rows.map((row) => row.value)).not.toContain('5,000 EGP');
  });

  it('leaves the native-currency rows alone in both states', () => {
    const native = [Strings.cardMonthInLabel, Strings.cardMonthOutLabel];
    const nativeValues = ['0.00 USD', '0.00 USD'];

    const withRate = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, true, Currency.EGP);
    const withoutRate = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, false, Currency.EGP);

    expect(withRate.slice(0, 2).map((row) => row.label)).toEqual(native);
    expect(withRate.slice(0, 2).map((row) => row.value)).toEqual(nativeValues);
    expect(withoutRate.map((row) => row.label)).toEqual(native);
    expect(withoutRate.map((row) => row.value)).toEqual(nativeValues);
  });

  it('leaves an EGP account identical in both states', () => {
    expect(buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS, false, Currency.EGP)).toEqual(
      buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS, true, Currency.EGP),
    );
  });
});

describe('buildInfoRows — the converted row is suppressed in the base currency', () => {
  it('drops the row for a USD card under a USD base, rate usable or not', () => {
    expect(labels(usdBank(100), true, Currency.USD)).not.toContain(Strings.cardInEgpLabel);
  });

  it('keeps the row for a USD card under an EGP base with a usable rate', () => {
    const rows = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, true, Currency.EGP);

    expect(rows.map((row) => row.label)).toContain(Strings.cardInEgpLabel);
    expect(rows.at(-1)?.value).toBe('5,000 EGP');
  });
});

describe('buildInfoRows — #277 the six zero-decimal sites take CURRENCY_CONFIG decimals', () => {
  // Separate from `STATS` because several tests above depend on that fixture staying all-zero.
  const STATS_CENTS: AccountStats = {
    month_in: 1250.75,
    month_out: 640.25,
    week_in: 90.5,
    week_out: 12.05,
  };

  const STATS_WEEK_CENTS: AccountStats = { ...STATS, week_out: 3.5 };

  const physicalWallet = (currency: Currency): Account =>
    makeTestAccount({
      type: AccountType.PhysicalWallet,
      currency,
      current_balance: 5000,
      opening_balance: 5000,
    });

  const physicalSavings = (currency: Currency): Account =>
    makeTestAccount({
      type: AccountType.PhysicalSavings,
      currency,
      current_balance: 1000,
      opening_balance: 1000,
    });

  it.each([
    ['USD', Currency.USD, '640.25 USD'],
    ['EGP', Currency.EGP, '640 EGP'],
  ])('PhysicalWallet month_out (:107) — %s direction', (_dir, currency, expected) => {
    const rows = buildInfoRows(
      physicalWallet(currency),
      PLACEHOLDER_RATE,
      STATS_CENTS,
      false,
      Currency.EGP,
    );
    expect(rows[0]?.value).toBe(expected);
  });

  it.each([
    ['USD', Currency.USD, '12.05 USD'],
    ['EGP', Currency.EGP, '12 EGP'],
  ])('PhysicalWallet week_out (:116) — %s direction', (_dir, currency, expected) => {
    const rows = buildInfoRows(
      physicalWallet(currency),
      PLACEHOLDER_RATE,
      STATS_CENTS,
      false,
      Currency.EGP,
    );
    expect(rows[2]?.value).toBe(expected);
  });

  it.each([
    ['USD', Currency.USD, '3.50 USD'],
    ['EGP', Currency.EGP, '4 EGP'],
  ])(
    'PhysicalWallet week_out (:116), second cents fixture — %s direction',
    (_dir, currency, expected) => {
      const rows = buildInfoRows(
        physicalWallet(currency),
        PLACEHOLDER_RATE,
        STATS_WEEK_CENTS,
        false,
        Currency.EGP,
      );
      expect(rows[2]?.value).toBe(expected);
    },
  );

  it.each([
    ['USD', Currency.USD, '389.50 USD'],
    ['EGP', Currency.EGP, '390 EGP'],
  ])('PhysicalSavings monthStart (:130) — %s direction', (_dir, currency, expected) => {
    const rows = buildInfoRows(
      physicalSavings(currency),
      PLACEHOLDER_RATE,
      STATS_CENTS,
      false,
      Currency.EGP,
    );
    expect(rows[0]?.value).toBe(expected);
  });

  it.each([
    ['USD', Currency.USD, '+610.50 USD'],
    ['EGP', Currency.EGP, '+611 EGP'],
  ])(
    'PhysicalSavings change (:134), composed sign kept — %s direction',
    (_dir, currency, expected) => {
      const rows = buildInfoRows(
        physicalSavings(currency),
        PLACEHOLDER_RATE,
        STATS_CENTS,
        false,
        Currency.EGP,
      );
      expect(rows[1]?.value).toBe(expected);
    },
  );

  it('Bank + USD month_in (:149) takes CURRENCY_CONFIG decimals', () => {
    const rows = buildInfoRows(usdBank(1000), PLACEHOLDER_RATE, STATS_CENTS, false, Currency.EGP);
    expect(rows[0]?.value).toBe('1,250.75 USD');
  });

  it('Bank + USD month_out (:154) takes CURRENCY_CONFIG decimals', () => {
    const rows = buildInfoRows(usdBank(1000), PLACEHOLDER_RATE, STATS_CENTS, false, Currency.EGP);
    expect(rows[1]?.value).toBe('640.25 USD');
  });

  it('Bank + EGP month_in/month_out — unchanged, out of scope (spec row 29)', () => {
    const rows = buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS_CENTS, false, Currency.EGP);
    expect(rows[0]?.value).toBe('1,251 EGP');
    expect(rows[1]?.value).toBe('640 EGP');
  });

  it('pins avgDay (:112) at its explicit 1dp on a frozen clock — unchanged (spec row 28)', () => {
    // Local-time constructor so `getDate()` is 20 in any timezone.
    jest.useFakeTimers({ now: new Date(2026, 7, 20, 12, 0, 0) });
    try {
      const usdRows = buildInfoRows(
        physicalWallet(Currency.USD),
        PLACEHOLDER_RATE,
        STATS_CENTS,
        false,
        Currency.EGP,
      );
      const egpRows = buildInfoRows(
        physicalWallet(Currency.EGP),
        PLACEHOLDER_RATE,
        STATS_CENTS,
        false,
        Currency.EGP,
      );
      // month_out: 640.25 / 20 days = 32.0125 -> '32.0' at the explicit 1dp this site keeps.
      expect(usdRows[1]?.value).toBe('32.0 USD');
      expect(egpRows[1]?.value).toBe('32.0 EGP');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("buildInfoRows — credit card limit/available take the card's own currency (#287 fix)", () => {
  const creditCard = (currency: Currency, balance: number, limit: number | null): Account =>
    makeTestAccount({
      type: AccountType.CreditCard,
      currency,
      current_balance: balance,
      opening_balance: balance,
      credit_limit: limit,
    });

  it('a USD card now renders limit and available credit in USD, not EGP', () => {
    const rows = buildInfoRows(
      creditCard(Currency.USD, 200, 1000),
      PLACEHOLDER_RATE,
      STATS,
      false,
      Currency.EGP,
    );
    expect(rows[0]?.value).toBe('1,000.00 USD');
    expect(rows[1]?.value).toBe('800.00 USD');
  });

  it('an EGP card renders limit and available credit unchanged', () => {
    const rows = buildInfoRows(
      creditCard(Currency.EGP, 200, 1000),
      PLACEHOLDER_RATE,
      STATS,
      false,
      Currency.EGP,
    );
    expect(rows[0]?.value).toBe('1,000 EGP');
    expect(rows[1]?.value).toBe('800 EGP');
  });

  it('the over-limit short-circuit still shows Strings.cardOverLimit, on either currency', () => {
    const egpRows = buildInfoRows(
      creditCard(Currency.EGP, 1500, 1000),
      PLACEHOLDER_RATE,
      STATS,
      false,
      Currency.EGP,
    );
    const usdRows = buildInfoRows(
      creditCard(Currency.USD, 1500, 1000),
      PLACEHOLDER_RATE,
      STATS,
      false,
      Currency.EGP,
    );
    expect(egpRows[1]?.value).toBe(Strings.cardOverLimit);
    expect(usdRows[1]?.value).toBe(Strings.cardOverLimit);
  });

  it('the Available row is warning-coloured in the 20-50% band', () => {
    const rows = buildInfoRows(
      creditCard(Currency.EGP, 700, 1000),
      PLACEHOLDER_RATE,
      STATS,
      false,
      Currency.EGP,
    );
    expect(rows[1]?.value).toBe('300 EGP');
    expect(rows[1]?.valueColor).toBe('#E8B130');
  });
});
