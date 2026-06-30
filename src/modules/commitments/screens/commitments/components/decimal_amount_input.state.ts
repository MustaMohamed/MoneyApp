import { useRef } from 'react';
import { create } from 'zustand';

type DecimalInputState = { text: string } & {
  setText: (text: string) => void;
  syncToValue: (text: string) => void;
};

function createStore(initialText: string) {
  return create<DecimalInputState>((set) => ({
    text: initialText,
    setText: (text) => set({ text }),
    syncToValue: (text) => set({ text }),
  }));
}

type Store = ReturnType<typeof createStore>;

export function useDecimalInputState(initialText: string) {
  const storeRef = useRef<Store | null>(null);
  storeRef.current ??= createStore(initialText);
  const text = storeRef.current((s) => s.text);
  const setText = storeRef.current((s) => s.setText);
  const syncToValue = storeRef.current((s) => s.syncToValue);
  return { state: { text }, setText, syncToValue };
}
