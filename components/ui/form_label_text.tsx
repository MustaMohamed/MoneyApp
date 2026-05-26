import { Label } from 'heroui-native';
import React from 'react';

export interface FormLabelTextProps {
  label: string;
  isOptional?: boolean;
  className?: string;
}

export function FormLabelText({ label, isOptional = false, className }: FormLabelTextProps) {
  return (
    <Label isRequired={!isOptional} className={className}>
      {label}
    </Label>
  );
}
