import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { type RefObject, useCallback, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import { usePendingFrame } from './pending_frame.hook';

interface TransactionFormNoteReveal {
  scrollRef: RefObject<BottomSheetScrollViewMethods | null>;
  handleScrollLayout: (event: LayoutChangeEvent) => void;
  handleNoteFocus: () => void;
  handleNoteBlur: () => void;
}

/** A focus on the Note, and a shrink of the form's scroll while the Note holds focus, each end with the scroll at its end, where the Note sits. */
export function useTransactionFormNoteReveal(): TransactionFormNoteReveal {
  const scrollRef = useRef<BottomSheetScrollViewMethods | null>(null);
  const noteFocusedRef = useRef(false);
  const lastHeightRef = useRef<number | undefined>(undefined);
  const requestFrame = usePendingFrame();

  const scrollToEndNextFrame = useCallback(() => {
    requestFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [requestFrame]);

  const handleScrollLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      const previousHeight = lastHeightRef.current;
      lastHeightRef.current = height;
      if (previousHeight === undefined || height >= previousHeight) return;
      if (!noteFocusedRef.current) return;
      // A view command runs before the mount items queued with it, so the scroll waits for the frame after the shrink mounts.
      scrollToEndNextFrame();
    },
    [scrollToEndNextFrame],
  );

  const handleNoteFocus = useCallback(() => {
    noteFocusedRef.current = true;
    // With the keyboard already up the scroll's frame does not shrink, so the focus asks for the end itself.
    scrollToEndNextFrame();
  }, [scrollToEndNextFrame]);

  const handleNoteBlur = useCallback(() => {
    noteFocusedRef.current = false;
  }, []);

  return { scrollRef, handleScrollLayout, handleNoteFocus, handleNoteBlur };
}
