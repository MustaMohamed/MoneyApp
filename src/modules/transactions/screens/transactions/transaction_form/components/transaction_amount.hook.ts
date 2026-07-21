import { useAddTransactionStore } from '../add_transaction.store';
import { useEditTransactionStore } from '../edit_transaction.store';
import type { TransactionFormMode } from '../transaction_form_host.state';

export function useTransactionAmount(mode: TransactionFormMode): string {
  const addAmount = useAddTransactionStore((state) => state.amountStr);
  const editAmount = useEditTransactionStore((state) => state.amountStr);
  return mode === 'add' ? addAmount : editAmount;
}
