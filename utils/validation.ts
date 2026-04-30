import { Strings } from '@/constants/strings';
import type { Account, AccountType } from '@/store/account_store';

export type ValidationValues = {
  name: string;
  balance: string;
  type: AccountType;
  creditLimit: string;
  interestTracking: boolean;
  apr: string;
};

export type FieldErrors = Partial<Record<'name' | 'balance' | 'creditLimit' | 'apr', string>>;

export function validateAccountForm(
  values: ValidationValues,
  existingAccounts: Account[],
): FieldErrors {
  const errors: FieldErrors = {};

  const trimmedName = values.name.trim();
  if (trimmedName === '') {
    errors.name = Strings.errNameRequired;
  } else if (values.name.length > 30) {
    errors.name = Strings.errNameTooLong;
  } else {
    const lower = trimmedName.toLowerCase();
    const dup = existingAccounts.some((a) => a.name.trim().toLowerCase() === lower);
    if (dup) {
      errors.name = Strings.errNameDuplicate;
    }
  }

  const balanceTrimmed = values.balance.trim();
  if (balanceTrimmed === '') {
    errors.balance = Strings.errBalanceInvalid;
  } else {
    const parsed = Number(balanceTrimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.balance = Strings.errBalanceInvalid;
    }
  }

  if (values.type === 'credit_card') {
    const limitTrimmed = values.creditLimit.trim();
    if (limitTrimmed === '') {
      errors.creditLimit = Strings.errCreditLimitRequired;
    } else {
      const parsed = Number(limitTrimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        errors.creditLimit = Strings.errCreditLimitRequired;
      }
    }

    if (values.interestTracking && values.apr.trim() === '') {
      errors.apr = Strings.errAprRequired;
    }
  }

  return errors;
}
