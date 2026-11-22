import { View, useWindowDimensions } from 'react-native';

import {
  type AmountSuggestion,
  resolveAmountSuggestionChips,
} from '@/components/ui/amount_suggestions.helpers';
import { SelectablePill } from '@/components/ui/chip';
import { WRAPPING_PILL_LABEL_STYLE, WRAPPING_PILL_STYLE } from '@/components/ui/chip.geometry';
import {
  AMOUNT_SUGGESTION_GAP,
  AMOUNT_SUGGESTION_ROW_PADDING_BOTTOM,
  AMOUNT_SUGGESTION_ROW_PADDING_TOP,
  resolveAmountSuggestionChipGeometry,
} from '@/components/ui/form_sheet.geometry';
import type { Currency } from '@/constants/enums';

interface AmountHeroSuggestionsProps {
  suggestions?: readonly AmountSuggestion[];
  /** The amount field's text as the owner's store holds it. */
  value: string;
  currency: Currency;
  /** Receives the chip's plain-digit text, which the owner writes to its field. */
  onSelect: (text: string) => void;
}

export function AmountHeroSuggestions({
  suggestions,
  value,
  currency,
  onSelect,
}: AmountHeroSuggestionsProps): React.ReactElement | null {
  const { fontScale } = useWindowDimensions();
  const chips = resolveAmountSuggestionChips(suggestions, value, currency);
  if (chips.length === 0) return null;
  const { height, label, hitSlop } = resolveAmountSuggestionChipGeometry(fontScale);
  return (
    <View
      testID="amount-suggestions"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: AMOUNT_SUGGESTION_GAP,
        paddingTop: AMOUNT_SUGGESTION_ROW_PADDING_TOP,
        paddingBottom: AMOUNT_SUGGESTION_ROW_PADDING_BOTTOM,
      }}
    >
      {chips.map((chip) => (
        <SelectablePill
          key={chip.kind}
          testID={`amount-suggestion-${chip.kind}`}
          label={chip.label}
          selected={chip.selected}
          onPress={() => onSelect(chip.text)}
          hitSlop={hitSlop}
          style={[WRAPPING_PILL_STYLE, { minHeight: height }]}
          labelStyle={[WRAPPING_PILL_LABEL_STYLE, label]}
          labelAllowFontScaling={false}
        />
      ))}
    </View>
  );
}
