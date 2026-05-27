import React from 'react';

import { SegmentedTabs } from '@/components/ui/tabs';
import { CURRENCY_SEGMENTS } from '@/constants/currency';
import { type Currency } from '@/constants/enums';

export interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  isDisabled?: boolean;
}

export function CurrencySelector({ value, onChange, isDisabled }: CurrencySelectorProps) {
  return (
    <SegmentedTabs<Currency>
      segments={CURRENCY_SEGMENTS}
      value={value}
      onValueChange={onChange}
      variant="solid-gold"
      isDisabled={isDisabled}
    />
  );
}
