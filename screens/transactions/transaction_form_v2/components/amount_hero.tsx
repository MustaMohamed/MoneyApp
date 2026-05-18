import React from 'react';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';

function formatAmount(str: string): string {
  const [integer, decimal] = str.split('.');
  const formatted = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    parseInt(integer || '0', 10),
  );
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

const amountClass = tv({
  base: 'font-sora text-[40px]',
  variants: {
    type: {
      expense: 'text-danger',
      income: 'text-success',
      transfer: 'text-info',
      cc_payment: 'text-accent-cc',
    },
  },
});

interface Props {
  amountStr: string;
  type: TransactionType;
  currency: Currency;
}

export function AmountHero({ amountStr, type, currency }: Props): React.ReactElement {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}
      className="py-4 gap-2 border-b border-separator"
    >
      <Text className="font-inter text-[15px] text-muted">{currency}</Text>
      <Text testID="amount-hero-value" className={amountClass({ type })}>
        {formatAmount(amountStr)}
      </Text>
    </View>
  );
}
