import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import { formatAmount } from '@/utils/format_amount';

import type { Account } from '../../../../store/account.store';

/**
 * Three-threshold utilisation color, identical to §5 AccountCard's private fn
 * (spec §4.5 / R4). Reimplemented locally — not imported across screen domains.
 *   > 50% available → positive · 20%–50% → warning · < 20% → negative
 */
export function availableCreditColor(available: number, limit: number): string {
  if (limit <= 0) return CoreTokens.text2;
  const pct = available / limit;
  if (pct > 0.5) return SemanticTokens.positive;
  if (pct >= 0.2) return SemanticTokens.warning;
  return SemanticTokens.negative;
}

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

  if (isCC && limit > 0) {
    const available = Math.max(0, limit - account.current_balance);
    return {
      text: Strings.accountHeroAvailable(formatAmount(available), currency, formatAmount(limit)),
      adjusted: false,
      color: availableCreditColor(available, limit),
    };
  }

  return {
    text: Strings.accountHeroOpening(formatAmount(account.opening_balance), currency),
    adjusted: account.current_balance !== account.opening_balance,
  };
}
