import { Typography } from 'heroui-native';
import React from 'react';
import { useWatch, type Control } from 'react-hook-form';

import { Type, lineHeightFor } from '@/constants/theme';

import type { AddAccountFormData } from '../../utils/add_account.schema';

export interface BalanceCurrencySuffixProps {
  control: Control<AddAccountFormData>;
}

/** `InputGroup.Suffix` does not auto-wrap children; a bare string crashes without `Typography`. */
export function BalanceCurrencySuffix({ control }: BalanceCurrencySuffixProps) {
  const currency = useWatch({ control, name: 'currency' });

  return (
    <Typography
      className="font-sora text-content-secondary"
      style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
    >
      {currency}
    </Typography>
  );
}
