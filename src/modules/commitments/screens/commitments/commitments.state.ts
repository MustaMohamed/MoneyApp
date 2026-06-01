import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

import { CommitmentPaymentStatus } from '@/constants/enums';

export type CommitmentStatusFilter = 'all' | CommitmentPaymentStatus;

type CommitmentsScreenState = {
  refreshing: ReadonlySignal<boolean>;
  statusFilter: ReadonlySignal<CommitmentStatusFilter>;
};

type CommitmentsScreenActions = {
  setRefreshing: (v: boolean) => void;
  setStatusFilter: (f: CommitmentStatusFilter) => void;
  reset: () => void;
};

export function useCommitmentsScreenState(): {
  state: CommitmentsScreenState;
} & CommitmentsScreenActions {
  const refreshing = useSignal(false);
  const statusFilter = useSignal<CommitmentStatusFilter>('all');

  const setRefreshing = useCallback(
    (v: boolean) => {
      refreshing.value = v;
    },
    [refreshing],
  );

  const setStatusFilter = useCallback(
    (f: CommitmentStatusFilter) => {
      statusFilter.value = f;
    },
    [statusFilter],
  );

  const reset = useCallback(() => {
    batch(() => {
      refreshing.value = false;
      statusFilter.value = 'all';
    });
  }, [refreshing, statusFilter]);

  return {
    state: { refreshing, statusFilter },
    setRefreshing,
    setStatusFilter,
    reset,
  };
}
