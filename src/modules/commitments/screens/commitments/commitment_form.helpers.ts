import type { UseFormReturn } from 'react-hook-form';

import type { AccountStripChip } from '@/components/ui/form_sheet.helpers';
import { AccountType, DurationType, type RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  resolveHollowGraphiteTile,
  toAccountStripChip,
} from '@/modules/transactions/components/transaction_row.helpers';
import { formatStoredMoneyText } from '@/utils/money_text';
import { parseTypingDecimalText } from '@/utils/parse_decimal';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

import { buildCommitmentEndsLabel } from '../../utils/commitment_ends_label';
import { buildRecurrenceLabel } from '../../utils/recurrence_label';
import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  type CommitmentFormValues,
} from './commitment_form.shared';

export const NO_ACCOUNT_CHIP_ID = 'no-account';

/** No account first; an archived or deleted account the form holds follows it, lit, until another chip is picked. */
export function resolveCommitmentStripChips(input: {
  activeAccounts: readonly Account[];
  accountId: string | undefined;
  accountsById: ReadonlyMap<string, Account>;
}): AccountStripChip[] {
  const { activeAccounts, accountId, accountsById } = input;
  const noAccount: AccountStripChip = {
    id: NO_ACCOUNT_CHIP_ID,
    name: Strings.commitmentsStripNoAccount,
    tile: resolveHollowGraphiteTile(AccountType.Bank),
    selected: accountId === undefined,
    locked: false,
    dimmed: false,
  };
  const held =
    accountId !== undefined && !activeAccounts.some((account) => account.id === accountId)
      ? [
          toAccountStripChip(accountId, accountsById.get(accountId), {
            selected: true,
            locked: false,
            dimmed: false,
          }),
        ]
      : [];
  return [
    noAccount,
    ...held,
    ...activeAccounts.map((account) =>
      toAccountStripChip(account.id, account, {
        selected: account.id === accountId,
        locked: false,
        dimmed: false,
      }),
    ),
  ];
}

export function resolveAccountIdFromChip(chipId: string): string | undefined {
  return chipId === NO_ACCOUNT_CHIP_ID ? undefined : chipId;
}

/** Unrounded: `roundMoney` at the repository write is the one rounding. */
export function parseCommitmentAmountText(text: string): number | undefined {
  return parseTypingDecimalText(text);
}

/** The hero's text for a stored amount; `undefined` keeps the text, which already parses to it. */
export function resolveAmountHeroSyncText(
  text: string,
  value: number | undefined,
): string | undefined {
  if (parseCommitmentAmountText(text) === value) return undefined;
  if (value === undefined) return '';
  return formatStoredMoneyText(value);
}

/** Holds a still-typing text; otherwise commits the parsed amount, which validates once submitted. */
export function applyCommitmentAmountText(
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'clearErrors'>,
  text: string,
  commit: (amount: number | undefined) => void,
): void {
  const amount = parseCommitmentAmountText(text);
  if (!holdStillTypingDecimal(form, 'amount', amount, COMMITMENT_AMOUNT_REFUSES_ZERO, text)) {
    commit(amount);
  }
}

/** A whole-number input's typed text as its field value: `null` once emptied, since `Controller` reads an `undefined` field back as its default; `undefined` for text that is not a number. */
export function parseWholeNumberInput(text: string): number | null | undefined {
  if (text === '') return null;
  const n = parseInt(text, 10);
  return isNaN(n) ? undefined : n;
}

/** The Repeats row: `Custom` while the Every input is empty, which the field holds as `null`. */
export function resolveRepeatsRowValue(
  every: number | undefined,
  period: RecurrencePeriod,
): string {
  if (typeof every !== 'number') return Strings.commitmentsRecurrenceCustom;
  return buildRecurrenceLabel({ recurrence_every: every, recurrence_period: period });
}

/** The Ends row reads `Never` from its own key, and otherwise as the detail's Ends fact, so a missing count or date reads the incomplete label. */
export function resolveEndsRowValue(
  durationType: DurationType,
  endAfterCount: number | null | undefined,
  endDate: string | undefined,
): string {
  if (durationType === DurationType.Forever) return Strings.commitmentsEndsRowNever;
  return buildCommitmentEndsLabel({
    duration_type: durationType,
    end_after_count: endAfterCount ?? null,
    end_date: endDate === '' ? null : (endDate ?? null),
  });
}
