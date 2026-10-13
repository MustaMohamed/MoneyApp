import { useMemo } from 'react';

import type { Currency, TransactionType } from '@/constants/enums';

import { type ConvertedAmount, resolveConvertedAmount } from '../transaction_form.helpers';
import type { TransactionFormMode } from '../transaction_form.types';
import { useTransactionAmount } from './transaction_amount.hook';

interface RatePreviewInput {
  mode: TransactionFormMode;
  type: TransactionType;
  sourceCurrency: Currency | undefined;
  destinationCurrency: Currency | undefined;
  /** The rate exactly as the field holds it, unparsed. */
  exchangeRate: string;
}

/** The converted amount under the amount, derived by the same resolver the save runs. */
export function useTransactionRatePreview(input: RatePreviewInput): ConvertedAmount | undefined {
  const { mode, type, sourceCurrency, destinationCurrency, exchangeRate } = input;
  const amountText = useTransactionAmount(mode);

  return useMemo(
    () =>
      resolveConvertedAmount({
        type,
        amountText,
        sourceCurrency,
        destinationCurrency,
        exchangeRateText: exchangeRate,
      }),
    [amountText, destinationCurrency, exchangeRate, sourceCurrency, type],
  );
}
