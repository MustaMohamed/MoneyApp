import { CURRENCY_CONFIG } from '@/constants/currency';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { resolveAccountName } from '@/utils/account_name';
import { formatDisplayMagnitude } from '@/utils/format_amount';

import { isCardCredit } from './transaction_row.helpers';

/** What deleting `tx` does to the balances; `toAccount` is a transfer's destination or a payment's card. */
export function resolveTransactionDeleteBody(
  tx: Transaction,
  account: Account | undefined,
  toAccount: Account | undefined,
): string {
  const magnitude = formatDisplayMagnitude(tx.amount, tx.currency).text;
  const amount = `${magnitude} ${CURRENCY_CONFIG[tx.currency].code}`;
  const accountName = resolveAccountName(account);
  if (isCardCredit(tx, account)) return Strings.deleteConfirmBodyCardCredit(amount, accountName);
  switch (tx.type) {
    case TransactionType.Expense:
      return Strings.deleteConfirmBodyExpense(amount, accountName);
    case TransactionType.Income:
      return Strings.deleteConfirmBodyIncome(amount, accountName);
    case TransactionType.Transfer:
      return Strings.deleteConfirmBodyTransfer(amount, accountName, resolveAccountName(toAccount));
    case TransactionType.CCPayment:
      return Strings.deleteConfirmBodyCardPayment(
        amount,
        accountName,
        resolveAccountName(toAccount),
      );
  }
}
