import { type StyleProp, View, type ViewStyle, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Spacing, Type } from '@/constants/theme';

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
          gap: Spacing.xxs,
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
        style={scaledTextStyle(Type.micro, fontScale)}
      >
        {amountCode}
      </Text>
    </View>
  );
}
