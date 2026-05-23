import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { formatAmountSummary, parseAmountInput } from '../filter.helpers';
import type { AdvancedFilters } from '../filter.store';

interface Props {
  draft: AdvancedFilters;
  expanded: boolean;
  onToggleSection: () => void;
  onChangeCurrency: (c: Currency) => void;
  onChangeMin: (v?: number) => void;
  onChangeMax: (v?: number) => void;
}

export function AmountAccordion({
  draft,
  expanded,
  onToggleSection,
  onChangeCurrency,
  onChangeMin,
  onChangeMax,
}: Props): React.ReactElement {
  const [minStr, setMinStr] = useState(draft.amountMin?.toString() ?? '');
  const [maxStr, setMaxStr] = useState(draft.amountMax?.toString() ?? '');

  useEffect(() => {
    setMinStr(draft.amountMin?.toString() ?? '');
    setMaxStr(draft.amountMax?.toString() ?? '');
  }, [draft.amountMin, draft.amountMax]);

  const summary = formatAmountSummary(draft);
  const active = draft.amountMin !== undefined || draft.amountMax !== undefined;

  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Pressable
        onPress={onToggleSection}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View className="flex-row items-center justify-between">
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
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#888"
            />
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View className="mt-3">
          <View className="bg-background mb-3 flex-row gap-1.5 rounded-lg p-1">
            {([Currency.EGP, Currency.USD] as const).map((c) => {
              const sel = draft.amountCurrency === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => onChangeCurrency(c)}
                  className={`flex-1 items-center rounded-md py-1.5 ${sel ? 'bg-default/40' : ''}`}
                >
                  <Text
                    className={`font-inter text-[11px] font-semibold ${sel ? 'text-accent' : 'text-foreground/60'}`}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
                {Strings.filterAmountMinLabel}
              </Text>
              <Input
                value={minStr}
                onChangeText={(s) => {
                  setMinStr(s);
                  onChangeMin(parseAmountInput(s));
                }}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View className="flex-1">
              <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
                {Strings.filterAmountMaxLabel}
              </Text>
              <Input
                value={maxStr}
                onChangeText={(s) => {
                  setMaxStr(s);
                  onChangeMax(parseAmountInput(s));
                }}
                keyboardType="decimal-pad"
                placeholder="∞"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
