import React from 'react';

import { AmountRangeFilterContent, FilterAccordionShell } from '@/components/ui/filter_accordion';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

interface Props {
  amountCurrency: Currency;
  minValue: string;
  maxValue: string;
  summary: string;
  active: boolean;
  expanded: boolean;
  onToggleSection: () => void;
  onChangeCurrency: (c: Currency) => void;
  onChangeMinText: (value: string) => void;
  onChangeMaxText: (value: string) => void;
  minError?: string;
  maxError?: string;
  rangeError?: string;
}

export function AmountAccordion({
  amountCurrency,
  minValue,
  maxValue,
  summary,
  active,
  expanded,
  onToggleSection,
  onChangeCurrency,
  onChangeMinText,
  onChangeMaxText,
  minError,
  maxError,
  rangeError,
}: Props): React.ReactElement {
  return (
    <FilterAccordionShell
      title={Strings.filterSectionAmount}
      count={active ? 1 : 0}
      summary={summary}
      expanded={expanded}
      onToggle={onToggleSection}
    >
      <AmountRangeFilterContent
        amountCurrency={amountCurrency}
        minValue={minValue}
        maxValue={maxValue}
        onChangeCurrency={onChangeCurrency}
        onChangeMinText={onChangeMinText}
        onChangeMaxText={onChangeMaxText}
        accessibilityLabel={Strings.filterAmountCurrencyAccessibility}
        minError={minError}
        maxError={maxError}
        rangeError={rangeError}
      />
    </FilterAccordionShell>
  );
}
