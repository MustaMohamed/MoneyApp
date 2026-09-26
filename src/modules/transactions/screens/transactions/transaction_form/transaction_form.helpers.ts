import { AccountType, CategoryType, type Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  requiresDestination,
  requiresExchangeRate,
  resolveTransactionAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';
import { TransactionAccountArchivedError } from '@/modules/transactions/repositories/transaction.errors';
import { resolveAccountName } from '@/utils/account_name';
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
    // The resolver now refuses a zero destination leg (#363) instead of returning `toAmount: 0`,
    // so the check above never runs for that case — this keeps the same field-level copy live.
    if (error instanceof TransactionAmountError && error.reason === 'zero-destination') {
      return Strings.addTxErrConvertedBelowMin(destinationCurrency);
    }
    if (error instanceof TransactionAmountError) return undefined;
    throw error;
  }
}

function resolveArchivedAccountLine(error: unknown): string | undefined {
  return error instanceof TransactionAccountArchivedError
    ? Strings.transactionAccountArchived(resolveAccountName(error.account))
    : undefined;
}

export function resolveTransactionDeleteError(error: unknown): string {
  return resolveArchivedAccountLine(error) ?? Strings.errDeleteFailed;
}

export function resolveTransactionSaveError(error: unknown): string {
  // Before the issues branch: the archived refusal carries `issues: []` and would fall to the retry copy.
  const archivedLine = resolveArchivedAccountLine(error);
  if (archivedLine !== undefined) return archivedLine;
  // Only `'unstorable'` and `'zero-destination'` have user copy; other causes carry internal
  // literals. `resolveDestinationFloorError` already catches `'zero-destination'` pre-submit;
  // this is the fallback for whatever reaches save anyway (e.g. state changed after validation).
  if (error instanceof TransactionAmountError) {
    if (error.reason === 'unstorable') return Strings.addTxErrAmountUnstorable;
    if (error.reason === 'zero-destination') return Strings.addTxErrDestinationTooSmall;
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

export interface TransactionFormFieldErrors {
  amount?: string;
  account?: string;
  toAccount?: string;
  category?: string;
  budget?: string;
  rate?: string;
}

/** Zod skips a refinement after an aborting field issue; this runs it on any object so every fault reports on one Save. */
export const REFINE_DESPITE_FIELD_ERRORS = {
  when: (payload: { value: unknown }) =>
    typeof payload.value === 'object' && payload.value !== null,
};

export function countTransactionFormFieldErrors(
  errors: TransactionFormFieldErrors,
  budgetLookupError?: string,
): number {
  const { amount, account, toAccount, category, budget, rate } = errors;
  const fieldCount = [amount, account, toAccount, category, rate].filter(
    (message) => message !== undefined,
  ).length;
  // A failed budget lookup rides on `errors.budget` but is a data error, not a field fault.
  const budgetCount = budget !== undefined && budgetLookupError === undefined ? 1 : 0;
  return fieldCount + budgetCount;
}

export function resolveTransactionFormStatus(input: {
  errors: TransactionFormFieldErrors;
  budgetLookupError?: string;
  saveError?: string;
}): string | undefined {
  const count = countTransactionFormFieldErrors(input.errors, input.budgetLookupError);
  return count > 0 ? Strings.transactionFormFixFields(count) : input.saveError;
}
