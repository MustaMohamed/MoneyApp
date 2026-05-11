import React from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { cn } from 'heroui-native';
import { Text } from './text';

export interface InputProps extends TextInputProps {
  className?: string;
  label?: string;
  helperText?: string;
  isInvalid?: boolean;
  /** @deprecated use isInvalid */
  hasError?: boolean;
}

export function Input({
  className,
  label,
  helperText,
  isInvalid,
  hasError,
  placeholderTextColor,
  ...props
}: InputProps) {
  const invalid = isInvalid ?? hasError ?? false;
  return (
    <View className="gap-1">
      {label ? (
        <Text variant="label" className="text-foreground">
          {label}
        </Text>
      ) : null}
      <TextInput
        className={cn(
          'h-12 rounded-xl px-4 font-inter text-[15px]',
          'bg-field-background text-field-foreground border border-field-border',
          invalid && 'border-danger',
          className,
        )}
        placeholderTextColor={placeholderTextColor ?? '#6B7F99'}
        {...props}
      />
      {helperText ? (
        <Text variant="caption" className={invalid ? 'text-danger' : 'text-muted'}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
