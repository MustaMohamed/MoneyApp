import { AccountType, type Currency } from '@/constants/enums';
import type { NewAccountInput } from '@/modules/accounts/repositories/account.repository';
import { roundMoney } from '@/utils/money';
import { parseDecimalText, parseNonNegativeDecimal } from '@/utils/parse_decimal';

import { DEFAULT_ACCOUNT_COLOR } from '../../constants/account_palette';
import type { AddAccountFormData } from '../../utils/add_account.schema';

/** A required amount failed to parse; `useAccountForm` surfaces it and no row is written. */
export class AccountFormMappingError extends Error {
  constructor(readonly field: string) {
    super(`AccountFormMappingError: ${field} did not parse`);
    this.name = 'AccountFormMappingError';
  }
}

function requiredAmount(value: string, field: string): number {
  const parsed = parseNonNegativeDecimal(value);
  if (parsed === undefined) throw new AccountFormMappingError(field);
  return roundMoney(parsed);
}

function optionalAmount(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = parseNonNegativeDecimal(value);
  return parsed === undefined ? null : roundMoney(parsed);
}

/** APR is not money: no floor, quantized to 2dp half-even, and 0 is a valid explicit APR. */
function optionalPercent(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = parseDecimalText(value);
  return parsed === undefined ? null : roundMoney(parsed);
}

function optionalDay(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = parseDecimalText(value);
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
    // Type decides this, never `opening_balance`; null means the balance is never tracked.
    revolving_balance: isCC ? 0 : null,
    // `interest_tracking` persists 0 on non-credit types, not what a retained credit draft left.
    interest_tracking: isCC && data.interest_tracking ? 1 : 0,
    sort_order: options.sortOrder,
    credit_limit: isCC ? optionalAmount(data.credit_limit) : null,
    minimum_payment: isCC ? optionalAmount(data.min_payment) : null,
    statement_due_day: isCC ? optionalDay(data.due_day) : null,
    apr: isCC && data.interest_tracking ? optionalPercent(data.apr) : null,
  };
}
