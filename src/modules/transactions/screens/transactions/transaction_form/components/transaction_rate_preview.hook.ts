import { useMemo } from 'react';

import { type Currency, TransactionType } from '@/constants/enums';
import {
  requiresExchangeRate,
  resolveTransactionAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';
import { parsePositiveDecimal, parseRateText } from '@/utils/parse_decimal';

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

/** The `≈ … EGP` figure under the rate row, derived by the same resolver the save runs. */
export function useTransactionRatePreview(input: RatePreviewInput): number | undefined {
  const { mode, type, sourceCurrency, destinationCurrency, exchangeRate } = input;
  const amountStr = useTransactionAmount(mode);

  return useMemo(() => {
    if (sourceCurrency === undefined) return undefined;

    const hasDestination = type === TransactionType.Transfer || type === TransactionType.CCPayment;
    if (hasDestination && destinationCurrency === undefined) return undefined;

    const amount = parsePositiveDecimal(amountStr);
    if (amount === undefined) return undefined;

    const rate = parseRateText(exchangeRate);
    const needsRate = requiresExchangeRate(
      sourceCurrency,
      hasDestination ? destinationCurrency : undefined,
    );
    if (needsRate && rate === undefined) return undefined;

    try {
      return resolveTransactionAmounts({
        type,
        amount,
        sourceCurrency,
        destinationCurrency,
        exchangeRate: rate,
      }).egpAmount;
    } catch (error) {
      // An amount too large to store throws; fall back to the placeholder, never a render crash.
      if (error instanceof TransactionAmountError) return undefined;
      throw error;
    }
  }, [amountStr, destinationCurrency, exchangeRate, sourceCurrency, type]);
}
