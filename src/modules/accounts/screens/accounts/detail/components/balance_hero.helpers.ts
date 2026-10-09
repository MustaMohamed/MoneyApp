import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { SemanticTokens } from '@/constants/theme_tokens';
import { creditBandColor } from '@/modules/accounts/constants/available_credit_color';
import { availableCredit } from '@/modules/accounts/domain/account_figures';
import { isOverLimit } from '@/modules/accounts/domain/is_over_limit';
import { formatAccountBalance, formatAmount, formatCurrencyAmount } from '@/utils/format_amount';

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
    const available = availableCredit(account.current_balance, limit);
    return {
      text: Strings.accountHeroAvailable(
        formatCurrencyAmount(available, currency),
        formatAmount(limit, decimals),
      ),
      adjusted: false,
      color: creditBandColor(account.current_balance, limit),
    };
  }

  return {
    text: Strings.accountHeroOpening(formatAccountBalance(account.opening_balance, currency)),
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
