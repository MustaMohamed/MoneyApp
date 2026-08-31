import { DurationType, RecurrencePeriod } from '@/constants/enums';

interface ComputeDueDatesInput {
  startDate: string;
  every: number;
  period: RecurrencePeriod;
  durationType: DurationType;
  endAfterCount?: number;
  endDate?: string;
  maxCount?: number;
}

export function computeDueDates(input: ComputeDueDatesInput): string[] {
  const { startDate, every, period, durationType, endAfterCount, endDate, maxCount = 64 } = input;
  const dates: string[] = [];

  const limit =
    durationType === DurationType.AfterCount && endAfterCount !== undefined
      ? Math.min(endAfterCount, maxCount)
      : maxCount;

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
