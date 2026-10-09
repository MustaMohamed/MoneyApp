import { AccountType, Currency } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import { buildInfoRows, type InfoRow } from '@/modules/accounts/utils/account_info_rows';
import { makeTestAccount } from '@/test_helpers/transaction';

const PLACEHOLDER_RATE = 50;

// Only a non-USD account outside the card, wallet and savings branches gets a `thisWeek` row.
const egpBank = makeTestAccount({
  type: AccountType.Bank,
  currency: Currency.EGP,
  current_balance: 1000,
  opening_balance: 1000,
});

function thisWeekRow(stats: AccountStats): InfoRow | undefined {
  return buildInfoRows(egpBank, PLACEHOLDER_RATE, stats, false, Currency.EGP).find(
    (row) => row.kind === 'thisWeek',
  );
}

describe('buildInfoRows, the thisWeek row is week_in less week_out', () => {
  it('90.5 in and 12.05 out is 78.45: a plus, 0dp for EGP, the positive colour', () => {
    const row = thisWeekRow({ month_in: 0, month_out: 0, week_in: 90.5, week_out: 12.05 });

    expect(row?.value).toBe('+78 EGP');
    expect(row?.valueColor).toBe(Colors.dark.positive);
  });

  it('12.05 in and 90.5 out is −78.45: a U+2212 minus, 0dp for EGP, the negative colour', () => {
    const row = thisWeekRow({ month_in: 0, month_out: 0, week_in: 12.05, week_out: 90.5 });

    expect(row?.value).toBe('−78 EGP');
    expect(row?.valueColor).toBe(Colors.dark.negative);
  });
});

// 0.1 + 0.2 is 0.30000000000000004, so each tied pair below nets 5.55e-17 off zero and prints as 0.
describe('buildInfoRows, a net under half a cent off zero reads as a true zero (MA-158)', () => {
  const egpSavings = makeTestAccount({
    type: AccountType.PhysicalSavings,
    currency: Currency.EGP,
    current_balance: 1000,
    opening_balance: 1000,
  });

  const changeRow = (stats: AccountStats): InfoRow | undefined =>
    buildInfoRows(egpSavings, PLACEHOLDER_RATE, stats, false, Currency.EGP).find(
      (row) => row.kind === 'change',
    );

  const week = (weekIn: number, weekOut: number): AccountStats => ({
    month_in: 0,
    month_out: 0,
    week_in: weekIn,
    week_out: weekOut,
  });

  const month = (monthIn: number, monthOut: number): AccountStats => ({
    month_in: monthIn,
    month_out: monthOut,
    week_in: 0,
    week_out: 0,
  });

  it('gives the thisWeek row the zero colour on either side of zero, and a net of 0.3 its own', () => {
    expect(thisWeekRow(week(0.6, 0.3))?.valueColor).toBe(Colors.dark.positive);
    expect(thisWeekRow(week(0.3, 0.6))?.valueColor).toBe(Colors.dark.negative);
    expect(thisWeekRow(week(0.1 + 0.2, 0.3))?.valueColor).toBe(Colors.dark.positive);
    expect(thisWeekRow(week(0.3, 0.1 + 0.2))?.valueColor).toBe(Colors.dark.positive);
  });

  it('gives the savings change row the zero colour and the up icon on either side of zero, and a net of 0.3 its own', () => {
    const gain = { valueColor: Colors.dark.positive, icon: 'up' };
    const loss = { valueColor: Colors.dark.negative, icon: 'down' };

    expect(changeRow(month(0.6, 0.3))).toMatchObject(gain);
    expect(changeRow(month(0.3, 0.6))).toMatchObject(loss);
    expect(changeRow(month(0.1 + 0.2, 0.3))).toMatchObject(gain);
    expect(changeRow(month(0.3, 0.1 + 0.2))).toMatchObject(gain);
  });
});
