import { type RefObject, useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';

import { useRateEditorSheetState } from './rate_editor_sheet.state';

export function useRateEditor(ownerId: string, value: string, onCommit: (text: string) => boolean) {
  const { activeOwnerId, isOpen, draft, error } = useRateEditorSheetState(
    useShallow((state) => ({
      activeOwnerId: state.activeOwnerId,
      isOpen: state.isOpen,
      draft: state.draft,
      error: state.error,
    })),
  );
  const openEditor = useRateEditorSheetState.getState().open;
  const setDraftText = useRateEditorSheetState.getState().setDraft;
  const refuse = useRateEditorSheetState.getState().refuse;
  const close = useRateEditorSheetState.getState().close;
  const release = useRateEditorSheetState.getState().release;

  useEffect(() => () => release(ownerId), [ownerId, release]);

  const ownsEditor = activeOwnerId === ownerId;

  // Only Done checks the rate; a keystroke clears the message and checks nothing.
  function done() {
    const editorState = useRateEditorSheetState.getState();
    if (editorState.activeOwnerId !== ownerId) return;
    if (onCommit(editorState.draft)) close(ownerId);
    else refuse(ownerId, Strings.addTxErrRateInvalid);
  }

  return {
    state: {
      isOpen: ownsEditor && isOpen,
      draft: ownsEditor ? draft : value,
      error: ownsEditor ? error : undefined,
    },
    open: () => openEditor(ownerId, value),
    setDraft: (text: string) => setDraftText(ownerId, text),
    cancel: () => close(ownerId),
    done,
  };
}

export function useRateEditorFocus(): {
  inputRef: RefObject<TextInput | null>;
  focusInput: () => void;
} {
  const inputRef = useRef<TextInput | null>(null);
  return { inputRef, focusInput: () => inputRef.current?.focus() };
}
