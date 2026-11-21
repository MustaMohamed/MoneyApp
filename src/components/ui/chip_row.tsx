import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  type ScrollViewInstance,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { SelectablePill } from '@/components/ui/chip';
import {
  SELECTABLE_PILL_PADDING_BLOCK,
  SELECTABLE_PILL_PADDING_INLINE,
} from '@/components/ui/chip.geometry';
import { HERO_SHELL_MARGIN_BOTTOM } from '@/components/ui/hero_shell.geometry';
import { getVisibleScrollOffset } from '@/components/ui/scroll_reveal.geometry';
import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import {
  CHIP_DOT,
  CHIP_SLOP_Y,
  CHIP_TILE,
  ROW_PADDING_BOTTOM,
  ROW_PADDING_TOP,
  resolveTileChipPaddingVertical,
} from './chip_row.geometry';
import type { ChipLead, ChipRowModel } from './chip_row.helpers';

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

/** The frame's 6 left of the tile; the right padding stays the pill's own. */
const CHIP_TILE_PADDING_LEFT = ms(6);

/** Beats the pill's adornment `py-1.5 px-2.5`, so a dot chip reads as tall as All. */
const DOT_CHIP_STYLE = Object.freeze([
  CHIP_STYLE,
  {
    paddingVertical: SELECTABLE_PILL_PADDING_BLOCK,
    paddingHorizontal: SELECTABLE_PILL_PADDING_INLINE,
  },
]);

const DOT_STYLE = Object.freeze({ width: CHIP_DOT, height: CHIP_DOT, borderRadius: CHIP_DOT / 2 });

type ChipFrame = { x: number; width: number };

interface Props {
  chips: readonly ChipRowModel[];
  /** `undefined` is the All chip. */
  onToggle: (id: string | undefined) => void;
  testID: string;
}

function ChipLeadView({ lead }: { lead: ChipLead }): React.ReactElement {
  if (lead.kind === 'dot') return <View style={[DOT_STYLE, { backgroundColor: lead.color }]} />;
  return (
    <AccountColorTile
      color={lead.color}
      type={lead.type}
      size={CHIP_TILE}
      glyphSize={Size.rowGlyph}
    />
  );
}

export function ChipRow({ chips, onToggle, testID }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  // Beats the pill's `py-1.5`, so a tile chip reads as tall as All accounts.
  const tileChipStyle = useMemo(
    () => [
      CHIP_STYLE,
      {
        paddingVertical: resolveTileChipPaddingVertical(fontScale),
        paddingLeft: CHIP_TILE_PADDING_LEFT,
      },
    ],
    [fontScale],
  );
  const scrollRef = useRef<ScrollViewInstance>(null);
  const chipFramesRef = useRef(new Map<string, ChipFrame>());
  const viewportWidthRef = useRef(0);
  const scrollXRef = useRef(0);
  const selectedIdRef = useRef<string | undefined>(undefined);
  const selectedId = chips.find((chip) => chip.selected)?.id;

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
    (id: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipFramesRef.current.set(id, { x, width });
      if (id === selectedIdRef.current) revealSelected();
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
        const { id, lead } = chip;
        return (
          <SelectablePill
            key={id ?? 'all'}
            label={chip.label}
            accessibilityLabel={chip.accessibilityLabel}
            startIcon={lead === undefined ? undefined : <ChipLeadView lead={lead} />}
            selected={chip.selected}
            onPress={() => onToggle(id)}
            onLayout={
              id === undefined
                ? undefined
                : (event: LayoutChangeEvent) => handleChipLayout(id, event)
            }
            style={
              lead === undefined ? CHIP_STYLE : lead.kind === 'dot' ? DOT_CHIP_STYLE : tileChipStyle
            }
            hitSlop={CHIP_HIT_SLOP}
          />
        );
      })}
    </ScrollView>
  );
}
