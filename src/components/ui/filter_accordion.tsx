import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import { SelectablePill } from './chip';
import { Input } from './input';
import { SegmentedTabs } from './tabs';
import { Text } from './text';

interface FilterAccordionShellProps {
  title: string;
  count: number;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export interface FilterOptionPillViewModel<T extends string = string> {
  id: T;
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  startIcon?: ReactNode;
}

interface FilterOptionPillListProps<T extends string = string> {
  options: FilterOptionPillViewModel<T>[];
  onToggle: (id: T) => void;
}

interface AmountRangeFilterContentProps {
  amountCurrency: Currency;
  minValue: string;
  maxValue: string;
  onChangeCurrency: (currency: Currency) => void;
  onChangeMinText: (value: string) => void;
  onChangeMaxText: (value: string) => void;
  accessibilityLabel: string;
  minError?: string;
  maxError?: string;
  rangeError?: string;
}

export const FILTER_AMOUNT_FIELD_SLOT_HEIGHT = ms(76);
export const FILTER_AMOUNT_ERROR_SLOT_HEIGHT = ms(16);

export function FilterAccordionShell({
  title,
  count,
  summary,
  expanded,
  onToggle,
  children,
}: FilterAccordionShellProps): React.ReactElement {
  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Accordion
        selectionMode="single"
        value={expanded ? 'section' : ''}
        onValueChange={(_value: string | undefined) => onToggle()}
      >
        <Accordion.Item value="section">
          <Accordion.Trigger className="gap-0 px-0 py-0" style={{ padding: 0, gap: 0 }}>
            <View className="flex-row items-center justify-between" style={{ flex: 1 }}>
              <View className="flex-row items-center gap-2">
                <Text className="font-inter-semibold text-[13px]">{title}</Text>
                {count > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text className="font-inter-bold text-accent text-[10px]">{count}</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-inter text-foreground/60 text-[11px]" numberOfLines={1}>
                  {expanded ? '' : summary}
                </Text>
                <Accordion.Indicator isAnimatedStyleActive={false}>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={CoreTokens.text2}
                  />
                </Accordion.Indicator>
              </View>
            </View>
          </Accordion.Trigger>
          <Accordion.Content className="px-0 pb-0" style={{ padding: 0 }}>
            {children}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}

export function FilterOptionPillList<T extends string = string>({
  options,
  onToggle,
}: FilterOptionPillListProps<T>): React.ReactElement {
  return (
    <View className="mt-3 flex-row flex-wrap gap-1.5">
      {options.map((option) => (
        <SelectablePill
          key={option.id}
          label={option.label}
          selected={option.selected}
          onPress={() => onToggle(option.id)}
          startIcon={option.startIcon}
          checkable
          accessibilityLabel={option.accessibilityLabel}
        />
      ))}
    </View>
  );
}

export function AmountRangeFilterContent({
  amountCurrency,
  minValue,
  maxValue,
  onChangeCurrency,
  onChangeMinText,
  onChangeMaxText,
  accessibilityLabel,
  minError,
  maxError,
  rangeError,
}: AmountRangeFilterContentProps): React.ReactElement {
  return (
    <View className="mt-3">
      <SegmentedTabs<Currency>
        segments={[
          { value: Currency.EGP, label: Currency.EGP },
          { value: Currency.USD, label: Currency.USD },
        ]}
        value={amountCurrency}
        onValueChange={onChangeCurrency}
        variant="solid-gold"
        listClassName="w-full mb-3"
        accessibilityLabel={accessibilityLabel}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="font-inter-semibold text-foreground/55 mb-1 text-[10px] uppercase">
            {Strings.filterAmountMinLabel}
          </Text>
          <View
            testID="amount-field-error-slot"
            style={{ height: FILTER_AMOUNT_FIELD_SLOT_HEIGHT }}
          >
            <Input
              value={minValue}
              onChangeText={onChangeMinText}
              keyboardType="decimal-pad"
              placeholder={Strings.filterAmountMinPlaceholder}
              isInvalid={minError !== undefined}
              errorMessage={minError}
            />
          </View>
        </View>
        <View className="flex-1">
          <Text className="font-inter-semibold text-foreground/55 mb-1 text-[10px] uppercase">
            {Strings.filterAmountMaxLabel}
          </Text>
          <View
            testID="amount-field-error-slot"
            style={{ height: FILTER_AMOUNT_FIELD_SLOT_HEIGHT }}
          >
            <Input
              value={maxValue}
              onChangeText={onChangeMaxText}
              keyboardType="decimal-pad"
              placeholder={Strings.filterAmountMaxPlaceholder}
              isInvalid={maxError !== undefined}
              errorMessage={maxError}
            />
          </View>
        </View>
      </View>
      <View
        testID="amount-range-error-slot"
        className="mt-1.5 justify-center"
        style={{ height: FILTER_AMOUNT_ERROR_SLOT_HEIGHT }}
      >
        {rangeError ? (
          <Text
            accessibilityRole="alert"
            className="font-inter-medium text-danger text-[11px]"
            numberOfLines={1}
          >
            {rangeError}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
