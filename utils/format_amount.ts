import { type Currency } from '@/constants/enums';

import { CURRENCY_CONFIG } from '@/constants/currency';

export function formatAmount(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrencyAmount(value: number, currency: Currency, decimals?: number): string {
  const config = CURRENCY_CONFIG[currency];
  return `${formatAmount(value, decimals ?? config.decimals)} ${config.code}`;
}

export function formatWithCurrencyCode(value: number, code: string, decimals = 0): string {
  return `${formatAmount(value, decimals)} ${code}`;
}

export function formatExchangeRate(rate: number): string {
  return `1 USD = ${formatAmount(rate, 2)} EGP`;
}
