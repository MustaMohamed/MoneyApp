import { AccountType, type Currency } from '@/constants/enums';
import type { NewAccountInput } from '@/modules/accounts/repositories/account.repository';
import { roundMoney } from '@/utils/money';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

import { DEFAULT_ACCOUNT_COLOR } from '../../constants/account_palette';
import type { AddAccountFormData } from '../../utils/add_account.schema';

/**
 * A required amount reached the mapping in a form the schema should have
 * rejected. Unreachable while the schema and this file share
 * parseNonNegativeDecimal — which is the point: the failure mode this task
 * fixes was the two agreeing while both were wrong, so the mapping reports
 * rather than assumes. Caught by useAccountForm and surfaced as
 * saveErrorMessage; no row is written.
 */
export class AccountFormMappingError extends Error {
  constructor(readonly field: string) {
    super(`AccountFormMappingError: ${field} did not parse`);
    this.name = 'AccountFormMappingError';
  }
}

/** A required amount: parse or throw. Rounded with the shared monetary rule. */
function requiredAmount(value: string, field: string): number {
  const parsed = parseNonNegativeDecimal(value);
  if (parsed === undefined) throw new AccountFormMappingError(field);
  return roundMoney(parsed);
}

/** An optional amount: blank or unparseable both fall back to null. */
function optionalAmount(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = parseNonNegativeDecimal(value);
  return parsed === undefined ? null : roundMoney(parsed);
}

/**
 * revolving_balance's own rule — preserves today's `parseFloat(...) || 0`
 * fallback: blank stays absent, but an unparseable non-blank value still
 * persists 0 rather than null. MA-009 deletes this field from the form, so
 * this divergence from optionalAmount is intentionally short-lived.
 */
function legacyRevolving(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = parseNonNegativeDecimal(value);
  return parsed === undefined ? 0 : roundMoney(parsed);
}

/** statement_due_day: blank, unparseable, or non-integer all fall back to null. */
function optionalDay(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = parseNonNegativeDecimal(value);
  if (parsed === undefined || !Number.isInteger(parsed)) return null;
  return parsed;
}

export function createAccountFormDefaults(initialCurrency: Currency): AddAccountFormData {
  return {
    name: '',
    balance: '',
    selected_type: AccountType.Bank,
    selected_color: DEFAULT_ACCOUNT_COLOR,
    currency: initialCurrency,
    interest_tracking: false,
    credit_limit: '',
    apr: '',
    revolving_balance: '',
    min_payment: '',
    due_day: '',
  };
}

export function toNewAccountInput(
  data: AddAccountFormData,
  options: { sortOrder: number },
): NewAccountInput {
  const isCC = data.selected_type === AccountType.CreditCard;

  return {
    name: data.name.trim(),
    type: data.selected_type,
    currency: data.currency,
    opening_balance: requiredAmount(data.balance, 'balance'),
    color: data.selected_color,
    interest_tracking: data.interest_tracking ? 1 : 0,
    sort_order: options.sortOrder,
    credit_limit: isCC ? optionalAmount(data.credit_limit) : null,
    revolving_balance: isCC ? legacyRevolving(data.revolving_balance) : null,
    minimum_payment: isCC ? optionalAmount(data.min_payment) : null,
    statement_due_day: isCC ? optionalDay(data.due_day) : null,
    apr: isCC && data.interest_tracking ? optionalAmount(data.apr) : null,
  };
}
