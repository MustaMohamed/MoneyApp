import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';

interface CommitmentDetailEntry {
  allPayments: CommitmentPayment[];
}

type CommitmentDetailStoreShape = KeyedEntries<CommitmentDetailEntry>;

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

export const useCommitmentDetailStore = createMoneyAppSelectors(
  create<CommitmentDetailStore>((set) => ({
    ...initialState(),
    setAllPayments: (owner, payments) =>
      set((state) => withEntry(state, owner, { allPayments: payments })),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
