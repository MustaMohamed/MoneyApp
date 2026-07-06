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
  onChangeCurrency: (currency: Currency) => void;
  onChangeMinText: (value: string) => void;
  onChangeMaxText: (value: string) => void;
}

export function CommitmentAmountAccordion({
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
        accessibilityLabel={Strings.commitmentFilterAmountCurrencyAccessibility}
      />
    </FilterAccordionShell>
  );
}
