const pad2 = (n: number): string => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Indexed by `Date.prototype.getDay()`. */
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function toYearMonth(year: number, monthNumber: number): string {
  return `${year}-${pad2(monthNumber)}`;
}

export function yearFromYearMonth(yearMonth: string): number {
  return Number(yearMonth.split('-')[0]);
}

export function monthNumberFromYearMonth(yearMonth: string): number {
  return Number(yearMonth.split('-')[1]);
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const year = yearFromYearMonth(yearMonth);
  const month = monthNumberFromYearMonth(yearMonth);
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return toYearMonth(nextYear, nextMonth);
}

export function fullMonthName(yearMonth: string): string {
  return new Date(`${yearMonth}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long' });
}

export function daysLeftInMonth(yearMonth: string, today: string): number | undefined {
  if (today.slice(0, 7) !== yearMonth) return undefined;
  const lastDay = new Date(
    yearFromYearMonth(yearMonth),
    monthNumberFromYearMonth(yearMonth),
    0,
  ).getDate();
  return Math.max(lastDay - Number(today.slice(8, 10)), 0);
}

/** Whole days since the epoch of a `YYYY-MM-DD` date, read in UTC so no zone's clock change moves it. */
export function isoDayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** `to` minus `from`, both `YYYY-MM-DD`, in whole calendar days. */
export function calendarDaysBetween(from: string, to: string): number {
  return isoDayNumber(to) - isoDayNumber(from);
}
