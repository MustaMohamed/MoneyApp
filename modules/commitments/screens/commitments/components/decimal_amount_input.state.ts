import { useRef } from 'react';
import { create } from 'zustand';

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
  const text = storeRef.current((s) => s.state.text);
  const setText = storeRef.current((s) => s.setText);
  const syncToValue = storeRef.current((s) => s.syncToValue);
  return { state: { text }, setText, syncToValue };
}
