import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

export interface FormatTitleArgs {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
}

export interface FormattedTitle {
  title: string;
  subtitle: string;
}

export function formatTransactionTitle({
  tx,
  account,
  toAccount,
  category,
}: FormatTitleArgs): FormattedTitle {
  const accountName = account?.name ?? Strings.unknownAccount;
  const toAccountName = toAccount?.name ?? Strings.unknownAccount;
  // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string maps to undefined (empty-string blank note)
  const note = tx.note?.trim() || undefined;

  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return {
        title: note ?? category?.name ?? Strings.uncategorized,
        subtitle: accountName,
      };
    case TransactionType.Transfer:
      return {
        title: note ?? Strings.transferTitle,
        subtitle: `${accountName} → ${toAccountName}`,
      };
    case TransactionType.CCPayment:
      return {
        title: note ?? Strings.ccPaymentTitle,
        subtitle: `${accountName} → ${toAccountName}`,
      };
  }
}
