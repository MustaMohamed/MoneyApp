import { Strings } from '@/constants/strings';
import type { TransactionListFilters } from '@/store/transaction.store';

import type { AdvancedFilters } from './filter.store';

export function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.accountIds.length > 0) n++;
  if (f.categoryIds.length > 0) n++;
  if (f.amountMin !== undefined || f.amountMax !== undefined) n++;
  return n;
}

export function toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters> {
  const out: Partial<TransactionListFilters> = {};
  if (applied.accountIds.length > 0) out.accountIds = applied.accountIds;
  if (applied.categoryIds.length > 0) out.categoryIds = applied.categoryIds;
  if (applied.amountMin !== undefined) out.amountMin = applied.amountMin;
  if (applied.amountMax !== undefined) out.amountMax = applied.amountMax;
  if (applied.amountMin !== undefined || applied.amountMax !== undefined) {
    out.amountCurrency = applied.amountCurrency;
  }
  return out;
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

export function formatAmountSummary(f: AdvancedFilters): string {
  if (f.amountMin === undefined && f.amountMax === undefined)
    return Strings.filterSummaryAmountEmpty;
  const cur = f.amountCurrency;
  if (f.amountMin !== undefined && f.amountMax !== undefined)
    return `${f.amountMin}–${f.amountMax} ${cur}`;
  if (f.amountMax !== undefined) return `${Strings.filterSummaryAmountUpTo} ${f.amountMax} ${cur}`;
  return `${Strings.filterSummaryAmountFrom} ${f.amountMin} ${cur}`;
}
