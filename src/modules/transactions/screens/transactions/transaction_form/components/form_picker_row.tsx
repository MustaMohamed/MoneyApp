import type { ReactElement, ReactNode } from 'react';

import { FactRow } from '@/components/ui/fact_row';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';

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
  /** The value's size at scale 1; a one-line value is scaled from it above scale 1. */
  valueFontSize?: number;
  valueNumberOfLines?: number;
  divider?: boolean;
}

/** Canvas `.fact` on the shared row, pressable: key left, value right, a hairline below unless `divider` is off. */
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
  valueFontSize = Type.body,
  valueNumberOfLines = 1,
  divider = true,
}: FormPickerRowProps): ReactElement {
  return (
    <FactRow
      testID={testID}
      label={label}
      labelCaption={labelCaption}
      value={value}
      valueClassName={valueClassName}
      valueFontSize={valueFontSize}
      wrapsValue={valueNumberOfLines !== 1}
      leading={prefix}
      trailing={suffix}
      inset={false}
      showDivider={divider}
      press={{ onPress, disabled, accessibilityLabel, accessibilityHint }}
    />
  );
}
