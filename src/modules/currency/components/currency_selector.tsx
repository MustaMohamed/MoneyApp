import React from 'react';

import { SegmentedTabs } from '@/components/ui/tabs';
import { CURRENCY_SEGMENTS } from '@/constants/currency';
import { type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

export interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  isDisabled?: boolean;
  /** Fixed width per segment; when omitted the control stays full-width. */
  segmentWidth?: number;
}

export function CurrencySelector({
  value,
  onChange,
  isDisabled,
  segmentWidth,
}: CurrencySelectorProps) {
  return (
    <SegmentedTabs<Currency>
      segments={CURRENCY_SEGMENTS}
      value={value}
      onValueChange={onChange}
      variant="solid-gold"
      isDisabled={isDisabled}
      segmentWidth={segmentWidth}
      accessibilityLabel={Strings.accountCurrencyA11y}
    />
  );
}
