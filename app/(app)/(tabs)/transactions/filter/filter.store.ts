import { Currency, DatePreset } from '@/constants/enums';

export interface AdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  datePreset: DatePreset;
  customDateFrom?: string;
  customDateTo?: string;
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_FILTERS: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  datePreset: DatePreset.AllTime,
  amountCurrency: Currency.EGP,
};
