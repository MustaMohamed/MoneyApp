import { AccountType, CategoryType, type Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  requiresDestination,
  requiresExchangeRate,
  resolveTransactionAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';
import { toLocalDateString } from '@/utils/format_date';
import { MIN_MONEY_AMOUNT } from '@/utils/money';
import { parseRateText } from '@/utils/parse_decimal';

export interface TransactionFormSemantics {
  isCardCredit: boolean;
  categoryType: CategoryType | undefined;
  usesBudget: boolean;
  typeLabel: string;
  supportingText: string;
}

export function resolveTransactionFormSemantics(
  type: TransactionType,
  accountType: AccountType | undefined,
): TransactionFormSemantics {
  const isCardCredit = type === TransactionType.Income && accountType === AccountType.CreditCard;
  if (isCardCredit) {
    return {
      isCardCredit: true,
      categoryType: CategoryType.Expense,
      usesBudget: true,
      typeLabel: Strings.addTxTypeCardCredit,
      supportingText: Strings.addTxSupportCardCredit,
    };
  }

  if (type === TransactionType.Expense) {
    return {
      isCardCredit: false,
      categoryType: CategoryType.Expense,
      usesBudget: true,
      typeLabel: Strings.addTxTypeExpense,
      supportingText: Strings.addTxSupportExpense,
    };
  }

  if (type === TransactionType.Income) {
    return {
      isCardCredit: false,
      categoryType: CategoryType.Income,
      usesBudget: false,
      typeLabel: Strings.addTxTypeIncome,
      supportingText: Strings.addTxSupportIncome,
    };
  }

  if (type === TransactionType.Transfer) {
    return {
      isCardCredit: false,
      categoryType: undefined,
      usesBudget: false,
      typeLabel: Strings.addTxTypeTransfer,
      supportingText: Strings.addTxSupportTransfer,
    };
  }

  return {
    isCardCredit: false,
    categoryType: undefined,
    usesBudget: false,
    typeLabel: Strings.addTxTypeCCPayment,
    supportingText: Strings.addTxSupportCcPayment,
  };
}

export function toTransactionTimestamp(now: Date): { date: string; time: string } {
  return {
    date: toLocalDateString(now),
    time: now.toTimeString().slice(0, 8),
  };
}

/**
 * Field error for a destination leg that rounds below the money floor, derived by the
 * resolver the save runs (the pay sheet's #278/#310 shape). `undefined` means either
 * "fine" or "cannot resolve yet" — missing inputs raise their own field errors, and the
 * eventual resolver-level refusal (#363) stays consistent: refuse, never floor or round up.
 */
export function resolveDestinationFloorError(input: {
  type: TransactionType;
  amount: number;
  sourceCurrency: Currency | undefined;
  destinationCurrency: Currency | undefined;
  exchangeRateText: string;
}): string | undefined {
  const { type, amount, sourceCurrency, destinationCurrency, exchangeRateText } = input;
  if (!requiresDestination(type)) return undefined;
  if (sourceCurrency === undefined || destinationCurrency === undefined) return undefined;
  // Not a bare `> 0`: below the entered-amount floor the amount field carries its own error.
  if (!Number.isFinite(amount) || amount < MIN_MONEY_AMOUNT) return undefined;
  const exchangeRate = parseRateText(exchangeRateText);
  if (requiresExchangeRate(sourceCurrency, destinationCurrency) && exchangeRate === undefined) {
    return undefined;
  }
  try {
    const resolved = resolveTransactionAmounts({
      type,
      amount,
      sourceCurrency,
      destinationCurrency,
      exchangeRate,
    });
    return resolved.toAmount !== null && resolved.toAmount < MIN_MONEY_AMOUNT
      ? Strings.addTxErrConvertedBelowMin(destinationCurrency)
      : undefined;
  } catch (error) {
    if (error instanceof TransactionAmountError) return undefined;
    throw error;
  }
}

export function resolveTransactionSaveError(error: unknown): string {
  // Only `reason === 'unstorable'` has user copy; other causes carry internal literals.
  if (error instanceof TransactionAmountError && error.reason === 'unstorable') {
    return Strings.addTxErrAmountUnstorable;
  }

  const issues = error && typeof error === 'object' && 'issues' in error ? error.issues : undefined;
  if (!Array.isArray(issues)) {
    return Strings.transactionSaveError;
  }
  const issueCodes = issues.map((issue: unknown) =>
    issue && typeof issue === 'object' && 'code' in issue && typeof issue.code === 'string'
      ? issue.code
      : undefined,
  );
  if (issueCodes.includes('card_credit_exceeds_liability')) {
    return Strings.addTxErrCardCreditExceedsLiability;
  }
  if (issueCodes.includes('cc_payment_exceeds_liability')) {
    return Strings.addTxErrCcPaymentExceedsLiability;
  }
  return Strings.transactionSaveError;
}
