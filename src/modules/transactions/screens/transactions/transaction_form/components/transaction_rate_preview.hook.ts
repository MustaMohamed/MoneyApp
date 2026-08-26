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

/**
 * The `≈ … EGP` figure under the rate row, derived by the same resolver the
 * save runs. `undefined` when the inputs on screen cannot produce one.
 *
 * It lives here rather than in `useAddTransaction` / `useEditTransaction` on
 * purpose. The typed amount is deliberately kept out of those hooks —
 * `amountStr` has its own store so that typing republishes only the two
 * components that read it, and `add_transaction.hook.test.ts:116` pins that.
 * Subscribing a form hook to the amount takes its render count from 2 to 3 and
 * reds that test. This hook uses the same `useTransactionAmount` subscription
 * `AmountHero` does, so a keystroke re-renders the rate row and nothing above.
 *
 * The completeness guard mirrors three of the resolver's throw conditions
 * rather than catching them: an amount that fails `parsePositiveDecimal`
 * (0.004 is positive and rounds to 0, which throws), a missing destination
 * for a type that requires one, and a missing rate when either side is USD.
 * The fourth — the resolver's output guard (ADR: parse-floor-money-only),
 * unbounded now that rate text carries no upper bound of its own — cannot be
 * mirrored the same way: it fires on the computed result, not the typed
 * inputs, so it is caught instead.
 */
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
      // The output guard (ADR: parse-floor-money-only) on a typed amount too
      // large to store. Never a render crash — the rate row falls back to
      // its existing placeholder.
      if (error instanceof TransactionAmountError) return undefined;
      throw error;
    }
  }, [amountStr, destinationCurrency, exchangeRate, sourceCurrency, type]);
}
