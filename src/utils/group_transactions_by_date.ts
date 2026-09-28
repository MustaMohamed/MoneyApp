import { Strings } from '@/constants/strings';
import type { Transaction } from '@/database/entities/transaction.entity';
import { MONTHS_SHORT } from '@/utils/year_month';

export interface TransactionSection {
  /** The rows' `transaction_date`, `YYYY-MM-DD`. */
  key: string;
  label: string;
  data: Transaction[];
}

/** Input must already be sorted DESC by `transaction_date`; this helper does not re-sort. */
export function groupTransactionsByDate(
  txs: Transaction[],
  now: Date = new Date(),
): TransactionSection[] {
  const sections: TransactionSection[] = [];
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
  const [yStr, mStr, dStr] = date.split('-');
  const year = Number(yStr);
  const weekday = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
  const label = `${weekday} ${Number(dStr)} ${MONTHS_SHORT[Number(mStr) - 1]}`;
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
