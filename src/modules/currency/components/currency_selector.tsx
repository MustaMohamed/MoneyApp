import React from 'react';

import { SegmentedTabs } from '@/components/ui/tabs';
import type { TabsTriggerHitSlop } from '@/components/ui/tabs.geometry';
import { CURRENCY_SEGMENTS } from '@/constants/currency';
import { type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

export interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  isDisabled?: boolean;
  /** Fixed width per segment; when omitted the control stays full-width. */
  segmentWidth?: number;
  /** The font scale past which the codes stop growing, passed to `SegmentedTabs` unchanged. */
  maxFontScale?: number;
  /** Each segment's slop past its top and bottom edges, passed to `SegmentedTabs` unchanged. */
  triggerHitSlop?: TabsTriggerHitSlop;
}

export function CurrencySelector({
  value,
  onChange,
  isDisabled,
  segmentWidth,
  maxFontScale,
  triggerHitSlop,
}: CurrencySelectorProps) {
  return (
    <SegmentedTabs<Currency>
      segments={CURRENCY_SEGMENTS}
      value={value}
      onValueChange={onChange}
      variant="solid-gold"
      isDisabled={isDisabled}
      segmentWidth={segmentWidth}
      maxFontScale={maxFontScale}
      triggerHitSlop={triggerHitSlop}
      accessibilityLabel={Strings.accountCurrencyA11y}
    />
  );
}
