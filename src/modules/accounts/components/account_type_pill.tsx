import { ACCOUNT_TYPE_ICONS, type AccountTypeIconName } from '@/constants/account_type_icons';
import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { AccountType } from '@/constants/enums';
import { orderByRank } from '@/utils/rank_order';

export type TypeOption = {
  type: AccountType;
  icon: AccountTypeIconName;
  label: string;
};

/** Explicit order — this is the account-form grid order, not the enum's. */
const TYPE_RANK = {
  [AccountType.Bank]: 0,
  [AccountType.SmartWallet]: 1,
  [AccountType.PhysicalWallet]: 2,
  [AccountType.PhysicalSavings]: 3,
  [AccountType.CreditCard]: 4,
} satisfies Record<AccountType, number>;

const TYPE_ORDER: readonly AccountType[] = orderByRank(TYPE_RANK);

export const TYPE_OPTIONS: TypeOption[] = TYPE_ORDER.map((type) => ({
  type,
  icon: ACCOUNT_TYPE_ICONS[type],
  label: ACCOUNT_TYPE_LABELS[type],
}));
