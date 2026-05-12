import React from 'react';
import {
  TextField as HTextField,
  Input as HInput,
  Label,
  Description,
  type InputProps as HInputProps,
} from 'heroui-native';

import { FontFamily } from '@/constants/theme';

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
            fontSize: 16,
            paddingTop: 8,
            paddingBottom: 4,
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
