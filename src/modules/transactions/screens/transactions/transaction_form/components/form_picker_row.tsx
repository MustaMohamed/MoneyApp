import { ListGroup, cn } from 'heroui-native';
import type { ReactNode } from 'react';
import { View, type TextStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import { FACT_ROW_MIN_HEIGHT } from './transaction_form_geometry';

interface FormPickerRowProps {
  testID: string;
  label: string;
  value: string;
  onPress?: () => void;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  valueClassName?: string;
  valueStyle?: TextStyle;
  valueNumberOfLines?: number;
  divider?: boolean;
}

/** Canvas `.fact`: key left, value right, at the 44 touch floor, a hairline below unless `divider` is off. */
export function FormPickerRow({
  testID,
  label,
  value,
  onPress,
  disabled = false,
  prefix,
  suffix,
  accessibilityLabel = Strings.addTxPickerAccessibility(label, value),
  accessibilityHint,
  valueClassName,
  valueStyle,
  valueNumberOfLines = 1,
  divider = true,
}: FormPickerRowProps): React.ReactElement {
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
      <ListGroup.ItemDescription
        className="font-inter text-content-secondary"
        style={{ flexShrink: 0, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
      >
        {label}
      </ListGroup.ItemDescription>
      <View
        className="gap-2"
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {prefix}
        <ListGroup.ItemTitle
          numberOfLines={valueNumberOfLines}
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
