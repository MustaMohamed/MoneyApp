import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { AccountType } from '@/constants/enums';

export type AccountTypeIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** One icon per account type, everywhere — the sibling of `ACCOUNT_TYPE_LABELS`. */
export const ACCOUNT_TYPE_ICONS: Record<AccountType, AccountTypeIconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};
