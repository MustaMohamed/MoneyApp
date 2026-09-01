import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { formatStoredMoneyText } from '@/utils/money_text';

export type EditTransactionFormValues = {
  amount: number;
  categoryId: string;
  budgetId: string;
  note: string;
  date: string;
  time: string;
  exchangeRate: string;
};

export function buildDefaultsFromTx(
  tx: Transaction,
  fallbackRate: number,
): EditTransactionFormValues {
  return {
    amount: tx.amount,
    categoryId: tx.category_id ?? '',
    budgetId: tx.budget_id ?? '',
    note: tx.note ?? '',
    date: tx.transaction_date,
    time: tx.transaction_time,
    exchangeRate: formatStoredMoneyText(tx.exchange_rate ?? fallbackRate),
  };
}
