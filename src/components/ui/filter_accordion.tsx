import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

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
}

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
                <Text className="font-inter text-[13px] font-semibold">{title}</Text>
                {count > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text className="font-inter text-accent text-[10px] font-bold">{count}</Text>
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
          <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
            {Strings.filterAmountMinLabel}
          </Text>
          <Input
            value={minValue}
            onChangeText={onChangeMinText}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
        <View className="flex-1">
          <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
            {Strings.filterAmountMaxLabel}
          </Text>
          <Input
            value={maxValue}
            onChangeText={onChangeMaxText}
            keyboardType="decimal-pad"
            placeholder="∞"
          />
        </View>
      </View>
    </View>
  );
}
