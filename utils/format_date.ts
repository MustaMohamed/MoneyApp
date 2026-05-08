const MONTHS_SHORT = [
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

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

export function formatLongDate(dateStr: string): string {
  const [y, month, day] = dateStr.split('-').map(Number);
  return `${MONTHS_LONG[month - 1]} ${day}, ${y}`;
}

export function formatMonthYear(dateStr: string): string {
  const [y, month] = dateStr.split('-').map(Number);
  return `${MONTHS_LONG[month - 1]} ${y}`;
}
