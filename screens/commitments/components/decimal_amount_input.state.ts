import { useRef } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

interface DecimalInputState {
  state: { text: string };
  setText: (text: string) => void;
  syncToValue: (text: string) => void;
}

function createStore(initialText: string) {
  return create<DecimalInputState>((set) => ({
    state: { text: initialText },
    setText: (text) => set((s) => ({ state: { ...s.state, text } })),
    syncToValue: (text) => set((s) => ({ state: { ...s.state, text } })),
  }));
}

type Store = ReturnType<typeof createStore>;

export function useDecimalInputState(initialText: string) {
  const storeRef = useRef<Store | null>(null);
  storeRef.current ??= createStore(initialText);
  return storeRef.current(
    useShallow((s) => ({ state: s.state, setText: s.setText, syncToValue: s.syncToValue })),
  );
}
