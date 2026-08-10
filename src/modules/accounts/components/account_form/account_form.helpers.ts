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
    // @layla's ruling, spec.md § "revolving_balance at creation — ruled":
    // both branches are literals derived from type only, never from
    // opening_balance. 0 for Credit Card keeps validateResultingCardBalances'
    // corruption tripwire live on future edits/deletes; null for every other
    // type means "never tracked". No file under src/modules/transactions/
    // reads this at creation time.
    revolving_balance: isCC ? 0 : null,
    // spec.md:296 — credit-only fields persist null on every non-credit
    // type, and interest_tracking specifically persists 0, not whatever the
    // form happened to leave behind on a retained credit draft (MA-007 left
    // this gate for this task by name).
    interest_tracking: isCC && data.interest_tracking ? 1 : 0,
    sort_order: options.sortOrder,
    credit_limit: isCC ? optionalAmount(data.credit_limit) : null,
    minimum_payment: isCC ? optionalAmount(data.min_payment) : null,
    statement_due_day: isCC ? optionalDay(data.due_day) : null,
    apr: isCC && data.interest_tracking ? optionalAmount(data.apr) : null,
  };
}
