import { DurationType } from '@/constants/enums';

/** The due dates the save writes as new rows: `dates` in order, minus `existing`, capped by After N. */
export function selectNewDueDates(
  dates: readonly string[],
  existing: ReadonlySet<string>,
  schedule: { durationType: DurationType; endAfterCount: number | null },
): string[] {
  let remaining =
    schedule.durationType === DurationType.AfterCount && schedule.endAfterCount !== null
      ? Math.max(0, schedule.endAfterCount - existing.size)
      : Number.POSITIVE_INFINITY;

  const selected: string[] = [];
  for (const dueDate of dates) {
    if (remaining <= 0) break;
    if (existing.has(dueDate)) continue;
    remaining -= 1;
    selected.push(dueDate);
  }
  return selected;
}
