import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/utils/cn';

interface InputProps extends TextInputProps {
  className?: string;
  hasError?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, hasError = false, ...props }, ref) => (
    <TextInput
      ref={ref}
      className={cn(
        'border rounded-[12px] px-4 py-3 font-inter text-[14px] text-text1 bg-surfaceEl',
        hasError ? 'border-negative' : 'border-border',
        className,
      )}
      // placeholderTextColor cannot be a Tailwind class (it is a JSX prop).
      // #6B7F99 equals CoreTokens.text2. Accepted exception per plan note.
      placeholderTextColor="#6B7F99"
      {...props}
    />
  ),
);
Input.displayName = 'Input';
