import { Input, Separator } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';
import { tv } from 'tailwind-variants';

import { INPUT_NO_FOCUS_BORDER_COLOR } from '@/components/ui/input';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { maskMoneyFieldText } from '@/utils/money_text';

import {
  AMOUNT_CODE_STYLE,
  AMOUNT_ENTRY_MAX_FONT_SCALE,
  AMOUNT_ERROR_LINE_HEIGHT,
  AMOUNT_ERROR_LINE_STYLE,
  AMOUNT_FLANK_STYLE,
} from './form_sheet.geometry';

const amountClass = tv({
  base: 'font-sora min-h-0 rounded-none border-0 bg-transparent px-0 py-0',
  variants: {
    tone: {
      danger: 'text-danger',
      success: 'text-success',
      info: 'text-info',
      accentCc: 'text-accent-cc',
    },
  },
});

export type AmountHeroTone = 'danger' | 'success' | 'info' | 'accentCc';

interface Props {
  onChange: (value: string) => void;
  /** The field's text as the owner's store holds it. */
  value: string;
  tone: AmountHeroTone;
  currency: Currency;
  invalid?: boolean;
}

export function AmountHero({
  onChange,
  value,
  tone,
  currency,
  invalid = false,
}: Props): React.ReactElement {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const { fontScale } = useWindowDimensions();

  // Two equal columns flank the input and centre the number: the right one holds the code unseen, and an amount wider than the room between them shrinks the input, which scrolls it.
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline' }}
      className="border-separator border-b py-4"
    >
      <View style={{ ...AMOUNT_FLANK_STYLE, alignItems: 'flex-end' }}>
        <Text className="font-inter text-muted mr-2" style={AMOUNT_CODE_STYLE}>
          {currency}
        </Text>
      </View>
      <View style={{ flexShrink: 1, minWidth: 0 }}>
        <Input
          testID="amount-hero-value"
          value={value}
          onChangeText={(text) => {
            // Diffs against the text on screen; `undefined` refuses the edit and keeps it.
            const masked = maskMoneyFieldText(value, text);
            if (masked !== undefined) onChange(masked);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          accessibilityLabel={Strings.addTxAmountInputAccessibility}
          className={amountClass({ tone })}
          allowFontScaling={false}
          style={{
            minWidth: 80,
            textAlign: 'center',
            padding: 0,
            borderColor: INPUT_NO_FOCUS_BORDER_COLOR,
            ...scaledTextStyle(Type.amountEntry, fontScale, AMOUNT_ENTRY_MAX_FONT_SCALE),
          }}
          placeholder={Strings.addTxAmountPlaceholder}
          placeholderTextColor={CoreTokens.text2}
        />
        {invalid ? (
          <Separator
            testID="amount-hero-error-line"
            className="bg-danger"
            thickness={AMOUNT_ERROR_LINE_HEIGHT}
            style={AMOUNT_ERROR_LINE_STYLE}
          />
        ) : null}
      </View>
      <View style={AMOUNT_FLANK_STYLE}>
        <Text
          className="font-inter text-muted mr-2"
          style={{ ...AMOUNT_CODE_STYLE, opacity: 0 }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {currency}
        </Text>
      </View>
    </View>
  );
}
