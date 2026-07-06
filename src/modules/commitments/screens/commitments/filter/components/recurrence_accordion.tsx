import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import { COMMITMENT_RECURRENCE_OPTIONS } from '../filter_options';

interface Props {
  selectedPresets: RecurrencePreset[];
  selectedCount: number;
  summary: string;
  expanded: boolean;
  onToggleSection: () => void;
  onTogglePreset: (preset: RecurrencePreset) => void;
}

export function CommitmentRecurrenceAccordion({
  selectedPresets,
  selectedCount,
  summary,
  expanded,
  onToggleSection,
  onTogglePreset,
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
                  {Strings.filterSectionRecurrence}
                </Text>
                {selectedCount > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text className="font-inter text-accent text-[10px] font-bold">
                      {selectedCount}
                    </Text>
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
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {COMMITMENT_RECURRENCE_OPTIONS.map((option) => (
                <SelectablePill
                  key={option.value}
                  label={option.label}
                  selected={selectedPresets.includes(option.value)}
                  onPress={() => onTogglePreset(option.value)}
                  startIcon={
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={ms(13)}
                      color={CoreTokens.text2}
                    />
                  }
                  checkable
                  accessibilityLabel={`${option.label}, commitment recurrence filter`}
                />
              ))}
            </View>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}
