import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Currency } from '@/constants/enums';
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
    <View className="rounded-xl border border-separator bg-surface mb-2 p-3.5">
      <Pressable onPress={onToggleSection} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter font-semibold text-[13px]">{Strings.filterSectionAmount}</Text>
            {active ? (
              <View className="px-1.5 rounded-full bg-accent/15 items-center">
                <Text className="font-inter font-bold text-[10px] text-accent">1</Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-inter text-[11px] text-foreground/60" numberOfLines={1}>
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
          <View className="flex-row gap-1.5 bg-background p-1 rounded-lg mb-3">
            {(['EGP', 'USD'] as const).map((c) => {
              const sel = draft.amountCurrency === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => onChangeCurrency(c as Currency)}
                  className={`flex-1 py-1.5 rounded-md items-center ${sel ? 'bg-default/40' : ''}`}
                >
                  <Text className={`font-inter font-semibold text-[11px] ${sel ? 'text-accent' : 'text-foreground/60'}`}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/55 mb-1">
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
              <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/55 mb-1">
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
