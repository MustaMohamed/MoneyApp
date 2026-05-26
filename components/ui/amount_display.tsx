import { cn } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from 'heroui-native';
import { formatAmount } from '@/utils/format_amount';

const SIZE_AMOUNT: Record<string, string> = {
  sm: 'font-sora text-[13px] font-bold',
  md: 'font-sora text-[18px] font-bold',
  lg: 'font-sora text-[28px] font-bold',
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
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} className={cn('gap-1', className)}>
      <Text className={SIZE_AMOUNT[size]}>{formatAmount(amount, decimals)}</Text>
      <Text className={SIZE_CURRENCY[size]}>{currency}</Text>
    </View>
  );
}
