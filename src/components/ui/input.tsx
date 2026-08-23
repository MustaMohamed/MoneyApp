import {
  TextField as HTextField,
  Input as HInput,
  Label,
  Description,
  FieldError,
  InputGroup,
  cn,
  type InputProps as HInputProps,
} from 'heroui-native';
import React from 'react';
import type { ReactNode } from 'react';

export interface InputProps extends HInputProps {
  className?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  suffix?: ReactNode;
  /**
   * Caps `errorMessage` at N lines. Needed whenever the field sits in a
   * fixed-height slot: `FieldError` is a sibling of the input inside
   * `HTextField`'s column, so an uncapped message both wraps past the reserved
   * height and, in a column with no width of its own, sets that column's
   * intrinsic width. Left uncapped by default — wrapping is the right behaviour
   * for a field that is free to grow.
   */
  errorNumberOfLines?: number;
}

export function Input({
  className,
  label,
  helperText,
  errorMessage,
  errorNumberOfLines,
  isInvalid,
  isDisabled,
  isRequired,
  suffix,
  style,
  ...inputProps
}: InputProps) {
  const invalid = isInvalid ?? false;
  return (
    <HTextField isInvalid={invalid} isDisabled={isDisabled} isRequired={isRequired}>
      {label ? <Label>{label}</Label> : null}
      {suffix ? (
        <InputGroup>
          <InputGroup.Input
            className={cn('font-inter py-2 text-[16px]', className)}
            style={[
              {
                includeFontPadding: false,
                textAlignVertical: 'center',
              },
              style,
            ]}
            {...inputProps}
          />
          <InputGroup.Suffix isDecorative>{suffix}</InputGroup.Suffix>
        </InputGroup>
      ) : (
        <HInput
          className={cn('font-inter py-2 text-[16px]', className)}
          style={[
            {
              includeFontPadding: false,
              textAlignVertical: 'center',
            },
            style,
          ]}
          {...inputProps}
        />
      )}
      {helperText ? <Description>{helperText}</Description> : null}
      {errorMessage ? (
        <FieldError textProps={{ numberOfLines: errorNumberOfLines }}>{errorMessage}</FieldError>
      ) : null}
    </HTextField>
  );
}
