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

import { Colors } from '@/constants/theme';

/** `borderColor` for an `Input` with `border-0`, whose focus mark is the caret or its own box: HeroUI's Android focus border outranks the class and would draw as well. */
export const INPUT_NO_FOCUS_BORDER_COLOR = Colors.shared.transparent;

export interface InputProps extends HInputProps {
  className?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  suffix?: ReactNode;
  suffixClassName?: string;
  /** Caps `errorMessage` at N lines; uncapped it wraps and widens a fixed-height slot. */
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
  suffixClassName,
  style,
  ...inputProps
}: InputProps) {
  const invalid = isInvalid ?? false;
  return (
    <HTextField isInvalid={invalid} isDisabled={isDisabled} isRequired={isRequired}>
      {label ? <Label>{label}</Label> : null}
      {suffix ? (
        <InputGroup isDisabled={isDisabled}>
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
          <InputGroup.Suffix isDecorative className={suffixClassName}>
            {suffix}
          </InputGroup.Suffix>
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
