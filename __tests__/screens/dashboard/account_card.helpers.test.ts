import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import type { Account } from '@/modules/accounts/store/account.store';
import { buildInfoRows } from '@/modules/dashboard/screens/dashboard/components/account_card';
import { makeTestAccount } from '@/test_helpers/transaction';

const STATS: AccountStats = { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };

// The rate the accounts tab actually refuses on: `useCurrencyStore`'s
// `INITIAL_STATE.rate`. It is greater than zero, so any display-layer
// `rate > 0` check would call it usable — which is exactly why provenance is
// passed in rather than re-derived.
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

const labels = (account: Account, isRateUsable: boolean): string[] =>
  buildInfoRows(account, PLACEHOLDER_RATE, STATS, isRateUsable).map((row) => row.label);

describe('buildInfoRows — the converted row follows the rate gate', () => {
  it('converts a USD balance when the rate is usable', () => {
    const rows = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, true);

    expect(labels(usdBank(100), true)).toContain(Strings.cardInEgpLabel);
    expect(rows.at(-1)?.value).toBe('5,000 EGP');
  });

  it('renders no converted row when the rate is unusable', () => {
    // The defect: `$100` rendered as `5,000 EGP` directly beneath a
    // `TotalBalanceStrip` that had just refused to state a total at this rate.
    const rows = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, false);

    expect(labels(usdBank(100), false)).not.toContain(Strings.cardInEgpLabel);
    expect(rows.map((row) => row.value)).not.toContain('5,000 EGP');
  });

  it('leaves the native-currency rows alone in both states', () => {
    // Only the converted row is gated. Month in/out are USD figures that need
    // no rate, and dropping them would be a second defect. Strengthened per
    // spec §6.4: this test asserted row.label and never row.value — it
    // would have passed on the 0dp bug just as readily as on the fix.
    const native = [Strings.cardMonthInLabel, Strings.cardMonthOutLabel];
    const nativeValues = ['0.00 USD', '0.00 USD'];

    const withRate = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, true);
    const withoutRate = buildInfoRows(usdBank(100), PLACEHOLDER_RATE, STATS, false);

    expect(withRate.slice(0, 2).map((row) => row.label)).toEqual(native);
    expect(withRate.slice(0, 2).map((row) => row.value)).toEqual(nativeValues);
    expect(withoutRate.map((row) => row.label)).toEqual(native);
    expect(withoutRate.map((row) => row.value)).toEqual(nativeValues);
  });

  it('leaves an EGP account identical in both states', () => {
    // Nothing on an EGP card is converted, so the gate must not reach it.
    expect(buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS, false)).toEqual(
      buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS, true),
    );
  });
});

describe('buildInfoRows — #277 the six zero-decimal sites take CURRENCY_CONFIG decimals', () => {
  // Non-zero-cent fixture, distinct from STATS (which several tests above depend on
  // staying all-zero). Used for the month_out/week_out/monthStart/change/month_in sites.
  const STATS_CENTS: AccountStats = {
    month_in: 1250.75,
    month_out: 640.25,
    week_in: 90.5,
    week_out: 12.05,
  };

  // A second, independent cents value on the week_out line (:116) — the fixture F2/A2 adds
  // to restore the guarded count to 28: the PhysicalWallet branch is rewritten by c4, so
  // both directions are reachable here even though week_out already has a fixture above.
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
    const rows = buildInfoRows(physicalWallet(currency), PLACEHOLDER_RATE, STATS_CENTS, false);
    expect(rows[0]?.value).toBe(expected);
  });

  it.each([
    ['USD', Currency.USD, '12.05 USD'],
    ['EGP', Currency.EGP, '12 EGP'],
  ])('PhysicalWallet week_out (:116) — %s direction', (_dir, currency, expected) => {
    const rows = buildInfoRows(physicalWallet(currency), PLACEHOLDER_RATE, STATS_CENTS, false);
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
      );
      expect(rows[2]?.value).toBe(expected);
    },
  );

  it.each([
    ['USD', Currency.USD, '389.50 USD'],
    ['EGP', Currency.EGP, '390 EGP'],
  ])('PhysicalSavings monthStart (:130) — %s direction', (_dir, currency, expected) => {
    const rows = buildInfoRows(physicalSavings(currency), PLACEHOLDER_RATE, STATS_CENTS, false);
    expect(rows[0]?.value).toBe(expected);
  });

  it.each([
    ['USD', Currency.USD, '+610.50 USD'],
    ['EGP', Currency.EGP, '+611 EGP'],
  ])('PhysicalSavings change (:134), composed sign kept — %s direction', (_dir, currency, expected) => {
    const rows = buildInfoRows(physicalSavings(currency), PLACEHOLDER_RATE, STATS_CENTS, false);
    expect(rows[1]?.value).toBe(expected);
  });

  it('Bank + USD month_in (:149) takes CURRENCY_CONFIG decimals', () => {
    const rows = buildInfoRows(usdBank(1000), PLACEHOLDER_RATE, STATS_CENTS, false);
    expect(rows[0]?.value).toBe('1,250.75 USD');
  });

  it('Bank + USD month_out (:154) takes CURRENCY_CONFIG decimals', () => {
    const rows = buildInfoRows(usdBank(1000), PLACEHOLDER_RATE, STATS_CENTS, false);
    expect(rows[1]?.value).toBe('640.25 USD');
  });

  // Bank + EGP: named unchanged pins, spec row 29 — NOT guarded by either mutation. The
  // `if (isUSD)` branch above returns first, so the EGP direction of the *labels* at
  // :149/:154 never executes; these EGP amounts come out of the untouched :178/:183 branch
  // on the bare 0dp `formatAmount(x)` default, out of scope for #277 and unedited by c4.
  it('Bank + EGP month_in/month_out — unchanged, out of scope (spec row 29)', () => {
    const rows = buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS_CENTS, false);
    expect(rows[0]?.value).toBe('1,251 EGP');
    expect(rows[1]?.value).toBe('640 EGP');
  });

  it('pins avgDay (:112) at its explicit 1dp on a frozen clock — unchanged (spec row 28)', () => {
    // account_card.tsx:102 reads new Date().getDate() directly; buildInfoRows takes no
    // clock parameter, so the clock is frozen for this test only rather than widening the
    // function's signature. Local-time constructor so getDate() === 20 in any timezone.
    jest.useFakeTimers({ now: new Date(2026, 7, 20, 12, 0, 0) });
    try {
      const usdRows = buildInfoRows(physicalWallet(Currency.USD), PLACEHOLDER_RATE, STATS_CENTS, false);
      const egpRows = buildInfoRows(physicalWallet(Currency.EGP), PLACEHOLDER_RATE, STATS_CENTS, false);
      // month_out: 640.25 / 20 days = 32.0125 -> '32.0' at the explicit 1dp this site keeps.
      expect(usdRows[1]?.value).toBe('32.0 USD');
      expect(egpRows[1]?.value).toBe('32.0 EGP');
    } finally {
      jest.useRealTimers();
    }
  });
});
