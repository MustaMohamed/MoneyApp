import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { SemanticTokens } from '@/constants/theme_tokens';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';
import { formatAmount } from '@/utils/format_amount';

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
    if (account.current_balance > limit) {
      return {
        text: Strings.accountHeroOverLimit,
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
