import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion, cn } from 'heroui-native';
import React, { type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { SelectablePill } from './chip';
import { WRAPPING_PILL_LABEL_STYLE, WRAPPING_PILL_STYLE } from './chip.geometry';
import {
  FILTER_ACCORDION_CARD_BORDER,
  FILTER_ACCORDION_CARD_MARGIN_BOTTOM,
  FILTER_ACCORDION_CONTENT_PADDING_BOTTOM,
  FILTER_OPTION_LIST_EDGE,
  FILTER_OPTION_PILL_GAP,
  resolveFilterAmountSlotStyle,
} from './filter_accordion.geometry';
import { Input } from './input';
import { SegmentedTabs } from './tabs';
import { Text } from './text';
import { resolveOneLineTextProps, scaledTextStyleAboveOne } from './text_scale.geometry';
import { useTouchFloorGridHitSlop } from './touch_floor.hook';

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
  minError: string | undefined;
  maxError: string | undefined;
  rangeError: string | undefined;
}

export function FilterAccordionShell({
  title,
  count,
  summary,
  expanded,
  onToggle,
  children,
}: FilterAccordionShellProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const summaryLine = resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale));

  return (
    <View
      className="border-separator bg-surface rounded-xl px-3.5"
      style={{
        borderWidth: FILTER_ACCORDION_CARD_BORDER,
        marginBottom: FILTER_ACCORDION_CARD_MARGIN_BOTTOM,
      }}
    >
      <Accordion
        selectionMode="single"
        value={expanded ? 'section' : ''}
        onValueChange={(_value: string | undefined) => onToggle()}
      >
        <Accordion.Item value="section">
          {/* The trigger holds the card's vertical padding and the gap above the body, so its box clears TouchSize.min. */}
          <Accordion.Trigger
            className={cn('gap-0 px-0 pt-3.5', expanded ? 'pb-3' : 'pb-3.5')}
            style={{ paddingHorizontal: 0, gap: 0 }}
          >
            <View className="flex-row items-center justify-between gap-2" style={{ flex: 1 }}>
              <View className="flex-row items-center gap-2" style={{ flexShrink: 0 }}>
                <Text className="font-inter-semibold text-[13px]">{title}</Text>
                {count > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text
                      className="font-inter-bold text-accent"
                      style={{
                        fontSize: Type.pillLabel,
                        lineHeight: lineHeightFor(Type.pillLabel),
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View
                className="flex-row items-center gap-1.5"
                style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}
              >
                <Text className="font-inter text-foreground/60 text-[11px]" {...summaryLine}>
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
          <Accordion.Content
            className="px-0 pt-0"
            style={{
              paddingHorizontal: 0,
              paddingBottom: FILTER_ACCORDION_CONTENT_PADDING_BOTTOM,
            }}
          >
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
  const touch = useTouchFloorGridHitSlop(
    FILTER_OPTION_PILL_GAP,
    FILTER_OPTION_LIST_EDGE,
    undefined,
    options.map((option) => option.id),
  );

  return (
    <View className="flex-row flex-wrap" style={{ gap: FILTER_OPTION_PILL_GAP }}>
      {options.map((option) => (
        <SelectablePill
          key={option.id}
          {...touch.item(option.id)}
          label={option.label}
          selected={option.selected}
          onPress={() => onToggle(option.id)}
          startIcon={option.startIcon}
          checkable
          accessibilityLabel={option.accessibilityLabel}
          style={WRAPPING_PILL_STYLE}
          labelStyle={WRAPPING_PILL_LABEL_STYLE}
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
  const { fontScale } = useWindowDimensions();
  const slot = resolveFilterAmountSlotStyle(fontScale);

  return (
    <View>
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
          <View testID="amount-field-error-slot" style={slot.field}>
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
          <View testID="amount-field-error-slot" style={slot.field}>
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
      <View testID="amount-range-error-slot" className="mt-1.5 justify-center" style={slot.range}>
        {rangeError ? (
          <Text accessibilityRole="alert" className="font-inter-medium text-danger text-[11px]">
            {rangeError}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
