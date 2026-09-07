import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import { convertCurrency } from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/store/account.store';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatCurrencyParts,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { roundMoney } from '@/utils/money';

import { formatOwnedAmountParts } from './net_worth_breakdown_sheet.helpers';

// 1dp, finer than EGP's 0dp default, so a small daily average does not round to "0".
const ACCOUNT_CARD_AVG_DAY_DECIMALS = 1;

/** One `formatCurrencyParts` call per row, so `amountText` cannot drift from `value` (MA-024). */
function amountParts(
  value: number,
  currency: Currency,
  decimals?: number,
): Required<Pick<InfoRow, 'value' | 'amountText'>> {
  const parts = formatCurrencyParts(value, currency, decimals);
  return { value: `${parts.value} ${parts.code}`, amountText: parts.value };
}

/** Zero-gated sign composition (#332): a net that prints as zero carries no sign either way. */
function signedStatParts(
  value: number,
  currency: Currency,
): Required<Pick<InfoRow, 'value' | 'amountText'>> {
  const { text, printsAsZero } = formatDisplayMagnitude(value, currency);
  const sign = value >= 0 ? PLUS_SIGN : MINUS_SIGN;
  return {
    value: signAmountText(`${text} ${CURRENCY_CONFIG[currency].code}`, sign, printsAsZero),
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
  /** `value` without its currency code; absent on the due-date and Over Limit rows. */
  amountText?: string;
  valueColor?: string;
  icon?: 'up' | 'down';
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
    const available = Math.max(0, limit - balance);
    const isOverLimit = balance > limit && limit > 0;
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
        ...(isOverLimit ? { value: Strings.cardOverLimit } : amountParts(available, cur)),
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
    const daysElapsed = Math.max(1, new Date().getDate());
    const avgDay = s.month_out / daysElapsed;
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
    const change = s.month_in - s.month_out;
    const monthStart = account.current_balance - change;
    const changeColor = change >= 0 ? Colors.dark.positive : Colors.dark.negative;
    return [
      {
        kind: 'monthStart',
        label: Strings.cardMonthStartLabel,
        ...amountParts(Math.max(0, monthStart), cur),
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

  const weekNet = s.week_in - s.week_out;
  const weekNetColor = weekNet >= 0 ? Colors.dark.positive : Colors.dark.negative;

  // Fires whichever side of the base the account sits on (#349): `convertCurrency` picks the
  // direction from `from`/`to`, and the base's own code drives both label and display decimals.
  // One `roundMoney` at the call site; `convertCurrency` deliberately does not round (W4 ADR §3).
  const baseEquivalent =
    isRateUsable && account.currency !== baseCurrency
      ? formatOwnedAmountParts(
          roundMoney(
            convertCurrency({
              amount: account.current_balance,
              from: account.currency,
              to: baseCurrency,
              rate,
            }),
          ),
          baseCurrency,
        )
      : undefined;

  const baseEquivalentRows: InfoRow[] =
    baseEquivalent === undefined
      ? []
      : [
          {
            kind: 'inBase',
            label: Strings.cardInBaseLabel(baseCurrency),
            value: `${baseEquivalent.value} ${baseEquivalent.code}`,
            amountText: baseEquivalent.value,
            valueColor: Colors.dark.gold,
          },
        ];

  const monthRows: InfoRow[] = [
    {
      kind: 'monthIn',
      label: Strings.cardMonthInLabel,
      ...amountParts(s.month_in, cur),
      valueColor: s.month_in > 0 ? Colors.dark.positive : Colors.dark.text1,
    },
    {
      kind: 'monthOut',
      label: Strings.cardMonthOutLabel,
      ...amountParts(s.month_out, cur),
      valueColor: s.month_out > 0 ? Colors.dark.negative : Colors.dark.text1,
    },
  ];

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
