import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { AccountType } from '@/constants/enums';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type TypeOption = {
  type: AccountType;
  icon: IconName;
  label: string;
};

export const TYPE_OPTIONS: TypeOption[] = [
  { type: AccountType.Bank, icon: 'bank', label: ACCOUNT_TYPE_LABELS[AccountType.Bank] },
  {
    type: AccountType.SmartWallet,
    icon: 'cellphone-nfc',
    label: ACCOUNT_TYPE_LABELS[AccountType.SmartWallet],
  },
  {
    type: AccountType.PhysicalWallet,
    icon: 'wallet',
    label: ACCOUNT_TYPE_LABELS[AccountType.PhysicalWallet],
  },
  {
    type: AccountType.PhysicalSavings,
    icon: 'piggy-bank',
    label: ACCOUNT_TYPE_LABELS[AccountType.PhysicalSavings],
  },
  {
    type: AccountType.CreditCard,
    icon: 'credit-card',
    label: ACCOUNT_TYPE_LABELS[AccountType.CreditCard],
  },
];
