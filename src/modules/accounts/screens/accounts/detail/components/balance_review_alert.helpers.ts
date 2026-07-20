import { AccountType } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';

export function shouldShowBalanceReview(account: Account): boolean {
  return account.type === AccountType.CreditCard && account.balance_review_required === 1;
}
