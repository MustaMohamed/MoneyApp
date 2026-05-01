import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';

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
  const time = formatTime12h(tx.transaction_time);
  const accountName = account?.name ?? Strings.unknownAccount;
  const toAccountName = toAccount?.name ?? Strings.unknownAccount;
  const note = tx.note?.trim() || undefined;

  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return {
        title: note ?? category?.name ?? Strings.uncategorized,
        subtitle: `${accountName} · ${time}`,
      };
    case TransactionType.Transfer:
      return {
        title: note ?? Strings.transferTitle,
        subtitle: `${accountName} → ${toAccountName} · ${time}`,
      };
    case TransactionType.CCPayment:
      return {
        title: note ?? Strings.ccPaymentTitle,
        subtitle: `${accountName} → ${toAccountName} · ${time}`,
      };
  }
}
