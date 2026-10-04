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
