import { Strings } from '@/constants/strings';
import type { Transaction } from '@/database/entities/transaction.entity';
import { MONTHS_SHORT, WEEKDAYS_SHORT } from '@/utils/year_month';

export interface TransactionDateGroup {
  /** The rows' `transaction_date`, `YYYY-MM-DD`. */
  key: string;
  label: string;
  data: Transaction[];
}

/** Input must already be sorted DESC by `transaction_date`; this helper does not re-sort. */
export function groupTransactionsByDate(
  txs: Transaction[],
  now: Date = new Date(),
): TransactionDateGroup[] {
  const sections: TransactionDateGroup[] = [];
  let currentKey: string | null = null;

  const today = ymd(now);
  const yesterday = ymd(addDays(now, -1));
  const thisYear = now.getFullYear();

  for (const t of txs) {
    const key = t.transaction_date;
    if (key !== currentKey) {
      sections.push({ key, label: labelFor(key, today, yesterday, thisYear), data: [] });
      currentKey = key;
    }
    sections[sections.length - 1].data.push(t);
  }
  return sections;
}

function labelFor(date: string, today: string, yesterday: string, thisYear: number): string {
  if (date === today) return Strings.todayLabel;
  if (date === yesterday) return Strings.yesterdayLabel;
  const [year, month, day] = date.split('-').map(Number);
  const weekday = WEEKDAYS_SHORT[new Date(year, month - 1, day).getDay()];
  const label = `${weekday} ${day} ${MONTHS_SHORT[month - 1]}`;
  return year === thisYear ? label : `${label} ${year}`;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
