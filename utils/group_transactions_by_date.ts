import { Strings } from '@/constants/strings';
import type { Transaction } from '@/database/entities/transaction.entity';

export interface TransactionSection {
  key: string;
  data: Transaction[];
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Group a date-sorted (DESC) Transaction[] into sections keyed by a
 * human-readable label. The input is expected to already be ordered DESC by
 * (transaction_date, transaction_time) — this helper does not re-sort.
 *
 * @param now optional reference date for testing determinism
 */
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
    const key = labelFor(t.transaction_date, today, yesterday, thisYear);
    if (key !== currentKey) {
      sections.push({ key, data: [] });
      currentKey = key;
    }
    sections[sections.length - 1].data.push(t);
  }
  return sections;
}

function labelFor(date: string, today: string, yesterday: string, thisYear: number): string {
  const [yStr, mStr, dStr] = date.split('-');
  const monthLabel = MONTHS[Number(mStr) - 1];
  const day = Number(dStr);
  const year = Number(yStr);

  if (date === today) return `${Strings.todayLabel} · ${monthLabel} ${day}`;
  if (date === yesterday) return `${Strings.yesterdayLabel} · ${monthLabel} ${day}`;
  if (year === thisYear) return `${monthLabel} ${day}`;
  return `${monthLabel} ${day}, ${year}`;
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
