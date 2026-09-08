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
  /** true only for non-CC accounts whose current balance has drifted from opening */
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

  if (isCC && limit > 0) {
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

/** An unsigned magnitude at the currency's decimals, with the canonical `−` when overdrawn (#411). */
export function formatAccountBalance(balance: number, currency: Currency): string {
  const { decimals, code } = CURRENCY_CONFIG[currency];
  // Not `formatOwnedAmountParts`: `formatDisplayMagnitude` prints an exact zero at 0dp on every currency.
  const magnitude = formatAmount(Math.abs(balance), decimals);
  const printsAsZero = magnitude === formatAmount(0, decimals);
  return `${signAmountText(magnitude, balance < 0 ? MINUS_SIGN : '', printsAsZero)} ${code}`;
}
