import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';
import { formatAmount } from '@/utils/format_amount';

import type { Account } from '../../../../store/account.store';

export interface HeroCaption {
  text: string;
  /** true only for non-CC accounts whose current balance has drifted from opening */
  adjusted: boolean;
  /** runtime color for CC available-credit captions; undefined for Opening captions */
  color?: string;
}

/**
 * Type-aware context caption beneath the balance (spec §2.3).
 * - Non-CC: `Opening {opening} {currency}`, with `adjusted=true` when current !== opening.
 * - CC with credit_limit > 0: `Available {max(0, limit - balance)} {currency} of {limit}`,
 *   colored by utilisation.
 * - CC with null/0 credit_limit: falls back to the Opening caption (no divide-by-zero).
 */
export function buildHeroCaption(account: Account): HeroCaption {
  const currency = account.currency;
  const isCC = account.type === AccountType.CreditCard;
  const limit = account.credit_limit ?? 0;
  // Not formatCurrencyAmount: Strings.accountHeroAvailable/accountHeroOpening interpolate
  // the currency themselves, so `formatCurrencyAmount(...)` as the `amount` arg would ship
  // "Opening 30,000 EGP EGP" (spec §6.2's own correction).
  const decimals = CURRENCY_CONFIG[currency].decimals;

  if (isCC && limit > 0) {
    const available = Math.max(0, limit - account.current_balance);
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
