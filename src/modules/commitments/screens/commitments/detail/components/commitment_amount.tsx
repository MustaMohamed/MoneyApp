import { type StyleProp, View, type ViewStyle, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';

import {
  CURRENT_CYCLE_AMOUNT_GAP,
  CURRENT_CYCLE_CODE_FONT_SIZE,
} from './current_cycle_card.geometry';

interface Props {
  amountText: string;
  amountCode: string;
  accessibilityLabel: string;
  amountFontSize: number;
  amountClassName: string;
  style?: StyleProp<ViewStyle>;
}

export function CommitmentAmount({
  amountText,
  amountCode,
  accessibilityLabel,
  amountFontSize,
  amountClassName,
  style,
}: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const amountProps = resolveFitAmountTextProps(amountFontSize, fontScale);

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: CURRENT_CYCLE_AMOUNT_GAP,
          flexShrink: 1,
        },
        style,
      ]}
    >
      <Text
        {...amountProps}
        className={amountClassName}
        style={{ ...amountProps.style, flexShrink: 1 }}
      >
        {amountText}
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        className="font-inter text-content-secondary"
        style={scaledTextStyle(CURRENT_CYCLE_CODE_FONT_SIZE, fontScale)}
      >
        {amountCode}
      </Text>
    </View>
  );
}
