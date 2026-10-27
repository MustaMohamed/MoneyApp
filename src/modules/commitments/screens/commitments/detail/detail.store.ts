import { create } from 'zustand';

import { withEntry, withoutEntry, type KeyedEntries } from '@/utils/keyed_entries';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { Commitment } from '../../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../../entities/commitment_payment.entity';

interface CommitmentDetailEntry {
  commitmentId: string | undefined;
  commitment: Commitment | undefined;
  allPayments: CommitmentMonthPayment[];
  cycleId: string | undefined;
  loadedOn: string | undefined;
}

type CommitmentDetailRead = Omit<CommitmentDetailEntry, 'commitmentId' | 'loadedOn'> & {
  loadedOn: string;
};

type CommitmentDetailStoreShape = KeyedEntries<CommitmentDetailEntry>;

type CommitmentDetailStore = CommitmentDetailStoreShape & {
  setDetail: (owner: string, commitmentId: string, detail: CommitmentDetailRead) => void;
  release: (owner: string) => void;
  reset: () => void;
};

// One shared array, so an unkeyed read is referentially stable across renders.
const EMPTY_PAYMENTS: CommitmentMonthPayment[] = [];
Object.freeze(EMPTY_PAYMENTS);

export const INITIAL_DATA_ENTRY: CommitmentDetailEntry = Object.freeze({
  commitmentId: undefined,
  commitment: undefined,
  allPayments: EMPTY_PAYMENTS,
  cycleId: undefined,
  loadedOn: undefined,
});

const initialState = (): CommitmentDetailStoreShape => ({ entries: {} });

export const useCommitmentDetailStore = createMoneyAppSelectors(
  create<CommitmentDetailStore>((set) => ({
    ...initialState(),
    setDetail: (owner, commitmentId, detail) =>
      set((state) => withEntry(state, owner, { ...detail, commitmentId })),
    release: (owner) => set((state) => withoutEntry(state, owner)),
    reset: () => set(initialState()),
  })),
);
