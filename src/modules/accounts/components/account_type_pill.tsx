import { ACCOUNT_TYPE_ICONS, type AccountTypeIconName } from '@/constants/account_type_icons';
import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { AccountType } from '@/constants/enums';

export type TypeOption = {
  type: AccountType;
  icon: AccountTypeIconName;
  label: string;
};

/** Explicit order — this is the account-form grid order, not the enum's. */
const TYPE_ORDER: AccountType[] = [
  AccountType.Bank,
  AccountType.SmartWallet,
  AccountType.PhysicalWallet,
  AccountType.PhysicalSavings,
  AccountType.CreditCard,
];

export const TYPE_OPTIONS: TypeOption[] = TYPE_ORDER.map((type) => ({
  type,
  icon: ACCOUNT_TYPE_ICONS[type],
  label: ACCOUNT_TYPE_LABELS[type],
}));
