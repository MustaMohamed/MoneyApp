import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';

interface TransactionFormNoteReveal {
  scrollRef: RefObject<BottomSheetScrollViewMethods | null>;
  handleScrollLayout: (event: LayoutChangeEvent) => void;
  handleNoteFocus: () => void;
  handleNoteBlur: () => void;
}

/** With the Note focused, a shrink of the form's scroll ends with the scroll at its end, where the Note sits. */
export function useTransactionFormNoteReveal(): TransactionFormNoteReveal {
  const scrollRef = useRef<BottomSheetScrollViewMethods | null>(null);
  const noteFocusedRef = useRef(false);
  const lastHeightRef = useRef<number | undefined>(undefined);
  const revealFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | undefined>(undefined);

  useEffect(
    () => () => {
      if (revealFrameRef.current !== undefined) cancelAnimationFrame(revealFrameRef.current);
    },
    [],
  );

  const handleScrollLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    const previousHeight = lastHeightRef.current;
    lastHeightRef.current = height;
    if (previousHeight === undefined || height >= previousHeight) return;
    if (!noteFocusedRef.current || revealFrameRef.current !== undefined) return;
    // A view command runs before the mount items queued with it, so the scroll waits for the frame after the shrink mounts.
    revealFrameRef.current = requestAnimationFrame(() => {
      revealFrameRef.current = undefined;
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  const handleNoteFocus = useCallback(() => {
    noteFocusedRef.current = true;
  }, []);

  const handleNoteBlur = useCallback(() => {
    noteFocusedRef.current = false;
  }, []);

  return { scrollRef, handleScrollLayout, handleNoteFocus, handleNoteBlur };
}
