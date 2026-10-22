import { DurationType } from '@/constants/enums';
import type { ActiveCommitmentDueDate } from '@/modules/commitments/database/commitment_payments';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { computeDueDates } from '@/utils/compute_due_dates';

export type { ActiveCommitmentDueDate } from '@/modules/commitments/database/commitment_payments';

export function planMissingCommitmentPayments({
  commitments,
  dueDates,
  now,
  createId,
}: {
  commitments: Commitment[];
  dueDates: ActiveCommitmentDueDate[];
  now: Date;
  createId: () => string;
}): CommitmentPayment[] {
  const existingByCommitment = new Map<string, Set<string>>();
  for (const row of dueDates) {
    const existing = existingByCommitment.get(row.commitment_id);
    if (existing) existing.add(row.due_date);
    else existingByCommitment.set(row.commitment_id, new Set([row.due_date]));
  }

  const timestamp = now.toISOString();
  const rows: CommitmentPayment[] = [];

  for (const commitment of commitments) {
    if (commitment.is_active !== 1) continue;
    const existing = existingByCommitment.get(commitment.id) ?? new Set<string>();
    const dates = computeDueDates({
      startDate: commitment.start_date,
      every: commitment.recurrence_every,
      period: commitment.recurrence_period,
      durationType: commitment.duration_type,
      endAfterCount: commitment.end_after_count ?? undefined,
      endDate: commitment.end_date ?? undefined,
      maxCount: 64,
    });

    let remaining =
      commitment.duration_type === DurationType.AfterCount && commitment.end_after_count !== null
        ? Math.max(0, commitment.end_after_count - existing.size)
        : Number.POSITIVE_INFINITY;

    for (const dueDate of dates) {
      if (remaining <= 0) break;
      if (existing.has(dueDate)) continue;
      remaining -= 1;
      rows.push({
        id: createId(),
        commitment_id: commitment.id,
        due_date: dueDate,
        paid_date: null,
        skipped_date: null,
        amount_due: commitment.amount,
        amount_paid: null,
        currency: commitment.currency,
        exchange_rate_snapshot: null,
        account_id: commitment.account_id,
        transaction_id: null,
        notes: null,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  }

  return rows;
}
