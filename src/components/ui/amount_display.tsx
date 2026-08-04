import { Typography, cn } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { formatAmount } from '@/utils/format_amount';

const SIZE_AMOUNT: Record<string, string> = {
  sm: 'font-sora-bold text-[13px]',
  md: 'font-sora-bold text-[18px]',
  lg: 'font-sora-bold text-[28px]',
};

const SIZE_CURRENCY: Record<string, string> = {
  sm: 'font-inter text-[10px] text-muted',
  md: 'font-inter text-[13px] text-muted',
  lg: 'font-inter text-[16px] text-muted',
};

export interface AmountDisplayProps {
  amount: number;
  currency: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AmountDisplay({
  amount,
  currency,
  decimals = 0,
  size = 'md',
  className,
}: AmountDisplayProps) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline' }}
      className={cn('gap-1', className)}
    >
      <Typography className={SIZE_AMOUNT[size]}>{formatAmount(amount, decimals)}</Typography>
      <Typography className={SIZE_CURRENCY[size]}>{currency}</Typography>
    </View>
  );
}
