import { Currency } from '@/constants/enums';

export interface CurrencyMeta {
  code: Currency;
  label: string;
  decimals: number;
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyMeta> = {
  [Currency.EGP]: { code: Currency.EGP, label: 'Egyptian Pound', decimals: 0 },
  [Currency.USD]: { code: Currency.USD, label: 'US Dollar', decimals: 2 },
};

export const CURRENCY_SEGMENTS: Array<{ value: Currency; label: string }> = [
  { value: Currency.EGP, label: Currency.EGP },
  { value: Currency.USD, label: Currency.USD },
];

/**
 * The app has exactly two currencies, so "the other one" is unambiguous: an
 * EGP base's foreign currency is USD and vice versa. Named once, beside the
 * table it complements, so onboarding's two independent selectors —
 * `selectReadySummaryState` and `selectApproximationPill` — stop encoding the
 * same flip on their own.
 */
export function foreignCurrencyFor(base: Currency): Currency {
  return base === Currency.EGP ? Currency.USD : Currency.EGP;
}
