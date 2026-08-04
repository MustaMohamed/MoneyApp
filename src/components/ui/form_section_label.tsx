import { Typography } from 'heroui-native';
import React from 'react';

interface FormSectionLabelProps {
  children: React.ReactNode;
}

export function FormSectionLabel({ children }: FormSectionLabelProps) {
  return (
    <Typography className="font-sora-bold text-gold-500 pt-2 pb-2 text-xs tracking-widest uppercase">
      {children}
    </Typography>
  );
}
