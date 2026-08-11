import React from 'react';

import { SegmentedTabs } from '@/components/ui/tabs';
import { CURRENCY_SEGMENTS } from '@/constants/currency';
import { type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

export interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  isDisabled?: boolean;
  /**
   * Fixed width per segment — MA-009's compact currency cell next to the
   * balance field (decision 1). Omitted by every other consumer, which
   * keeps today's full-width two-segment control.
   */
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
