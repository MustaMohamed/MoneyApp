import type { FieldErrors } from 'react-hook-form';

import { Strings } from '@/constants/strings';
import { formatAmount } from '@/utils/format_amount';

import { DEFAULT_ACCOUNT_COLOR } from '../../../constants/account_palette';
import type { Account } from '../../../entities/account.entity';
import type { EditAccountFormData } from '../../../utils/edit_account.schema';

/** `roundMoney`'s persisted 2dp, never `CURRENCY_CONFIG` display decimals (ADR 2026-09-16 account-edit-draft-precision). */
export const EDIT_ACCOUNT_DRAFT_DECIMALS = 2;

function draftAmount(value: number | null): string {
  return value === null ? '' : formatAmount(value, EDIT_ACCOUNT_DRAFT_DECIMALS);
}

/** Drafts text that re-parses to the stored number, so a save sends the credit columns unchanged. */
export function buildEditAccountDraft(account: Account): EditAccountFormData {
  return {
    name: account.name,
    color: account.color ?? DEFAULT_ACCOUNT_COLOR,
    interest_tracking: account.interest_tracking === 1,
    credit_limit: draftAmount(account.credit_limit),
    min_payment: draftAmount(account.minimum_payment),
    due_day: account.statement_due_day === null ? '' : String(account.statement_due_day),
    apr: draftAmount(account.apr),
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
