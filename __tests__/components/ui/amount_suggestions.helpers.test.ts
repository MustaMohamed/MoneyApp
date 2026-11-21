import {
  type AmountSuggestion,
  resolveAmountSuggestionChips,
} from '@/components/ui/amount_suggestions.helpers';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

const AVERAGE_41200: AmountSuggestion = { kind: 'threeMonthAverage', amount: 41200 };

describe('resolveAmountSuggestionChips', () => {
  it('gives 41200 on EGP plain-digit text and the 3-month average label over its formatted amount', () => {
    const [chip] = resolveAmountSuggestionChips([AVERAGE_41200], '', Currency.EGP);
    expect(chip.kind).toBe('threeMonthAverage');
    expect(chip.text).toBe('41200');
    expect(chip.label).toBe(Strings.amountSuggestionThreeMonthAverage('41,200'));
  });

  it.each(['41200', '41200.00', '41200.'])('reads selected while the field holds %p', (value) => {
    expect(resolveAmountSuggestionChips([AVERAGE_41200], value, Currency.EGP)[0].selected).toBe(
      true,
    );
  });

  it.each(['41201', ''])('reads unselected while the field holds %p', (value) => {
    expect(resolveAmountSuggestionChips([AVERAGE_41200], value, Currency.EGP)[0].selected).toBe(
      false,
    );
  });

  it('draws no chip for an undefined or a 0 amount', () => {
    expect(
      resolveAmountSuggestionChips(
        [
          { kind: 'spentLastMonth', amount: undefined },
          { kind: 'threeMonthAverage', amount: 0 },
        ],
        '',
        Currency.EGP,
      ),
    ).toEqual([]);
  });

  it.each([
    ['undefined', undefined],
    ['an empty list', []],
  ])('gives no chips for %s', (_name, suggestions) => {
    expect(resolveAmountSuggestionChips(suggestions, '', Currency.EGP)).toEqual([]);
  });

  it('keeps the input order', () => {
    const chips = resolveAmountSuggestionChips(
      [AVERAGE_41200, { kind: 'spentLastMonth', amount: 640 }],
      '',
      Currency.EGP,
    );
    expect(chips.map((chip) => chip.kind)).toEqual(['threeMonthAverage', 'spentLastMonth']);
    expect(chips[1].label).toBe(Strings.amountSuggestionSpentLastMonth('640'));
  });
});
