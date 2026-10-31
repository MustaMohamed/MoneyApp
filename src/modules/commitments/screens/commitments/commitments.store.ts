import { create } from 'zustand';

import { toLocalDateString } from '@/utils/format_date';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentMonthPayment } from '../../entities/commitment_payment.entity';
import {
  commitmentRepository,
  type ICommitmentRepository,
} from '../../repositories/commitment.repository';

export interface CommitmentRowsRead {
  commitmentId: string;
  /** `undefined` when no commitment holds the id. */
  commitment: Commitment | undefined;
  rows: CommitmentMonthPayment[];
  /** The local date the load ran. */
  today: string;
}

interface CommitmentsScreenStoreShape {
  rowsRead: CommitmentRowsRead | undefined;
  /** The id whose latest load failed. */
  rowsLoadErrorId: string | undefined;
}

type CommitmentsScreenStore = CommitmentsScreenStoreShape & {
  loadCommitmentRows: (commitmentId: string, now?: Date) => Promise<void>;
  reset: () => void;
};

const INITIAL_STATE: CommitmentsScreenStoreShape = {
  rowsRead: undefined,
  rowsLoadErrorId: undefined,
};

export function createCommitmentsScreenStore(
  repo: Pick<ICommitmentRepository, 'getById' | 'getPaymentsByCommitment'>,
) {
  let latestRequestId = 0;

  return createMoneyAppSelectors(
    create<CommitmentsScreenStore>((set, get) => ({
      ...INITIAL_STATE,
      loadCommitmentRows: async (commitmentId, now = new Date()) => {
        latestRequestId += 1;
        const requestId = latestRequestId;
        if (get().rowsLoadErrorId !== undefined) set({ rowsLoadErrorId: undefined });
        try {
          const [commitment, rows] = await Promise.all([
            repo.getById(commitmentId),
            repo.getPaymentsByCommitment(commitmentId),
          ]);
          if (requestId !== latestRequestId) return;
          set({ rowsRead: { commitmentId, commitment, rows, today: toLocalDateString(now) } });
        } catch (error) {
          console.error('[commitments] commitment rows read failed:', error);
          if (requestId === latestRequestId) set({ rowsLoadErrorId: commitmentId });
        }
      },
      reset: () => {
        latestRequestId += 1;
        set(INITIAL_STATE);
      },
    })),
  );
}

export const useCommitmentsScreenStore = createCommitmentsScreenStore(commitmentRepository);
