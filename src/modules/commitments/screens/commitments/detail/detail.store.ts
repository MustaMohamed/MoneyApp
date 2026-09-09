import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';

interface CommitmentDetailEntry {
  allPayments: CommitmentPayment[];
}

interface CommitmentDetailStoreShape {
  entries: Record<string, CommitmentDetailEntry>;
}

type CommitmentDetailStore = CommitmentDetailStoreShape & {
  setAllPayments: (owner: string, payments: CommitmentPayment[]) => void;
  release: (owner: string) => void;
  reset: () => void;
};

// One shared array, so an unkeyed read is referentially stable across renders.
const EMPTY_PAYMENTS: CommitmentPayment[] = [];
Object.freeze(EMPTY_PAYMENTS);

export const INITIAL_DATA_ENTRY: CommitmentDetailEntry = Object.freeze({
  allPayments: EMPTY_PAYMENTS,
});

const initialState = (): CommitmentDetailStoreShape => ({ entries: {} });

const withEntry = (
  state: CommitmentDetailStoreShape,
  owner: string,
  entry: CommitmentDetailEntry,
): CommitmentDetailStoreShape => ({ entries: { ...state.entries, [owner]: entry } });

export const useCommitmentDetailStore = createMoneyAppSelectors(
  create<CommitmentDetailStore>((set) => ({
    ...initialState(),
    setAllPayments: (owner, payments) =>
      set((state) => withEntry(state, owner, { allPayments: payments })),
    release: (owner) =>
      set((state) => {
        if (!(owner in state.entries)) return state;
        const entries = { ...state.entries };
        delete entries[owner];
        return { entries };
      }),
    reset: () => set(initialState()),
  })),
);
