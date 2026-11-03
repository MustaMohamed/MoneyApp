import { DurationType, RecurrencePeriod } from '@/constants/enums';

/** `throughDate` is an inclusive `YYYY-MM-DD`; without a default cap, one bound is required. */
type ComputeDueDatesInput = {
  startDate: string;
  every: number;
  period: RecurrencePeriod;
  durationType: DurationType;
  endAfterCount?: number;
  endDate?: string;
} & ({ maxCount: number; throughDate?: string } | { maxCount?: number; throughDate: string });

export function computeDueDates(input: ComputeDueDatesInput): string[] {
  const { startDate, every, period, durationType, endAfterCount, endDate, maxCount, throughDate } =
    input;
  const dates: string[] = [];

  const countBound = maxCount ?? Number.POSITIVE_INFINITY;
  const limit =
    durationType === DurationType.AfterCount && endAfterCount !== undefined
      ? Math.min(endAfterCount, countBound)
      : countBound;

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);

  for (let i = 0; i < limit; i++) {
    let date: string;

    if (period === RecurrencePeriod.Days) {
      const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + every * i));
      date = formatDate(d);
    } else if (period === RecurrencePeriod.Weeks) {
      const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + 7 * every * i));
      date = formatDate(d);
    } else if (period === RecurrencePeriod.Months) {
      const totalMonths = startMonth - 1 + every * i;
      const y = startYear + Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      const maxDay = daysInMonth(y, m);
      const d = Math.min(startDay, maxDay);
      date = `${y}-${pad(m)}-${pad(d)}`;
    } else {
      const y = startYear + every * i;
      const maxDay = daysInMonth(y, startMonth);
      const d = Math.min(startDay, maxDay);
      date = `${y}-${pad(startMonth)}-${pad(d)}`;
    }

    if (durationType === DurationType.UntilDate && endDate && date > endDate) break;
    if (throughDate !== undefined && date > throughDate) break;
    // A step below one day repeats or reverses the date, and no default cap bounds the loop.
    if (dates.length > 0 && date <= dates[dates.length - 1]) break;

    dates.push(date);
  }

  return dates;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
