import { AccountType, CategoryType, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TransactionAmountError } from '@/modules/transactions/domain/transaction_amounts';
import { toLocalDateString } from '@/utils/format_date';

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

export function resolveTransactionSaveError(error: unknown): string {
  // §3.4: unconditional, never `error.message`. The resolver's other four
  // throws are hardcoded domain literals (transaction_amounts.ts), not
  // `strings.ts` keys — echoing `.message` for any of them would turn an
  // internal literal into user copy the moment schema and resolver disagree,
  // the exact assumption `AccountFormMappingError`'s docblock refuses.
  if (error instanceof TransactionAmountError) {
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
