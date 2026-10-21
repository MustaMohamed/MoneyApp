import { useCallback } from 'react';

import type { ConvertedAmount } from '@/components/ui/form_sheet.helpers';
import type { Currency, TransactionType } from '@/constants/enums';

import { resolveConvertedAmount } from '../transaction_form.helpers';
import type { TransactionFormMode } from '../transaction_form.types';
import { useTransactionAmount } from './transaction_amount.hook';

export interface RatePreviewInput {
  mode: TransactionFormMode;
  type: TransactionType;
  sourceCurrency: Currency | undefined;
  destinationCurrency: Currency | undefined;
}

/** Converts a rate's text, unparsed, to the amount under the amount, by the same resolver the save runs. */
export function useTransactionRatePreview(
  input: RatePreviewInput,
): (exchangeRate: string) => ConvertedAmount | undefined {
  const { mode, type, sourceCurrency, destinationCurrency } = input;
  const amountText = useTransactionAmount(mode);

  return useCallback(
    (exchangeRate: string) =>
      resolveConvertedAmount({
        type,
        amountText,
        sourceCurrency,
        destinationCurrency,
        exchangeRateText: exchangeRate,
      }),
    [amountText, destinationCurrency, sourceCurrency, type],
  );
}
