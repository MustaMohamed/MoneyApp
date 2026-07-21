import { FieldError } from 'heroui-native';
import React from 'react';
import type { TextProps } from 'react-native';

export interface FormErrorTextProps {
  message?: string;
  className?: string;
  numberOfLines?: TextProps['numberOfLines'];
  disableAnimation?: boolean;
}

export function FormErrorText({
  message,
  className,
  numberOfLines,
  disableAnimation = false,
}: FormErrorTextProps) {
  return (
    <FieldError
      isInvalid={!!message}
      className={className}
      textProps={{ numberOfLines }}
      animation={disableAnimation ? 'disabled' : undefined}
    >
      {message}
    </FieldError>
  );
}
