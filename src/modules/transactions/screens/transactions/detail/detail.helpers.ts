import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { AccountType } from '@/constants/enums';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Maps an account type to its MaterialCommunityIcons glyph used by the
 * transaction detail screen's Account row. Mirrors the dashboard's
 * `account_card.tsx` mapping so the same account renders with the same
 * icon everywhere — a credit card is a credit card whether you're on the
 * dashboard or inside a transaction.
 *
 * Falls back to a generic card icon when the account type is unknown
 * (defensive — shouldn't happen with our enum but the DB has historical
 * rows that may not match the current enum).
 */
const ACCOUNT_TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

export function getAccountTypeIcon(type: string | undefined): IconName {
  if (type && type in ACCOUNT_TYPE_ICONS) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 'in' guard confirms type is a valid AccountType key
    return ACCOUNT_TYPE_ICONS[type as AccountType];
  }
  return 'card-bulleted-outline';
}

export function getCommitmentPaymentRoute(paymentId: string): `/commitments/${string}` {
  return `/commitments/${paymentId}`;
}
