import React, { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Size, Spacing, TouchSize } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import type { AccountChipModel } from './account_chips.helpers';

/** Frame A1: 6 between chips, 8 below; 9 above plus the hero shell's edge reads A1's 10. */
const CHIP_GAP = ms(6);
const ROW_PADDING_TOP = ms(9);
const ROW_PADDING_BOTTOM = Spacing.xs;

/** Cancels the hero shell's bottom margin, which other hero states keep, so the padding alone sets the gap. */
const ROW_MARGIN_TOP = -Spacing.xs;

/** Lifts the compact chip to the touch floor without reaching into a neighbour's half of the gap. */
const CHIP_HIT_SLOP = Object.freeze({
  top: (TouchSize.min - Size.compactChipHeight) / 2,
  bottom: (TouchSize.min - Size.compactChipHeight) / 2,
  left: CHIP_GAP / 2,
  right: CHIP_GAP / 2,
});

const CHIP_STYLE = Object.freeze({ minHeight: Size.compactChipHeight });

type ChipFrame = { x: number; width: number };

interface Props {
  chips: readonly AccountChipModel[];
  onToggle: (accountId: string | undefined) => void;
}

export function AccountChips({ chips, onToggle }: Props): React.ReactElement {
  const scrollRef = useRef<ScrollView>(null);
  const chipFramesRef = useRef(new Map<string, ChipFrame>());
  const viewportWidthRef = useRef(0);
  const scrollXRef = useRef(0);
  const selectedIdRef = useRef<string | undefined>(undefined);
  const selectedId = chips.find((chip) => chip.selected)?.accountId;

  const revealSelected = useCallback(() => {
    const id = selectedIdRef.current;
    const frame = id === undefined ? undefined : chipFramesRef.current.get(id);
    const viewportWidth = viewportWidthRef.current;
    if (frame === undefined || viewportWidth === 0) return;
    const x = scrollXRef.current;
    const start = frame.x - Spacing.md;
    const end = frame.x + frame.width + Spacing.md - viewportWidth;
    const target = start < x ? start : end > x ? end : x;
    if (target !== x) scrollRef.current?.scrollTo({ x: Math.max(0, target), animated: true });
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    revealSelected();
  }, [revealSelected, selectedId]);

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportWidthRef.current = event.nativeEvent.layout.width;
      revealSelected();
    },
    [revealSelected],
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = event.nativeEvent.contentOffset.x;
  }, []);

  const handleChipLayout = useCallback(
    (accountId: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipFramesRef.current.set(accountId, { x, width });
      if (accountId === selectedIdRef.current) revealSelected();
    },
    [revealSelected],
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID="transactions-account-chips"
      onLayout={handleViewportLayout}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      style={{ marginTop: ROW_MARGIN_TOP }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.md,
        paddingTop: ROW_PADDING_TOP,
        paddingBottom: ROW_PADDING_BOTTOM,
        columnGap: CHIP_GAP,
        alignItems: 'center',
      }}
    >
      {chips.map((chip) => {
        const accountId = chip.accountId;
        return (
          <SelectablePill
            key={accountId ?? 'all'}
            label={chip.label}
            accessibilityLabel={chip.accessibilityLabel}
            dotColor={chip.dotColor}
            selected={chip.selected}
            onPress={() => onToggle(accountId)}
            onLayout={
              accountId === undefined
                ? undefined
                : (event: LayoutChangeEvent) => handleChipLayout(accountId, event)
            }
            style={CHIP_STYLE}
            hitSlop={CHIP_HIT_SLOP}
          />
        );
      })}
    </ScrollView>
  );
}
