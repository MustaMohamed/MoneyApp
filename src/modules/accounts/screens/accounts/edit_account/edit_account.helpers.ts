import type { FieldErrors } from 'react-hook-form';

import { Strings } from '@/constants/strings';
import { formatAmount } from '@/utils/format_amount';
import { formatStoredMoneyText } from '@/utils/money_text';

import { DEFAULT_ACCOUNT_COLOR } from '../../../constants/account_palette';
import type { Account } from '../../../entities/account.entity';
import type { EditAccountFormData } from '../../../utils/edit_account.schema';

// The stored precision `roundMoney` writes, so the drafted text re-parses to the stored number.
const CREDIT_DRAFT_MONEY_DECIMALS = 2;

function draftMoneyText(value: number | null): string {
  return value === null ? '' : formatAmount(value, CREDIT_DRAFT_MONEY_DECIMALS);
}

/** Drafts text that re-parses to the stored number, so a save sends the credit columns unchanged. */
export function buildEditAccountDraft(account: Account): EditAccountFormData {
  return {
    name: account.name,
    color: account.color ?? DEFAULT_ACCOUNT_COLOR,
    interest_tracking: account.interest_tracking === 1,
    credit_limit: draftMoneyText(account.credit_limit),
    min_payment: draftMoneyText(account.minimum_payment),
    due_day: account.statement_due_day === null ? '' : String(account.statement_due_day),
    apr: formatStoredMoneyText(account.apr),
  };
}

export function countFieldErrors(errors: FieldErrors): number {
  return Object.keys(errors).length;
}

/** `undefined` is idle: the footer paints its footnote. */
export function resolveEditStatusMessage({
  errorCount,
  saveError,
}: {
  errorCount: number;
  saveError?: string;
}): string | undefined {
  if (errorCount > 0) return Strings.editAccountFixFields(errorCount);
  return saveError;
}
