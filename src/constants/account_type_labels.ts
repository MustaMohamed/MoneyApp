import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};
