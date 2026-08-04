import { ListGroup, cn } from 'heroui-native';
import type { ReactNode } from 'react';
import type { TextStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';

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
    <ListGroup variant="secondary" className="rounded-md">
      <ListGroup.Item
        testID={testID}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        className="gap-2 px-3 py-3"
      >
        {prefix ? <ListGroup.ItemPrefix>{prefix}</ListGroup.ItemPrefix> : null}
        <ListGroup.ItemContent style={{ minWidth: 0 }}>
          <ListGroup.ItemDescription className="font-inter" style={{ fontSize: Type.micro }}>
            {label}
          </ListGroup.ItemDescription>
          <ListGroup.ItemTitle
            numberOfLines={1}
            className={cn('font-sora-semibold', valueClassName)}
            style={[{ fontSize: Type.bodyStrong }, valueStyle]}
          >
            {value}
          </ListGroup.ItemTitle>
        </ListGroup.ItemContent>
        <ListGroup.ItemSuffix>{suffix}</ListGroup.ItemSuffix>
      </ListGroup.Item>
    </ListGroup>
  );
}
