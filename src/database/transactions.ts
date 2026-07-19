// Backward-compat stub — the canonical queries live in modules/transactions/.
export {
  getMonthExpenseStats,
  insertTransactionRow,
  getTransactions,
  getTransactionsByAccount,
  getTransactionById,
  deleteTransactionRow,
  getPeriodTotals,
  updateTransactionRow,
} from '@/modules/transactions/database/transactions';
export type {
  MonthExpenseStats,
  TransactionListQuery,
  UpdateTransactionInput,
  PeriodTotals,
} from '@/modules/transactions/database/transactions';
