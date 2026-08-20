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
    // no rate, and dropping them would be a second defect.
    const native = [Strings.cardMonthInLabel, Strings.cardMonthOutLabel];

    expect(labels(usdBank(100), true).slice(0, 2)).toEqual(native);
    expect(labels(usdBank(100), false)).toEqual(native);
  });

  it('leaves an EGP account identical in both states', () => {
    // Nothing on an EGP card is converted, so the gate must not reach it.
    expect(buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS, false)).toEqual(
      buildInfoRows(egpBank(1000), PLACEHOLDER_RATE, STATS, true),
    );
  });
});
