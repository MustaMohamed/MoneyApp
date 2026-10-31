import { useCallback } from 'react';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';

import { isPaymentInTransition, useCommitmentStore } from '../../store/commitment.store';

export function useSkipWithUndo() {
  const { toast } = useToast();

  const undo = useCallback(
    async (paymentId: string) => {
      if (isPaymentInTransition(paymentId)) return;
      try {
        await useCommitmentStore.getState().undoSkip(paymentId);
      } catch {
        toast.show({ label: Strings.commitmentsUndoSkipError, variant: 'danger' });
      }
    },
    [toast],
  );

  const showSkippedToast = useCallback(
    (paymentId: string, name: string) => {
      toast.show({
        label: Strings.commitmentsSkippedToast(name),
        variant: 'success',
        actionLabel: Strings.commitmentsUndoAction,
        onActionPress: () => void undo(paymentId),
      });
    },
    [toast, undo],
  );

  const skip = useCallback(
    async (paymentId: string, name: string) => {
      if (isPaymentInTransition(paymentId)) return;
      try {
        await useCommitmentStore.getState().skipPayment(paymentId);
      } catch {
        toast.show({ label: Strings.commitmentsSkipError, variant: 'danger' });
        return;
      }
      showSkippedToast(paymentId, name);
    },
    [showSkippedToast, toast],
  );

  return { skip, showSkippedToast };
}
