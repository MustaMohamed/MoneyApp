import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Keyboard, type TextInput } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';

import { refusesOpen, useRateEditorSheetState } from './rate_editor_sheet.state';

/** Opens the owner's editor without subscribing to it; a refused reopen changes nothing. */
export function openRateEditor(ownerId: string, value: string): void {
  const editorState = useRateEditorSheetState.getState();
  if (refusesOpen(editorState, ownerId)) return;
  // gorhom replays a keyboard show cached before the field's focus without the navigation bar's inset, so the editor lifts short.
  Keyboard.dismiss();
  editorState.open(ownerId, value);
}

export function useRateEditor(
  ownerId: string,
  value: string,
  onCommit: (text: string) => boolean,
  storedRateText: string,
) {
  const { activeOwnerId, isOpen, draft, error } = useRateEditorSheetState(
    useShallow((state) => ({
      activeOwnerId: state.activeOwnerId,
      isOpen: state.isOpen,
      draft: state.draft,
      error: state.error,
    })),
  );
  // The actions below keep their identity per owner and read these at call time.
  const valueRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  const storedRateTextRef = useRef(storedRateText);
  useLayoutEffect(() => {
    valueRef.current = value;
    onCommitRef.current = onCommit;
    storedRateTextRef.current = storedRateText;
  });

  const actions = useMemo(() => {
    const store = useRateEditorSheetState.getState();
    return {
      open: () => openRateEditor(ownerId, valueRef.current),
      setDraft: (text: string) => store.setDraft(ownerId, text),
      // Refills the field and keeps the editor open; only Done writes the rate.
      resetToStoredRate: () => store.setDraft(ownerId, storedRateTextRef.current),
      cancel: () => store.close(ownerId),
      // Only Done checks the rate; a keystroke clears the message and checks nothing.
      done: () => {
        const editorState = useRateEditorSheetState.getState();
        if (editorState.activeOwnerId !== ownerId || !editorState.isOpen) return;
        if (onCommitRef.current(editorState.draft)) store.close(ownerId);
        else store.refuse(ownerId, Strings.addTxErrRateInvalid);
      },
      settleOpen: () => store.settleOpen(ownerId),
      settleClose: () => store.settleClose(ownerId),
    };
  }, [ownerId]);

  useEffect(() => () => useRateEditorSheetState.getState().release(ownerId), [ownerId]);

  const ownsEditor = activeOwnerId === ownerId;

  return {
    state: {
      isOpen: ownsEditor && isOpen,
      draft: ownsEditor ? draft : value,
      error: ownsEditor ? error : undefined,
    },
    ...actions,
  };
}

export function useRateEditorFocus(): {
  inputRef: RefObject<TextInput | null>;
  focusInput: () => void;
} {
  const inputRef = useRef<TextInput | null>(null);
  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  return { inputRef, focusInput };
}
