import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import {
  availableCredit,
  baseEquivalent,
  dailyAverage,
  netFlow,
  savingsMonthStart,
} from '@/modules/accounts/domain/account_figures';
import { isOverLimit } from '@/modules/accounts/domain/is_over_limit';
import type { Account } from '@/modules/accounts/store/account.store';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatCurrencyAmount,
  formatCurrencyParts,
  formatDisplayAmountParts,
  formatOwnedAmount,
  formatOwnedAmountParts,
  signAmountText,
} from '@/utils/format_amount';

// 1dp, finer than EGP's 0dp default, so a small daily average does not round to "0".
const ACCOUNT_CARD_AVG_DAY_DECIMALS = 1;

/** Both formatters take the same three arguments, so `amountText` cannot drift from `value` (MA-024). */
function amountParts(
  value: number,
  currency: Currency,
  decimals?: number,
): Required<Pick<InfoRow, 'value' | 'amountText'>> {
  return {
    value: formatCurrencyAmount(value, currency, decimals),
    amountText: formatCurrencyParts(value, currency, decimals).value,
  };
}

/** Zero-gated sign composition (#332): a net that prints as zero carries no sign either way. */
function signedStatParts(
  value: number,
  currency: Currency,
): Required<Pick<InfoRow, 'value' | 'amountText'>> {
  const { text, withCode, printsAsZero } = formatDisplayAmountParts(value, currency);
  const sign = value >= 0 ? PLUS_SIGN : MINUS_SIGN;
  return {
    value: signAmountText(withCode, sign, printsAsZero),
    amountText: signAmountText(text, sign, printsAsZero),
  };
}

function nextDueDate(dueDay: number): string {
  const today = new Date();
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const target =
    thisMonthDue.getDate() < today.getDate() || thisMonthDue.getMonth() < today.getMonth()
      ? new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
      : thisMonthDue;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export type InfoRowKind =
  | 'limit'
  | 'available'
  | 'dueDate'
  | 'monthSpend'
  | 'avgDay'
  | 'weekSpend'
  | 'monthStart'
  | 'change'
  | 'monthIn'
  | 'monthOut'
  | 'thisWeek'
  | 'inBase';

export interface InfoRow {
  kind: InfoRowKind;
  label: string;
  value: string;
  /** `value` without its currency code; absent on the due-date and over-limit rows. */
  amountText?: string;
  valueColor?: string;
  icon?: 'up' | 'down';
}

/** The month pair the card and the account detail's fact rows both render (MA-028). */
export function buildMonthRows(stats: AccountStats, currency: Currency): [InfoRow, InfoRow] {
  return [
    {
      kind: 'monthIn',
      label: Strings.cardMonthInLabel,
      ...amountParts(stats.month_in, currency),
      valueColor: stats.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
    },
    {
      kind: 'monthOut',
      label: Strings.cardMonthOutLabel,
      ...amountParts(stats.month_out, currency),
      valueColor: stats.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
    },
  ];
}

/** Never re-derive `isRateUsable` as `rate > 0`; the store's placeholder rate is 50. */
export function buildInfoRows(
  account: Account,
  rate: number,
  stats: AccountStats | undefined,
  isRateUsable: boolean,
  baseCurrency: Currency,
): InfoRow[] {
  const s = stats ?? { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };
  const cur = account.currency;
  const isUSD = cur === Currency.USD;

  if (account.type === AccountType.CreditCard) {
    const limit = account.credit_limit ?? 0;
    const balance = account.current_balance;
    const available = availableCredit(balance, limit);
    const availColor = availableCreditColor(available, limit);
    const dueDay = account.statement_due_day;

    return [
      {
        kind: 'limit',
        label: Strings.cardLimitLabel,
        ...amountParts(limit, cur),
      },
      {
        kind: 'available',
        label: Strings.cardAvailableLabel,
        ...(isOverLimit(balance, limit)
          ? { value: Strings.accountOverLimit }
          : amountParts(available, cur)),
        valueColor: availColor,
      },
      {
        kind: 'dueDate',
        label: Strings.cardDueDateLabel,
        value: dueDay != null && dueDay > 0 ? nextDueDate(dueDay) : '—',
      },
    ];
  }

  if (account.type === AccountType.PhysicalWallet) {
    const avgDay = dailyAverage(s.month_out, new Date().getDate());
    return [
      {
        kind: 'monthSpend',
        label: Strings.cardMonthSpendLabel,
        ...amountParts(s.month_out, cur),
        valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
      {
        kind: 'avgDay',
        label: Strings.cardAvgDayLabel,
        ...amountParts(avgDay, cur, ACCOUNT_CARD_AVG_DAY_DECIMALS),
      },
      {
        kind: 'weekSpend',
        label: Strings.cardWeekSpendLabel,
        ...amountParts(s.week_out, cur),
        valueColor: s.week_out > 0 ? Colors.dark.negative : Colors.dark.text1,
      },
    ];
  }

  if (account.type === AccountType.PhysicalSavings) {
    const change = netFlow(s.month_in, s.month_out);
    const monthStart = savingsMonthStart(account.current_balance, s.month_in, s.month_out);
    const changeColor = change >= 0 ? Colors.dark.positive : Colors.dark.negative;
    return [
      {
        kind: 'monthStart',
        label: Strings.cardMonthStartLabel,
        ...amountParts(monthStart, cur),
      },
      {
        kind: 'change',
        label: Strings.cardChangeLabel,
        ...signedStatParts(change, cur),
        valueColor: changeColor,
        icon: change >= 0 ? 'up' : 'down',
      },
    ];
  }

  const weekNet = netFlow(s.week_in, s.week_out);
  const weekNetColor = weekNet >= 0 ? Colors.dark.positive : Colors.dark.negative;

  // Fires on either side of the base (#349); the base's code drives the label and the decimals.
  const baseEquivalentValue =
    isRateUsable && account.currency !== baseCurrency
      ? baseEquivalent({
          amount: account.current_balance,
          from: account.currency,
          to: baseCurrency,
          rate,
        })
      : undefined;

  const baseEquivalentRows: InfoRow[] =
    baseEquivalentValue === undefined
      ? []
      : [
          {
            kind: 'inBase',
            label: Strings.cardInBaseLabel(baseCurrency),
            value: formatOwnedAmount(baseEquivalentValue, baseCurrency),
            amountText: formatOwnedAmountParts(baseEquivalentValue, baseCurrency).value,
            valueColor: Colors.dark.gold,
          },
        ];

  const monthRows = buildMonthRows(s, cur);

  if (isUSD) {
    return [...monthRows, ...baseEquivalentRows];
  }

  return [
    ...monthRows,
    {
      kind: 'thisWeek',
      label: Strings.cardThisWeekLabel,
      ...signedStatParts(weekNet, cur),
      valueColor: weekNetColor,
    },
    ...baseEquivalentRows,
  ];
}
