import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { resolveTransactionDeleteError } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';

import { resolveTransactionDeleteBody } from './components/tx_delete_dialog.helpers';
import { useTransactionDeleteState } from './transaction_delete.state';

interface TransactionDeleteView {
  held: Transaction | undefined;
  isOpen: boolean;
  busy: boolean;
  errorMessage: string | undefined;
}

export function useTransactionDelete(
  ownerId: string,
  accountsById: ReadonlyMap<string, Account>,
  onDeleted?: () => void | Promise<void>,
) {
  const { held, isOpen, busy, errorMessage } = useTransactionDeleteState(
    useShallow((state): TransactionDeleteView => ({
      held: state.entries[ownerId]?.transaction,
      isOpen: state.entries[ownerId]?.isOpen === true,
      busy: state.entries[ownerId]?.busy === true,
      errorMessage: state.entries[ownerId]?.errorMessage,
    })),
  );
  const { toast } = useToast();
  const onDeletedRef = useRef(onDeleted);
  useLayoutEffect(() => {
    onDeletedRef.current = onDeleted;
  });

  const actions = useMemo(() => {
    const store = useTransactionDeleteState.getState();
    return {
      request: (transaction: Transaction) => store.request(ownerId, transaction),
      cancel: () => store.cancel(ownerId),
      confirm: async (): Promise<void> => {
        const { entries } = useTransactionDeleteState.getState();
        if (!(ownerId in entries)) return;
        const entry = entries[ownerId];
        if (!entry.isOpen || entry.busy) return;
        store.begin(ownerId);
        try {
          // Resolves once the list's refresh after the write settles, so the toast follows the rows.
          await useTransactionStore.getState().deleteTransaction(entry.transaction.id);
        } catch (error) {
          console.error('[useTransactionDelete] delete failed:', error);
          store.fail(ownerId, resolveTransactionDeleteError(error));
          return;
        }
        // As add and edit do, so balances read the write; a failed reload never fails the delete.
        void useAccountStore
          .getState()
          .loadAccounts()
          .catch(() => undefined);
        // A copy released mid-delete must not pop whatever screen is on top now; the write stands.
        if (ownerId in useTransactionDeleteState.getState().entries) {
          store.succeed(ownerId);
          try {
            await onDeletedRef.current?.();
          } catch (error) {
            console.error('[useTransactionDelete] step after the delete failed:', error);
          }
        }
        toast.show({ label: Strings.transactionDeletedToast, variant: 'success' });
      },
    };
  }, [ownerId, toast]);

  useEffect(() => () => useTransactionDeleteState.getState().release(ownerId), [ownerId]);

  return {
    state: {
      openTransactionId: held !== undefined && isOpen ? held.id : undefined,
      body:
        held === undefined
          ? ''
          : resolveTransactionDeleteBody(
              held,
              accountsById.get(held.account_id),
              held.to_account_id === null ? undefined : accountsById.get(held.to_account_id),
            ),
      busy,
      errorMessage,
    },
    ...actions,
  };
}
