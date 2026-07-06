import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

import type { TabSegment } from './tabs';

export type SegmentedTabsScrollAlign = 'start' | 'center' | 'end' | 'none' | 'visible';

type HeroUIScrollAlign = Exclude<SegmentedTabsScrollAlign, 'visible'>;

interface VisibleScrollOffsetParams {
  currentOffset: number;
  viewportWidth: number;
  itemX: number;
  itemWidth: number;
  contentWidth: number;
}

export function getVisibleScrollOffset({
  currentOffset,
  viewportWidth,
  itemX,
  itemWidth,
  contentWidth,
}: VisibleScrollOffsetParams): number | undefined {
  if (viewportWidth <= 0 || itemWidth <= 0 || contentWidth <= viewportWidth) return undefined;

  const itemStart = itemX;
  const itemEnd = itemX + itemWidth;
  const visibleStart = currentOffset;
  const visibleEnd = currentOffset + viewportWidth;

  if (itemStart >= visibleStart && itemEnd <= visibleEnd) return undefined;

  const unclampedOffset = itemStart < visibleStart ? itemStart : itemEnd - viewportWidth;
  const maxOffset = Math.max(0, contentWidth - viewportWidth);

  return Math.min(Math.max(0, unclampedOffset), maxOffset);
}

interface UseSegmentedTabsScrollParams<T extends string> {
  scrollAlign: SegmentedTabsScrollAlign;
  value: T;
  segments: ReadonlyArray<TabSegment<T>>;
  segmentWidth?: number;
}

export function useSegmentedTabsScroll<T extends string>({
  scrollAlign,
  value,
  segments,
  segmentWidth,
}: UseSegmentedTabsScrollParams<T>) {
  const scrollViewRef = useRef<ScrollView>(null);
  const currentOffsetRef = useRef(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const isVisibleScroll = scrollAlign === 'visible' && segmentWidth != null;

  const heroUiScrollAlign: HeroUIScrollAlign = isVisibleScroll
    ? 'none'
    : scrollAlign === 'visible'
      ? 'center'
      : scrollAlign;

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentOffsetRef.current = event.nativeEvent.contentOffset.x;
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setViewportWidth((width) => (width === nextWidth ? width : nextWidth));
  }, []);

  useEffect(() => {
    if (!isVisibleScroll) return;

    const selectedIndex = segments.findIndex((segment) => segment.value === value);
    if (selectedIndex < 0) return;

    const nextOffset = getVisibleScrollOffset({
      currentOffset: currentOffsetRef.current,
      viewportWidth,
      itemX: selectedIndex * segmentWidth,
      itemWidth: segmentWidth,
      contentWidth: segments.length * segmentWidth,
    });

    if (nextOffset == null) return;

    currentOffsetRef.current = nextOffset;
    scrollViewRef.current?.scrollTo({ x: nextOffset, animated: true });
  }, [isVisibleScroll, segmentWidth, segments, value, viewportWidth]);

  return {
    heroUiScrollAlign,
    scrollViewRef: isVisibleScroll ? scrollViewRef : undefined,
    onScroll: isVisibleScroll ? handleScroll : undefined,
    onLayout: isVisibleScroll ? handleLayout : undefined,
    scrollEventThrottle: isVisibleScroll ? 16 : undefined,
  };
}
