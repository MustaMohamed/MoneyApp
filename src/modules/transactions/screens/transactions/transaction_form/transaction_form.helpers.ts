import { AccountType, CategoryType, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
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
  if (!error || typeof error !== 'object' || !('issues' in error) || !Array.isArray(error.issues)) {
    return Strings.transactionSaveError;
  }
  const issueCodes = error.issues.map((issue) =>
    issue && typeof issue === 'object' && 'code' in issue ? issue.code : undefined,
  );
  if (issueCodes.includes('card_credit_exceeds_liability')) {
    return Strings.addTxErrCardCreditExceedsLiability;
  }
  if (issueCodes.includes('cc_payment_exceeds_liability')) {
    return Strings.addTxErrCcPaymentExceedsLiability;
  }
  return Strings.transactionSaveError;
}
