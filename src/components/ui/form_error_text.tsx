import { FieldError } from 'heroui-native';
import React from 'react';
import type { TextProps } from 'react-native';

export interface FormErrorTextProps {
  message?: string;
  className?: string;
  numberOfLines?: TextProps['numberOfLines'];
  disableAnimation?: boolean;
  style?: TextProps['style'];
  onTextLayout?: TextProps['onTextLayout'];
}

export function FormErrorText({
  message,
  className,
  numberOfLines,
  disableAnimation = false,
  style,
  onTextLayout,
}: FormErrorTextProps) {
  return (
    <FieldError
      isInvalid={!!message}
      className={className}
      textProps={{ numberOfLines, style, onTextLayout }}
      animation={disableAnimation ? 'disabled' : undefined}
    >
      {message}
    </FieldError>
  );
}
