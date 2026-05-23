import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

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

function selectionKey(sel: CarouselSelection): string {
  if (sel.type === 'all') return 'all';
  if (sel.type === 'custom') return 'custom';
  return sel.yearMonth;
}

export function MonthCarousel({
  now = new Date(),
  selection,
  customRange,
  onSelect,
  onOpenCustom,
}: Props): React.ReactElement {
  const pills = useMemo(() => computeCarouselPills(now), [now]);
  const scrollRef = useRef<ScrollView>(null);
  const [pillOffsets, setPillOffsets] = useState<Record<string, number>>({});

  const currentKey = selectionKey(selection);

  // Auto-scroll to the selected pill when its offset is measured or selection changes
  useEffect(() => {
    const offset = pillOffsets[currentKey];
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- runtime guard for Record index access
    if (offset !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ x: offset, animated: false });
    }
  }, [currentKey, pillOffsets]);

  const snapToOffsets = useMemo(
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- runtime guard for Record index access
    () => pills.map((p) => pillOffsets[pillKey(p)]).filter((x): x is number => x !== undefined),
    [pills, pillOffsets],
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
      decelerationRate="fast"
      snapToOffsets={snapToOffsets.length > 0 ? snapToOffsets : undefined}
      snapToAlignment="start"
    >
      {pills.map((p) => {
        const key = pillKey(p);
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
            key={key}
            onPress={handlePress}
            onLayout={(event) => {
              const x = event.nativeEvent.layout.x;
              setPillOffsets((prev) => {
                if (prev[key] === x) return prev;
                return { ...prev, [key]: x };
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            accessibilityState={{ selected }}
            className={
              selected
                ? 'bg-accent rounded-full px-2.5 py-1.5'
                : 'bg-default/40 rounded-full px-2.5 py-1.5'
            }
          >
            <Text
              className={
                selected
                  ? 'font-inter text-accent-foreground text-[11px] font-bold'
                  : 'font-inter text-foreground/60 text-[11px] font-medium'
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
