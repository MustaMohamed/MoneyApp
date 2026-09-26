import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { TransactionType } from '@/constants/enums';
import { AccentCCTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';

type TransactionTypeIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** One glyph and colour per transaction type, the set the list's type tabs draw. */
export const TRANSACTION_TYPE_ICONS: Record<
  TransactionType,
  { name: TransactionTypeIconName; color: string }
> = {
  [TransactionType.Income]: { name: 'arrow-down-circle-outline', color: SemanticTokens.positive },
  [TransactionType.Expense]: { name: 'arrow-up-circle-outline', color: SemanticTokens.negative },
  [TransactionType.Transfer]: { name: 'swap-horizontal', color: InfoTokens[500] },
  [TransactionType.CCPayment]: { name: 'credit-card-refund', color: AccentCCTokens[500] },
};
