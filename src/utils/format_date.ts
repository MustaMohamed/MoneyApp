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

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Next due-date label for a credit-card statement day, formatted "MMM d"
 * (e.g. "May 28"). If `dueDay` already passed this month, returns the date
 * in the next month. Consumers: AccountCard, NetWorthBreakdownSheet.
 */
export function nextDueDate(dueDay: number, now: Date = new Date()): string {
  const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), dueDay);
  const target =
    thisMonthDue.getDate() < now.getDate() || thisMonthDue.getMonth() < now.getMonth()
      ? new Date(now.getFullYear(), now.getMonth() + 1, dueDay)
      : thisMonthDue;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
