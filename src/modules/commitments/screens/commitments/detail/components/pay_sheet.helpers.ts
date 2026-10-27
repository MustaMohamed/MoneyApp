import type { AccountStripChip } from '@/components/ui/form_sheet.helpers';
import { AmountType, type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { toAccountStripChip } from '@/modules/transactions/components/transaction_row.helpers';
import { formatDisplayAmount } from '@/utils/format_amount';
import { formatShortWeekdayDate } from '@/utils/format_date';
import { parsePositiveDecimal } from '@/utils/parse_decimal';

/** What the write moves on the paying account, from `deriveResolution`'s figures. */
export interface PayWritePreview {
  amount: number;
  currency: Currency;
  accountName: string;
}

export interface PaySheetFieldErrors {
  amount?: string;
  account?: string;
  rate?: string;
}

interface PayTrackFootnoteInput {
  amountType: AmountType;
  amountText: string;
  estimate: number | undefined;
  commitmentCurrency: Currency;
  preview: PayWritePreview | undefined;
  paidDate: string;
  today: string;
}

/** One chip per account in list order; an `accountId` the list does not hold lights none. */
export function resolvePayStripChips(
  accounts: readonly Account[],
  accountId: string,
): AccountStripChip[] {
  return accounts.map((account) =>
    toAccountStripChip(account.id, account, {
      selected: account.id === accountId,
      locked: false,
      dimmed: false,
    }),
  );
}

/** The commitment's account while the loaded list holds it, else none: no last-paid or first-account fallback. */
export function resolvePayPrefillAccountId(
  commitmentAccountId: string | null,
  accounts: readonly Account[],
): string {
  if (commitmentAccountId === null) return '';
  return accounts.some((account) => account.id === commitmentAccountId) ? commitmentAccountId : '';
}

/** The variable hints while the amount is empty, else the write preview; `undefined` is the idle track's empty line. */
export function resolvePayTrackFootnote(input: PayTrackFootnoteInput): string | undefined {
  const { amountType, amountText, estimate, commitmentCurrency, preview, paidDate, today } = input;
  if (amountType === AmountType.Variable && amountText.trim() === '') {
    return estimate === undefined
      ? Strings.commitmentsPayNoEstimateHint
      : Strings.commitmentsPayEstimateHint(formatDisplayAmount(estimate, commitmentCurrency));
  }
  if (preview === undefined) return undefined;
  const amount = formatDisplayAmount(preview.amount, preview.currency);
  return paidDate === today
    ? Strings.commitmentsPayPreviewToday(amount, preview.accountName)
    : Strings.commitmentsPayPreviewOnDay(
        amount,
        preview.accountName,
        formatShortWeekdayDate(paidDate, today),
      );
}

export function resolvePayButtonLabel(amountText: string, currency: Currency): string {
  const amount = parsePositiveDecimal(amountText);
  return amount === undefined
    ? Strings.commitmentsPayCtaBare
    : Strings.commitmentsPayCta(formatDisplayAmount(amount, currency));
}

/** The rate's line counts: it is a field marked above, in the rate card. */
export function resolvePaySheetStatusMessage(errors: PaySheetFieldErrors): string | undefined {
  const count = [errors.amount, errors.account, errors.rate].filter(
    (message) => message !== undefined,
  ).length;
  return count === 0 ? undefined : Strings.fixFieldsMarkedAbove(count);
}
