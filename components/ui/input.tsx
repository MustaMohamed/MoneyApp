import {
  TextField as HTextField,
  Input as HInput,
  Label,
  Description,
  type InputProps as HInputProps,
} from 'heroui-native';
import React from 'react';

import { FontFamily, Spacing, Type } from '@/constants/theme';

export interface InputProps extends HInputProps {
  className?: string;
  label?: string;
  helperText?: string;
  isRequired?: boolean;
  /** @deprecated use isInvalid */
  hasError?: boolean;
}

export function Input({
  className,
  label,
  helperText,
  isInvalid,
  hasError,
  isDisabled,
  isRequired,
  style,
  ...inputProps
}: InputProps) {
  const invalid = isInvalid ?? hasError ?? false;
  return (
    <HTextField isInvalid={invalid} isDisabled={isDisabled} isRequired={isRequired}>
      {label ? <Label>{label}</Label> : null}
      <HInput
        className={className}
        style={[
          {
            fontFamily: FontFamily.interRegular,
            fontSize: Type.subhead,
            paddingTop: Spacing.xs,
            paddingBottom: Spacing.xxs,
            includeFontPadding: false,
            textAlignVertical: 'center',
          },
          style,
        ]}
        {...inputProps}
      />
      {helperText ? <Description>{helperText}</Description> : null}
    </HTextField>
  );
}
