// Backward-compat stub — the canonical queries live in modules/transactions/.
export {
  getMonthExpenseStats,
  addTransaction,
  getTransactions,
  getTransactionsByAccount,
  getTransactionById,
  deleteTransaction,
  getPeriodTotals,
  updateTransaction,
} from '@/modules/transactions/database/transactions';
export type {
  MonthExpenseStats,
  TransactionListQuery,
  UpdateTransactionInput,
  PeriodTotals,
} from '@/modules/transactions/database/transactions';
