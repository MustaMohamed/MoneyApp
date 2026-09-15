import type { ArchivedAccountDetailStatus } from './archived_account_detail.store';

export type AccountDetailViewState = 'active' | 'archived' | 'loading' | 'notFound' | 'loadError';

export interface AccountDetailViewInput {
  isActive: boolean;
  isArchived: boolean;
  slotStatus: ArchivedAccountDetailStatus;
  slotHoldsId: boolean;
}

export function resolveViewState({
  isActive,
  isArchived,
  slotStatus,
  slotHoldsId,
}: AccountDetailViewInput): AccountDetailViewState {
  // The active list wins; the slot only ever answers for an id that list misses.
  if (isActive) return 'active';
  if (isArchived) return 'archived';
  if (slotStatus === 'ready' && slotHoldsId) return 'notFound';
  if (slotStatus === 'initialError') return 'loadError';
  return 'loading';
}
