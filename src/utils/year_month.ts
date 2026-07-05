const pad2 = (n: number): string => String(n).padStart(2, '0');

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
