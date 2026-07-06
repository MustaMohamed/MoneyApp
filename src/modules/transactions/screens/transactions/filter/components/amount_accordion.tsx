import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

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
}: Props): React.ReactElement {
  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Accordion
        selectionMode="single"
        value={expanded ? 'section' : ''}
        onValueChange={(_v: string | undefined) => onToggleSection()}
      >
        <Accordion.Item value="section">
          <Accordion.Trigger className="gap-0 px-0 py-0" style={{ padding: 0, gap: 0 }}>
            <View className="flex-row items-center justify-between" style={{ flex: 1 }}>
              <View className="flex-row items-center gap-2">
                <Text className="font-inter text-[13px] font-semibold">
                  {Strings.filterSectionAmount}
                </Text>
                {active ? (
                  <View className="bg-accent/15 items-center rounded-full px-1.5">
                    <Text className="font-inter text-accent text-[10px] font-bold">1</Text>
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
                accessibilityLabel="Amount currency"
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
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}
