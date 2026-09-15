import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { SemanticTokens } from '@/constants/theme_tokens';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';
import { isOverLimit } from '@/modules/accounts/constants/is_over_limit';
import { MINUS_SIGN, formatAmount, signAmountText } from '@/utils/format_amount';

import type { Account } from '../../../../store/account.store';

export interface HeroCaption {
  text: string;
  /** true only on the opening caption (non-CC, or an archived CC) when the current balance has drifted from opening */
  adjusted: boolean;
  /** runtime color for a CC's available-credit and over-limit captions; undefined for Opening captions */
  color?: string;
}

export function buildHeroCaption(account: Account): HeroCaption {
  const currency = account.currency;
  const isCC = account.type === AccountType.CreditCard;
  const limit = account.credit_limit ?? 0;
  // `Strings.accountHero*` interpolate the currency, so `formatCurrencyAmount` would double it.
  const decimals = CURRENCY_CONFIG[currency].decimals;

  // An archived card cannot act on its terms, so it takes the opening caption like any other account.
  if (isCC && limit > 0 && account.is_archived !== 1) {
    if (isOverLimit(account.current_balance, limit)) {
      return {
        text: Strings.accountOverLimit,
        adjusted: false,
        color: SemanticTokens.negative,
      };
    }
    const available = limit - account.current_balance;
    return {
      text: Strings.accountHeroAvailable(
        formatAmount(available, decimals),
        currency,
        formatAmount(limit, decimals),
      ),
      adjusted: false,
      color: availableCreditColor(available, limit),
    };
  }

  return {
    text: Strings.accountHeroOpening(formatAmount(account.opening_balance, decimals), currency),
    adjusted: account.current_balance !== account.opening_balance,
  };
}

export interface HeroHeading {
  label: string;
  hollow: boolean;
}

/** An archived row names its balance as the one it was archived with and hollows its tile (G2). */
export function buildHeroHeading(account: Account): HeroHeading {
  return account.is_archived === 1
    ? { label: Strings.accountDetailBalanceArchived, hollow: true }
    : { label: Strings.accountDetailBalance, hollow: false };
}

export interface AccountBalanceParts {
  amount: string;
  code: string;
  /** True when the magnitude prints as an exact zero at this currency's decimals. */
  printsAsZero: boolean;
}

/** The hero draws the code at its own size, so the two halves are available apart as well as joined. */
export function formatAccountBalanceParts(
  balance: number,
  currency: Currency,
): AccountBalanceParts {
  const { decimals, code } = CURRENCY_CONFIG[currency];
  // Not `formatOwnedAmountParts`: `formatDisplayMagnitude` prints an exact zero at 0dp on every currency.
  const magnitude = formatAmount(Math.abs(balance), decimals);
  const printsAsZero = magnitude === formatAmount(0, decimals);
  return {
    amount: signAmountText(magnitude, balance < 0 ? MINUS_SIGN : '', printsAsZero),
    code,
    printsAsZero,
  };
}

/** An unsigned magnitude at the currency's decimals, with the canonical `−` when overdrawn (#411). */
export function formatAccountBalance(balance: number, currency: Currency): string {
  const { amount, code } = formatAccountBalanceParts(balance, currency);
  return `${amount} ${code}`;
}
