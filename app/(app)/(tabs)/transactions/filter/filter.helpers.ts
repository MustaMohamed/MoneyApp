import { DatePreset } from '@/constants/enums';
import type { AdvancedFilters } from './filter.store';
import type { TransactionListFilters } from '@/store/transaction.store';

export function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.accountIds.length > 0) n++;
  if (f.categoryIds.length > 0) n++;
  if (f.datePreset !== DatePreset.AllTime) n++;
  if (f.amountMin !== undefined || f.amountMax !== undefined) n++;
  return n;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function resolveDateRange(
  preset: DatePreset,
  customFrom: string | undefined,
  customTo: string | undefined,
  today: Date = new Date(),
): { from?: string; to?: string } {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  switch (preset) {
    case DatePreset.AllTime:
      return {};
    case DatePreset.Today:
      return { from: toIsoDate(t), to: toIsoDate(t) };
    case DatePreset.ThisWeek: {
      // Week starts Sunday (day === 0).
      const day = t.getDay();
      const start = new Date(t);
      start.setDate(t.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.ThisMonth: {
      const start = new Date(t.getFullYear(), t.getMonth(), 1);
      const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.LastMonth: {
      const start = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const end = new Date(t.getFullYear(), t.getMonth(), 0);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.Last30Days: {
      const start = new Date(t);
      start.setDate(t.getDate() - 29);
      return { from: toIsoDate(start), to: toIsoDate(t) };
    }
    case DatePreset.ThisYear: {
      const start = new Date(t.getFullYear(), 0, 1);
      const end = new Date(t.getFullYear(), 11, 31);
      return { from: toIsoDate(start), to: toIsoDate(end) };
    }
    case DatePreset.Custom:
      return { from: customFrom, to: customTo };
  }
}

export function parseAmountInput(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const cleaned = trimmed.replace(/,/g, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function formatSelectionSummary(names: string[], allLabel: string): string {
  if (names.length === 0) return allLabel;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters> {
  const out: Record<string, unknown> = {};

  if (applied.accountIds.length > 0) out.accountIds = applied.accountIds;
  if (applied.categoryIds.length > 0) out.categoryIds = applied.categoryIds;

  const range = resolveDateRange(applied.datePreset, applied.customDateFrom, applied.customDateTo);
  if (range.from !== undefined) out.dateFrom = range.from;
  if (range.to !== undefined) out.dateTo = range.to;

  if (applied.amountMin !== undefined) out.amountMin = applied.amountMin;
  if (applied.amountMax !== undefined) out.amountMax = applied.amountMax;
  if (applied.amountMin !== undefined || applied.amountMax !== undefined) {
    out.amountCurrency = applied.amountCurrency;
  }

  return out;
}
