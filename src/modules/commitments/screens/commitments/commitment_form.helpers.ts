import type { UseFormReturn } from 'react-hook-form';

import type { AccountStripChip } from '@/components/ui/form_sheet.helpers';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  resolveHollowGraphiteTile,
  resolveRowTile,
} from '@/modules/transactions/components/transaction_row.helpers';
import { resolveAccountName } from '@/utils/account_name';
import { formatStoredMoneyText } from '@/utils/money_text';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  type CommitmentFormValues,
} from './commitment_form.shared';

export const NO_ACCOUNT_CHIP_ID = 'no-account';

function toChip(id: string, account: Account | undefined, selected: boolean): AccountStripChip {
  return {
    id,
    name: resolveAccountName(account),
    tile: resolveRowTile(account),
    selected,
    locked: false,
    dimmed: false,
  };
}

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
      ? [toChip(accountId, accountsById.get(accountId), true)]
      : [];
  return [
    noAccount,
    ...held,
    ...activeAccounts.map((account) => toChip(account.id, account, account.id === accountId)),
  ];
}

export function resolveAccountIdFromChip(chipId: string): string | undefined {
  return chipId === NO_ACCOUNT_CHIP_ID ? undefined : chipId;
}

/** Unrounded: `roundMoney` at the repository write is the one rounding. */
export function parseCommitmentAmountText(text: string): number | undefined {
  if (text === '' || text === '.') return undefined;
  const amount = Number.parseFloat(text);
  return Number.isNaN(amount) ? undefined : amount;
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
