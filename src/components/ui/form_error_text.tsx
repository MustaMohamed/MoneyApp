import { FieldError } from 'heroui-native';
import React from 'react';

export interface FormErrorTextProps {
  message?: string;
  className?: string;
}

export function FormErrorText({ message, className }: FormErrorTextProps) {
  return (
    <FieldError isInvalid={!!message} className={className}>
      {message}
    </FieldError>
  );
}
