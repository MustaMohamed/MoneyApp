import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { resolveAccountStripRevealX } from './form_sheet.geometry';
import { usePendingFrame } from './pending_frame.hook';

interface AccountStripReveal {
  scrollRef: RefObject<BottomSheetScrollViewMethods | null>;
  handleLayout: (event: LayoutChangeEvent) => void;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleChipPress: (index: number) => void;
}

/** Scrolls the strip so its selected chip reads whole, after a layout, a new selection, a reveal key change or a press of the selected chip; it writes nothing. */
export function useAccountStripReveal(
  selectedIndex: number,
  revealKey: string | undefined,
): AccountStripReveal {
  const scrollRef = useRef<BottomSheetScrollViewMethods | null>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const viewportWidthRef = useRef(0);
  const scrollXRef = useRef(0);
  const requestFrame = usePendingFrame();

  const requestReveal = useCallback(() => {
    // A view command runs before the mount items queued with it, so the scroll waits for the frame after the chips mount.
    requestFrame(() => {
      const index = selectedIndexRef.current;
      if (index < 0) return;
      const scrollX = scrollXRef.current;
      const x = resolveAccountStripRevealX({
        index,
        viewportWidth: viewportWidthRef.current,
        scrollX,
      });
      if (x !== scrollX) scrollRef.current?.scrollTo({ x, animated: true });
    });
  }, [requestFrame]);

  // A type with no chip unmounts the scroll view, and the next one mounts at offset 0 and sends no scroll event.
  useEffect(() => {
    if (scrollRef.current === null) scrollXRef.current = 0;
  });

  // Two owners can hand the strip the same chips and index, so a key change is the only sign of that switch.
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
    requestReveal();
  }, [selectedIndex, revealKey, requestReveal]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (width === viewportWidthRef.current) return;
      viewportWidthRef.current = width;
      requestReveal();
    },
    [requestReveal],
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // gorhom sends each event as a JS task of its own, so one can land after the unmount has reset the offset.
    if (scrollRef.current === null) return;
    scrollXRef.current = event.nativeEvent.contentOffset.x;
  }, []);

  const handleChipPress = useCallback(
    (index: number) => {
      // A press on any other chip changes `selectedIndex`, and that change asks.
      if (index === selectedIndexRef.current) requestReveal();
    },
    [requestReveal],
  );

  return { scrollRef, handleLayout, handleScroll, handleChipPress };
}
