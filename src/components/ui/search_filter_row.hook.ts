import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';

import { useAnySheetOpen } from '@/components/ui/sheet_visibility.state';

interface SearchFieldSheetFocus {
  inputRef: RefObject<TextInput | null>;
  handleFocus: () => void;
  handleBlur: () => void;
}

/** A search field that held focus when a sheet opened and lost it while the sheet was up takes it back when the last sheet closes. */
export function useSearchFieldSheetFocus(): SearchFieldSheetFocus {
  const inputRef = useRef<TextInput | null>(null);
  const isFocusedRef = useRef(false);
  const heldFocusAtOpenRef = useRef(false);
  const anySheetOpen = useAnySheetOpen();

  useEffect(() => {
    if (anySheetOpen) {
      heldFocusAtOpenRef.current = isFocusedRef.current;
      return;
    }
    if (heldFocusAtOpenRef.current && !isFocusedRef.current) inputRef.current?.focus();
    heldFocusAtOpenRef.current = false;
  }, [anySheetOpen]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
  }, []);

  return { inputRef, handleFocus, handleBlur };
}
