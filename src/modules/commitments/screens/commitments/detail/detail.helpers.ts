import { isUnpaidPayment } from '../../../domain/payment_state';
import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';
import type { CommitmentDetailLoadStatus } from './detail.state';

export type CommitmentDetailViewState =
  | 'loading'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData'
  | 'ready';

export interface CommitmentDetailViewStateInput {
  /** The data entry for the route's id holds a commitment. */
  hasCommitment: boolean;
  /** The UI entry's load belongs to the commitment now on the route. */
  ownsStatus: boolean;
  status: CommitmentDetailLoadStatus;
  refreshError: boolean;
}

export function resolveCommitmentDetailViewState({
  hasCommitment,
  ownsStatus,
  status,
  refreshError,
}: CommitmentDetailViewStateInput): CommitmentDetailViewState {
  if (!ownsStatus || status === 'loading') return hasCommitment ? 'ready' : 'loading';
  if (status === 'firstLoadError') return hasCommitment ? 'refreshErrorWithData' : 'firstLoadError';
  if (!hasCommitment) return 'notFound';
  if (refreshError) return 'refreshErrorWithData';
  return 'ready';
}

export function commitmentDetailShowsEdit(viewState: CommitmentDetailViewState): boolean {
  return viewState === 'ready' || viewState === 'refreshErrorWithData';
}

/** `payments` in due-date order; the param's row, then the previous due date, then the earliest unpaid row, then the last. */
export function resolveCommitmentDetailCycle(
  payments: readonly CommitmentPayment[],
  cycleId: string | undefined,
  previousDueDate: string | undefined,
): CommitmentPayment | undefined {
  return (
    payments.find((p) => p.id === cycleId) ??
    (previousDueDate === undefined
      ? undefined
      : payments.find((p) => p.due_date === previousDueDate)) ??
    payments.find(isUnpaidPayment) ??
    payments[payments.length - 1]
  );
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
