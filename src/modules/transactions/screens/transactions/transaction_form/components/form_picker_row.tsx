import { ListGroup, cn } from 'heroui-native';
import type { ReactNode } from 'react';
import { View, type TextStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { TouchSize, Type, lineHeightFor } from '@/constants/theme';

export const FACT_ROW_MIN_HEIGHT = TouchSize.min;

interface FormPickerRowProps {
  testID: string;
  label: string;
  value: string;
  onPress?: () => void;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  accessibilityLabel?: string;
  valueClassName?: string;
  valueStyle?: TextStyle;
}

/** Canvas `.fact`: key left, value right on one line, at the 44 touch floor, a hairline below. */
export function FormPickerRow({
  testID,
  label,
  value,
  onPress,
  disabled = false,
  prefix,
  suffix,
  accessibilityLabel = Strings.addTxPickerAccessibility(label, value),
  valueClassName,
  valueStyle,
}: FormPickerRowProps): React.ReactElement {
  return (
    <ListGroup.Item
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className="border-separator flex-row items-center justify-between gap-3 border-b px-0 py-2"
      style={{ minHeight: FACT_ROW_MIN_HEIGHT }}
    >
      <ListGroup.ItemDescription
        className="font-inter text-content-secondary"
        style={{ flexShrink: 0, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
      >
        {label}
      </ListGroup.ItemDescription>
      <View
        className="flex-row items-center gap-2"
        style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}
      >
        {prefix}
        <ListGroup.ItemTitle
          numberOfLines={1}
          className={cn('font-sora text-foreground tabular-nums', valueClassName)}
          style={[
            {
              flexShrink: 1,
              textAlign: 'right',
              fontSize: Type.body,
              lineHeight: lineHeightFor(Type.body),
            },
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
