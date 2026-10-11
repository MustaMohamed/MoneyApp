import { useFocusEffect } from 'expo-router';
import { type RefObject, useCallback, useRef } from 'react';
import { type View, useWindowDimensions } from 'react-native';

import { resolveFloatingAlertToastClearance } from '@/components/ui/load_error_alert.geometry';
import { holdAlertToastClearance } from '@/components/ui/toast_clearance.state';

interface FloatingAlertToastHold {
  frameRef: RefObject<View | null>;
  holdClearance: () => void;
}

/** Holds the toast clear of a floating alert's top while its screen has focus; `holdClearance` runs on each layout. */
export function useFloatingAlertToastHold(): FloatingAlertToastHold {
  const { height: windowHeight } = useWindowDimensions();
  const frameRef = useRef<View | null>(null);
  const holdRef = useRef<{ focused: boolean; release: (() => void) | undefined }>({
    focused: false,
    release: undefined,
  });

  const holdClearance = useCallback(() => {
    frameRef.current?.measureInWindow((_left, top) => {
      const hold = holdRef.current;
      if (!hold.focused) return;
      // A new hold takes the owner slot, so the release it replaces is already dead.
      hold.release = holdAlertToastClearance(resolveFloatingAlertToastClearance(windowHeight, top));
    });
  }, [windowHeight]);

  useFocusEffect(
    useCallback(() => {
      const hold = holdRef.current;
      hold.focused = true;
      holdClearance();
      return () => {
        hold.focused = false;
        hold.release?.();
        hold.release = undefined;
      };
    }, [holdClearance]),
  );

  return { frameRef, holdClearance };
}
