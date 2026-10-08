import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

import { getVisibleScrollOffset, type VisibleScrollOffsetParams } from './scroll_reveal.geometry';
import type { TabSegment } from './tabs';
import { TABS_SCROLL_CONTENT_INSET } from './tabs.geometry';

export type SegmentedTabsScrollAlign = 'start' | 'center' | 'end' | 'none' | 'visible';

type HeroUIScrollAlign = Exclude<SegmentedTabsScrollAlign, 'visible'>;

export function getSegmentScrollBox(
  selectedIndex: number,
  segmentWidth: number,
  segmentCount: number,
): Required<Pick<VisibleScrollOffsetParams, 'itemX' | 'itemWidth' | 'contentWidth'>> {
  return {
    itemX: TABS_SCROLL_CONTENT_INSET + selectedIndex * segmentWidth,
    itemWidth: segmentWidth,
    contentWidth: segmentCount * segmentWidth + 2 * TABS_SCROLL_CONTENT_INSET,
  };
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
      ...getSegmentScrollBox(selectedIndex, segmentWidth, segments.length),
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
