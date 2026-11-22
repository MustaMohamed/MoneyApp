import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { formatCurrencyParts } from '@/utils/format_amount';
import { formatStoredMoneyText } from '@/utils/money_text';

export type AmountSuggestionKind = 'spentLastMonth' | 'threeMonthAverage';

export interface AmountSuggestion {
  kind: AmountSuggestionKind;
  amount: number | undefined;
}

export interface AmountSuggestionChip {
  kind: AmountSuggestionKind;
  label: string;
  text: string;
  selected: boolean;
}

const LABEL_OF: Record<AmountSuggestionKind, (amount: string) => string> = {
  spentLastMonth: Strings.amountSuggestionSpentLastMonth,
  threeMonthAverage: Strings.amountSuggestionThreeMonthAverage,
};

export function resolveAmountSuggestionChips(
  suggestions: readonly AmountSuggestion[] | undefined,
  value: string,
  currency: Currency,
): AmountSuggestionChip[] {
  const chips: AmountSuggestionChip[] = [];
  for (const { kind, amount } of suggestions ?? []) {
    if (amount === undefined || !(amount > 0)) continue;
    chips.push({
      kind,
      label: LABEL_OF[kind](formatCurrencyParts(amount, currency).value),
      text: formatStoredMoneyText(amount),
      // The field mask admits '41200.' and '41200.00', which still equal the chip's amount.
      selected: value !== '' && Number(value) === amount,
    });
  }
  return chips;
}
