// Backward-compat stub — the canonical implementation lives in modules/transactions/.
// eslint-disable-next-line
export {
  createTransactionStore,
  useTransactionStore,
  PAGE_SIZE,
} from '@/modules/transactions/store/transaction.store';
export type {
  Transaction,
  NewTransactionInput,
  TransactionListQuery,
  UpdateTransactionInput,
  TransactionListFilters,
} from '@/modules/transactions/store/transaction.store';
