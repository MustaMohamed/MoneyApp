import React from 'react';
import {
  TextField as HTextField,
  Input as HInput,
  Label,
  Description,
  type InputProps as HInputProps,
} from 'heroui-native';

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
  ...inputProps
}: InputProps) {
  const invalid = isInvalid ?? hasError ?? false;
  return (
    <HTextField isInvalid={invalid} isDisabled={isDisabled} isRequired={isRequired}>
      {label ? <Label>{label}</Label> : null}
      <HInput className={className} {...inputProps} />
      {helperText ? <Description>{helperText}</Description> : null}
    </HTextField>
  );
}
