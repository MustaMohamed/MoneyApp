import type { ConvertedAmount } from '@/components/ui/form_sheet.helpers';
import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  type CommitmentPaymentAmounts,
  requiresExchangeRate,
  resolveCommitmentPaymentAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';
import { formatDisplayAmount } from '@/utils/format_amount';
import { formatShortWeekdayDate } from '@/utils/format_date';
import { MIN_MONEY_AMOUNT } from '@/utils/money';
import { parsePositiveDecimal, parseRateText } from '@/utils/parse_decimal';

/** What the write moves on the paying account, from `deriveResolution`'s figures. */
export interface PayWritePreview {
  amount: number;
  currency: Currency;
  accountName: string;
}

/**
 * `resolved` is `undefined` for inputs that cannot resolve yet (the resolver would throw on
 * them for a reason other than the destination leg). `zeroDestination` is `true` specifically
 * for the resolver's #363 refusal — the caller already knows the destination currency from its
 * own `accountCurrency` argument, so it never needs a fabricated `CommitmentPaymentAmounts` to render
 * "converts below the floor": both call sites only read `accountNativeAmount`/`accountCurrency`
 * off `resolved` once that flag is set, and this flag is what stands in for them instead.
 */
export function deriveResolution(
  commitmentCurrency: Currency | undefined,
  accountCurrency: Currency | undefined,
  amountText: string,
  rateText: string | undefined,
): { resolved: CommitmentPaymentAmounts | undefined; zeroDestination: boolean } {
  if (commitmentCurrency === undefined || accountCurrency === undefined) {
    return { resolved: undefined, zeroDestination: false };
  }
  // Not a bare `> 0`: `roundMoney(0.004)` is 0, which the resolver throws on.
  const amount = parsePositiveDecimal(amountText);
  const exchangeRate = parseRateText(rateText ?? '');
  if (amount === undefined) return { resolved: undefined, zeroDestination: false };
  if (requiresExchangeRate(commitmentCurrency, accountCurrency) && exchangeRate === undefined) {
    return { resolved: undefined, zeroDestination: false };
  }
  try {
    const resolved = resolveCommitmentPaymentAmounts({
      amount,
      commitmentCurrency,
      accountCurrency,
      exchangeRate,
    });
    return { resolved, zeroDestination: false };
  } catch (error) {
    if (error instanceof TransactionAmountError) {
      return { resolved: undefined, zeroDestination: error.reason === 'zero-destination' };
    }
    throw error;
  }
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

/** The rate's line counts: it is a field marked above, in the fact card; a failed write reads only with no fault marked. */
export function resolvePaySheetStatusMessage(
  errors: PaySheetFieldErrors,
  saveError?: string,
): string | undefined {
  const count = Object.values(errors).filter((message) => message !== undefined).length;
  return count === 0 ? saveError : Strings.fixFieldsMarkedAbove(count);
}

/** The line under the hero, the write's own leg: the EGP amount for a USD commitment, the USD amount for an EGP commitment from a USD account. */
export function resolvePayConvertedAmount(input: {
  commitmentCurrency: Currency;
  accountCurrency: Currency | undefined;
  amountText: string;
  rateText: string | undefined;
}): ConvertedAmount | undefined {
  const { commitmentCurrency, accountCurrency, amountText, rateText } = input;
  const usdCommitment = commitmentCurrency === Currency.USD;
  if (!usdCommitment && accountCurrency !== Currency.USD) return undefined;
  // With no account lit, a USD commitment's EGP leg reads the same from either account currency.
  const { resolved } = deriveResolution(
    commitmentCurrency,
    accountCurrency ?? Currency.USD,
    amountText,
    rateText,
  );
  if (resolved === undefined) return undefined;
  const converted = usdCommitment
    ? { amount: resolved.egpAmount, currency: Currency.EGP }
    : { amount: resolved.accountNativeAmount, currency: Currency.USD };
  if (resolved.accountNativeAmount < MIN_MONEY_AMOUNT || converted.amount < MIN_MONEY_AMOUNT) {
    return undefined;
  }
  return converted;
}
