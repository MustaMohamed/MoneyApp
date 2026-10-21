import type { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatStoredRateLine } from '@/modules/transactions/utils/stored_rate_line';
import { formatDisplayAmount, formatRateDisplayMagnitude } from '@/utils/format_amount';
import { formatStoredMoneyText } from '@/utils/money_text';
import { parseRateText } from '@/utils/parse_decimal';

export interface AccountStripTile {
  color: string | null;
  type: AccountType;
  hollow: boolean;
}

export interface AccountStripChip {
  id: string;
  name: string;
  tile: AccountStripTile;
  selected: boolean;
  locked: boolean;
  dimmed: boolean;
}

export interface ConvertedAmount {
  amount: number;
  currency: Currency;
}

/** The editor's line: the stored rate's line only while the draft parses to the stored rate, the equality Done commits by. */
export function resolveRateEditorSource(input: {
  draftText: string;
  storedRate: number;
  rateUpdatedAt: string | null;
}): { usesStoredRate: boolean; line: string } {
  const usesStoredRate =
    resolveRateCommit({ text: input.draftText, storedRate: input.storedRate })?.override === false;
  return {
    usesStoredRate,
    line: usesStoredRate
      ? formatStoredRateLine(input.rateUpdatedAt)
      : Strings.addTxRateSourceCustomPerUsd,
  };
}

/** The rate as every rate prints; the rounding is display only, and text the formatter refuses prints as typed. */
export function formatRateRowValue(rateText: string): string {
  const rate = parseRateText(rateText);
  return rate === undefined ? rateText : formatRateDisplayMagnitude(rate).text;
}

/** The editor's Done: a rate that parses commits as typed, unless it is the stored rate, which commits as stored. */
export function resolveRateCommit(input: {
  text: string;
  storedRate: number;
}): { exchangeRate: string; override: boolean } | undefined {
  const { text, storedRate } = input;
  const parsed = parseRateText(text);
  if (parsed === undefined) return undefined;
  const override = parsed !== storedRate;
  return { exchangeRate: override ? text : formatStoredMoneyText(storedRate), override };
}

export function formatConvertedAmount(converted: ConvertedAmount | undefined): string {
  return converted === undefined
    ? Strings.addTxConvertedAmountNone
    : Strings.addTxConvertedAmount(formatDisplayAmount(converted.amount, converted.currency));
}
