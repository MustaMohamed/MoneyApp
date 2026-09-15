import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';
import type { CommitmentDetailLoadStatus } from './detail.state';

export type CommitmentDetailViewState =
  | 'loading'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData'
  | 'ready';

export interface CommitmentDetailViewStateInput {
  hasCommitment: boolean;
  /** The UI entry's load belongs to the commitment now on the route. */
  ownsStatus: boolean;
  status: CommitmentDetailLoadStatus;
  hasRows: boolean;
  refreshError: boolean;
}

export function resolveCommitmentDetailViewState({
  hasCommitment,
  ownsStatus,
  status,
  hasRows,
  refreshError,
}: CommitmentDetailViewStateInput): CommitmentDetailViewState {
  if (!hasCommitment) return 'notFound';
  if (!ownsStatus || status === 'loading') return hasRows ? 'ready' : 'loading';
  if (status === 'firstLoadError') return hasRows ? 'refreshErrorWithData' : 'firstLoadError';
  if (refreshError && hasRows) return 'refreshErrorWithData';
  return 'ready';
}

/** The store's month array is the optimistic one, so a row both hold reads the store's status. */
export function overlayStorePayments(
  rows: CommitmentPayment[],
  storePayments: CommitmentPayment[],
): CommitmentPayment[] {
  if (rows.length === 0 || storePayments.length === 0) return rows;
  const storeById = new Map(storePayments.map((p) => [p.id, p]));
  if (!rows.some((row) => storeById.has(row.id))) return rows;
  return rows.map((row) => storeById.get(row.id) ?? row);
}
