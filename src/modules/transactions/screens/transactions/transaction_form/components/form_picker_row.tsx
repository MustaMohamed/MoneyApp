import { ListGroup, cn } from 'heroui-native';
import type { ReactElement, ReactNode } from 'react';
import { View, type TextStyle, useWindowDimensions } from 'react-native';

import {
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import { FACT_ROW_MIN_HEIGHT } from './transaction_form.geometry';

interface FormPickerRowProps {
  testID: string;
  label: string;
  /** A line under the label; the label and it shrink together so the row grows past its floor. */
  labelCaption?: ReactElement;
  value: string;
  onPress?: () => void;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  valueClassName?: string;
  valueStyle?: Omit<TextStyle, 'fontSize' | 'lineHeight'>;
  /** The value's size at scale 1; a one-line value is scaled from it above scale 1. */
  valueFontSize?: number;
  valueNumberOfLines?: number;
  divider?: boolean;
}

/** Canvas `.fact`: key left, value right, at the 44 touch floor, a hairline below unless `divider` is off. */
export function FormPickerRow({
  testID,
  label,
  labelCaption,
  value,
  onPress,
  disabled = false,
  prefix,
  suffix,
  accessibilityLabel = Strings.addTxPickerAccessibility(label, value),
  accessibilityHint,
  valueClassName,
  valueStyle,
  valueFontSize = Type.body,
  valueNumberOfLines = 1,
  divider = true,
}: FormPickerRowProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  // A one-line value is scaled by the app above scale 1, so its ellipsis stays inside its box; any other count keeps OS scaling.
  const oneLine =
    valueNumberOfLines === 1
      ? resolveOneLineTextProps(scaledTextStyleAboveOne(valueFontSize, fontScale))
      : undefined;
  const labelNode = (
    <ListGroup.ItemDescription
      className="font-inter text-content-secondary"
      style={{ flexShrink: 0, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
    >
      {label}
    </ListGroup.ItemDescription>
  );

  return (
    <ListGroup.Item
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      className={cn('gap-3 px-0 py-2', divider && 'border-separator border-b')}
      style={{
        minHeight: FACT_ROW_MIN_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {labelCaption === undefined ? (
        labelNode
      ) : (
        <View style={{ flex: 1, minWidth: 0 }}>
          {labelNode}
          {labelCaption}
        </View>
      )}
      <View
        className="gap-2"
        style={{
          // With a caption the rate keeps its natural width and the caption takes the ellipsis.
          flex: labelCaption === undefined ? 1 : 0,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {prefix}
        <ListGroup.ItemTitle
          numberOfLines={valueNumberOfLines}
          allowFontScaling={oneLine?.allowFontScaling}
          className={cn('font-sora text-foreground tabular-nums', valueClassName)}
          style={[
            {
              flexShrink: 1,
              textAlign: 'right',
              fontSize: valueFontSize,
              lineHeight: lineHeightFor(valueFontSize),
            },
            oneLine?.style,
            valueStyle,
          ]}
        >
          {value}
        </ListGroup.ItemTitle>
        {suffix}
      </View>
    </ListGroup.Item>
  );
}
