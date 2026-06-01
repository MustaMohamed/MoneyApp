import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';

export type DetailViewState = 'loading' | 'notFound' | 'ready';

type CommitmentDetailState = {
  skipConfirmVisible: ReadonlySignal<boolean>;
};

type CommitmentDetailActions = {
  setSkipConfirmVisible: (v: boolean) => void;
  reset: () => void;
};

export function useCommitmentDetailState(): {
  state: CommitmentDetailState;
} & CommitmentDetailActions {
  const skipConfirmVisible = useSignal(false);

  const setSkipConfirmVisible = useCallback(
    (v: boolean) => {
      skipConfirmVisible.value = v;
    },
    [skipConfirmVisible],
  );

  const reset = useCallback(() => {
    skipConfirmVisible.value = false;
  }, [skipConfirmVisible]);

  return {
    state: { skipConfirmVisible },
    setSkipConfirmVisible,
    reset,
  };
}

type CommitmentDetailScreenDataState = {
  allPayments: ReadonlySignal<CommitmentPayment[]>;
  viewState: ReadonlySignal<DetailViewState>;
};

type CommitmentDetailScreenDataActions = {
  setAllPayments: (payments: CommitmentPayment[]) => void;
  setViewState: (vs: DetailViewState) => void;
  reset: () => void;
};

export function useCommitmentDetailScreenData(): {
  state: CommitmentDetailScreenDataState;
} & CommitmentDetailScreenDataActions {
  const allPayments = useSignal<CommitmentPayment[]>([]);
  const viewState = useSignal<DetailViewState>('loading');

  const setAllPayments = useCallback(
    (payments: CommitmentPayment[]) => {
      allPayments.value = payments;
    },
    [allPayments],
  );

  const setViewState = useCallback(
    (vs: DetailViewState) => {
      viewState.value = vs;
    },
    [viewState],
  );

  const reset = useCallback(() => {
    batch(() => {
      allPayments.value = [];
      viewState.value = 'loading';
    });
  }, [allPayments, viewState]);

  return {
    state: { allPayments, viewState },
    setAllPayments,
    setViewState,
    reset,
  };
}
