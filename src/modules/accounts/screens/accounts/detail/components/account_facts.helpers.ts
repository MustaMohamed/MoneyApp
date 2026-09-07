import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatAmount, formatCurrencyAmount } from '@/utils/format_amount';
import { formatOrdinal } from '@/utils/format_ordinal';

import type { Account } from '../../../../store/account.store';

export interface AccountFact {
  label: string;
  value: string;
}

// APR is a rate, not an amount, so `CURRENCY_CONFIG` decimals do not apply to it.
const APR_DISPLAY_DECIMALS = 2;

function amountOrUnset(value: number | null, currency: Currency): string {
  return value === null ? Strings.accountDetailFactUnset : formatCurrencyAmount(value, currency);
}

function dueDayValue(day: number | null): string {
  // The dashboard's gate: a stored 0 is an unset due day, not the zeroth of the month.
  if (day === null || day <= 0) return Strings.accountDetailFactUnset;
  return Strings.accountDetailDueDayValue(formatOrdinal(day));
}

function aprValue(apr: number | null, interestTracking: 0 | 1): string {
  const rate =
    apr === null
      ? Strings.accountDetailFactUnset
      : Strings.accountDetailAprValue(formatAmount(apr, APR_DISPLAY_DECIMALS));
  return interestTracking === 1 ? `${rate} · ${Strings.accountDetailInterestTracked}` : rate;
}

/** The read-only fact rows under the hero; MA-028 appends to what this returns. */
export function buildAccountFacts(account: Account): AccountFact[] {
  const currency = account.currency;

  if (account.type === AccountType.CreditCard) {
    return [
      {
        label: Strings.accountCreditLimitLabel,
        value: amountOrUnset(account.credit_limit, currency),
      },
      {
        label: Strings.accountMinPaymentLabel,
        value: amountOrUnset(account.minimum_payment, currency),
      },
      { label: Strings.accountDueDayLabel, value: dueDayValue(account.statement_due_day) },
      { label: Strings.accountAprLabel, value: aprValue(account.apr, account.interest_tracking) },
    ];
  }

  return [
    { label: Strings.accountCurrencyLabel, value: CURRENCY_CONFIG[currency].code },
    {
      label: Strings.accountBalanceLabel,
      value: formatCurrencyAmount(account.opening_balance, currency),
    },
  ];
}
