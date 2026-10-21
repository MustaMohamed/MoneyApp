import React, { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { SelectablePill } from '@/components/ui/chip';
import { getVisibleScrollOffset } from '@/components/ui/scroll_reveal.geometry';
import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import {
  CHIP_SLOP_Y,
  HERO_SHELL_MARGIN_BOTTOM,
  ROW_PADDING_BOTTOM,
  ROW_PADDING_TOP,
} from './account_chips.geometry';
import type { AccountChipModel } from './account_chips.helpers';

/** Frame A1: 6 between chips, 8 below; 9 above plus the hero shell's edge reads A1's 10. */
const CHIP_GAP = ms(6);

/** Cancels the hero shell's bottom margin, which other hero states keep, so the padding alone sets the gap. */
const ROW_MARGIN_TOP = -HERO_SHELL_MARGIN_BOTTOM;

/** Horizontally the slop stops at half the gap, so a neighbour keeps its side. */
const CHIP_HIT_SLOP = Object.freeze({
  top: CHIP_SLOP_Y,
  bottom: CHIP_SLOP_Y,
  left: CHIP_GAP / 2,
  right: CHIP_GAP / 2,
});

const CHIP_STYLE = Object.freeze({ minHeight: Size.compactChipHeight });

/** Commitments canvas `.spill .id-tile`: a 20 square with a 14 glyph, as the account strip draws it. */
const CHIP_TILE = ms(20);

/** The pill's `border` class, unscaled CSS px; React Native counts it inside the chip's height. */
const PILL_BORDER_WIDTH = 1;

/** Beats the pill's `py-1.5`, so a tile chip holds the compact height; the frame's 6 on the left. */
const CHIP_TILE_PADDING = Object.freeze({
  paddingVertical: (Size.compactChipHeight - CHIP_TILE) / 2 - PILL_BORDER_WIDTH,
  paddingLeft: ms(6),
});

type ChipFrame = { x: number; width: number };

interface Props {
  chips: readonly AccountChipModel[];
  onToggle: (accountId: string | undefined) => void;
  testID: string;
}

export function AccountChips({ chips, onToggle, testID }: Props): React.ReactElement {
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
    const x = getVisibleScrollOffset({
      currentOffset: scrollXRef.current,
      viewportWidth,
      itemX: frame.x - Spacing.md,
      itemWidth: frame.width + 2 * Spacing.md,
    });
    if (x !== undefined) scrollRef.current?.scrollTo({ x, animated: true });
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
      // With Android's overscroll on, a row flung back to its start rests past it and the next tap only moves it back.
      overScrollMode="never"
      testID={testID}
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
        const { accountId, tile } = chip;
        return (
          <SelectablePill
            key={accountId ?? 'all'}
            label={chip.label}
            accessibilityLabel={chip.accessibilityLabel}
            startIcon={
              tile === undefined ? undefined : (
                <AccountColorTile
                  color={tile.color}
                  type={tile.type}
                  size={CHIP_TILE}
                  glyphSize={Size.rowGlyph}
                />
              )
            }
            selected={chip.selected}
            onPress={() => onToggle(accountId)}
            onLayout={
              accountId === undefined
                ? undefined
                : (event: LayoutChangeEvent) => handleChipLayout(accountId, event)
            }
            style={tile === undefined ? CHIP_STYLE : [CHIP_STYLE, CHIP_TILE_PADDING]}
            hitSlop={CHIP_HIT_SLOP}
          />
        );
      })}
    </ScrollView>
  );
}
