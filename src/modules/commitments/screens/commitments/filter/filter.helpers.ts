import { CommitmentPaymentStatus } from '@/constants/enums';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';

import { detectPreset } from '../commitment_form.shared';
import type { CommitmentAdvancedFilters } from './filter.store';

export interface CommitmentFilterCandidate {
  payment: CommitmentPayment;
  commitment?: Commitment;
  accountName?: string;
  categoryName?: string;
}

type NamedEntity = { name: string };

function sameStringSet<T extends string>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

function hasAmountFilter(filters: CommitmentAdvancedFilters): boolean {
  return filters.amountMin !== undefined || filters.amountMax !== undefined;
}

export function countActiveCommitmentFilters(filters: CommitmentAdvancedFilters): number {
  let count = 0;
  if (filters.accountIds.length > 0) count++;
  if (filters.categoryIds.length > 0) count++;
  if (hasAmountFilter(filters)) count++;
  if (filters.amountTypes.length > 0) count++;
  if (filters.recurrencePresets.length > 0) count++;
  return count;
}

export function commitmentFiltersEqual(
  a: CommitmentAdvancedFilters,
  b: CommitmentAdvancedFilters,
): boolean {
  const amountActive = hasAmountFilter(a) || hasAmountFilter(b);
  return (
    sameStringSet(a.accountIds, b.accountIds) &&
    sameStringSet(a.categoryIds, b.categoryIds) &&
    sameStringSet(a.amountTypes, b.amountTypes) &&
    sameStringSet(a.recurrencePresets, b.recurrencePresets) &&
    a.amountMin === b.amountMin &&
    a.amountMax === b.amountMax &&
    (!amountActive || a.amountCurrency === b.amountCurrency)
  );
}

function resolveDisplayAmount(payment: CommitmentPayment): number | null {
  if (payment.status === CommitmentPaymentStatus.Paid)
    return payment.amount_paid ?? payment.amount_due;
  return payment.amount_due;
}

export function commitmentMatchesAdvancedFilters(
  candidate: CommitmentFilterCandidate,
  filters: CommitmentAdvancedFilters,
): boolean {
  const { payment, commitment } = candidate;

  if (filters.accountIds.length > 0) {
    const ids = [payment.account_id, commitment?.account_id].filter(
      (id): id is string => id !== null && id !== undefined,
    );
    if (!ids.some((id) => filters.accountIds.includes(id))) return false;
  }

  if (filters.categoryIds.length > 0) {
    if (!commitment || !filters.categoryIds.includes(commitment.category_id)) return false;
  }

  if (hasAmountFilter(filters)) {
    if (payment.currency !== filters.amountCurrency) return false;
    const amount = resolveDisplayAmount(payment);
    if (amount === null) return false;
    if (filters.amountMin !== undefined && amount < filters.amountMin) return false;
    if (filters.amountMax !== undefined && amount > filters.amountMax) return false;
  }

  if (filters.amountTypes.length > 0) {
    if (!commitment || !filters.amountTypes.includes(commitment.amount_type)) return false;
  }

  if (filters.recurrencePresets.length > 0) {
    if (!commitment) return false;
    const preset = detectPreset(commitment.recurrence_every, commitment.recurrence_period);
    if (!filters.recurrencePresets.includes(preset)) return false;
  }

  return true;
}

export function commitmentMatchesSearch(
  candidate: CommitmentFilterCandidate,
  searchQuery: string,
): boolean {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;
  const values = [
    candidate.commitment?.name,
    candidate.commitment?.notes,
    candidate.payment.notes,
    candidate.accountName,
    candidate.categoryName,
  ];
  return values.some((value) => value?.toLowerCase().includes(query));
}

export function formatCommitmentSelectionSummary(names: string[], allLabel: string): string {
  if (names.length === 0) return allLabel;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function selectedNames(ids: string[], source: ReadonlyMap<string, NamedEntity>): string[] {
  return ids.map((id) => source.get(id)?.name).filter((name): name is string => name !== undefined);
}
