import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountActivityStore } from '@/modules/accounts/screens/accounts/detail/account_activity.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { resolveTransactionDeleteError } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { runAfterInteractions } from '@/utils/run_after_interactions';

import { resolveTransactionDeleteBody } from './components/tx_delete_dialog.helpers';
import { deleteEntryOf, useTransactionDeleteState } from './transaction_delete.state';

/** Reloads the activity of the account detail a delete pops back to; never rejects, so the toast cannot hang. */
export function reloadAccountActivityAfterDelete(): Promise<void> {
  const { snapshot } = useAccountActivityStore.getState();
  if (snapshot === undefined) return Promise.resolve();
  return new Promise((resolve) => {
    runAfterInteractions(async () => {
      try {
        // The account detail's own focus load joins this request by key, so the card reloads once.
        await useAccountActivityStore.getState().ensure({
          accountId: snapshot.accountId,
          mutationVersion: useTransactionStore.getState().mutationVersion,
          now: new Date(),
        });
      } catch (error) {
        console.error('[reloadAccountActivityAfterDelete] activity reload failed:', error);
      } finally {
        resolve();
      }
    });
  });
}

export function useTransactionDelete(
  ownerId: string,
  accountsById: ReadonlyMap<string, Account>,
  onDeleted?: () => void | Promise<void>,
) {
  const entry = useTransactionDeleteState((state) => deleteEntryOf(state.entries, ownerId));
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
        const held = deleteEntryOf(useTransactionDeleteState.getState().entries, ownerId);
        if (held === undefined || !held.isOpen || held.busy) return;
        store.begin(ownerId);
        try {
          // Resolves once the list's refresh after the write settles, so the toast follows the rows.
          await useTransactionStore.getState().deleteTransaction(held.transaction.id);
        } catch (error) {
          console.error('[useTransactionDelete] delete failed:', error);
          store.fail(ownerId, resolveTransactionDeleteError(error));
          return;
        }
        store.succeed(ownerId);
        try {
          await onDeletedRef.current?.();
        } catch (error) {
          console.error('[useTransactionDelete] step after the delete failed:', error);
        }
        toast.show({ label: Strings.transactionDeletedToast, variant: 'success' });
      },
    };
  }, [ownerId, toast]);

  useEffect(() => () => useTransactionDeleteState.getState().release(ownerId), [ownerId]);

  const held = entry?.transaction;
  return {
    state: {
      openTransactionId: entry?.isOpen === true ? entry.transaction.id : undefined,
      body:
        held === undefined
          ? ''
          : resolveTransactionDeleteBody(
              held,
              accountsById.get(held.account_id),
              held.to_account_id === null ? undefined : accountsById.get(held.to_account_id),
            ),
      busy: entry?.busy ?? false,
      errorMessage: entry?.errorMessage,
    },
    ...actions,
  };
}
