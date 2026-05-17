import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';

import { Strings } from '@/constants/strings';
import { Text } from '@/components/ui/text';
import {
  computeCarouselPills,
  type CarouselPill,
  type CarouselSelection,
} from '../transactions.helpers';

interface Props {
  now?: Date;
  selection: CarouselSelection;
  customRange: { from: string; to: string } | null;
  onSelect: (s: CarouselSelection) => void;
  onOpenCustom: () => void;
}

function pillKey(p: CarouselPill): string {
  if (p.kind === 'all') return 'all';
  if (p.kind === 'custom') return 'custom';
  return p.yearMonth;
}

function pillLabel(p: CarouselPill, customRange: { from: string; to: string } | null): string {
  if (p.kind === 'all') return Strings.carouselAllLabel;
  if (p.kind === 'custom') {
    return customRange
      ? Strings.carouselCustomActiveLabel(customRange.from, customRange.to)
      : Strings.carouselCustomLabel;
  }
  return Strings.carouselMonthShort(p.yearMonth);
}

function isSelected(p: CarouselPill, sel: CarouselSelection): boolean {
  if (p.kind === 'all') return sel.type === 'all';
  if (p.kind === 'custom') return sel.type === 'custom';
  return sel.type === 'month' && sel.yearMonth === p.yearMonth;
}

export function MonthCarousel({
  now = new Date(),
  selection,
  customRange,
  onSelect,
  onOpenCustom,
}: Props): React.ReactElement {
  const pills = useMemo(() => computeCarouselPills(now), [now]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
      decelerationRate="fast"
    >
      {pills.map((p) => {
        const selected = isSelected(p, selection);
        const label = pillLabel(p, customRange);
        const a11y = `${label}${selected ? ', selected' : ''}, period filter`;
        const handlePress = () => {
          if (p.kind === 'all') return onSelect({ type: 'all' });
          if (p.kind === 'custom') return onOpenCustom();
          return onSelect({ type: 'month', yearMonth: p.yearMonth });
        };
        return (
          <Pressable
            key={pillKey(p)}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            accessibilityState={{ selected }}
            className={
              selected
                ? 'px-2.5 py-1.5 rounded-full bg-accent'
                : 'px-2.5 py-1.5 rounded-full bg-default/40'
            }
          >
            <Text
              className={
                selected
                  ? 'font-inter font-bold text-[11px] text-accent-foreground'
                  : 'font-inter font-medium text-[11px] text-foreground/60'
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
