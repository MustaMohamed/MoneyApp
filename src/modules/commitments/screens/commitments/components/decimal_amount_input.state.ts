import { type Signal, useSignal } from '@preact/signals-react';
import { useCallback, useRef } from 'react';

type DecimalInputState = {
  text: Signal<string>;
};

type DecimalInputActions = {
  setText: (text: string) => void;
  syncToValue: (text: string) => void;
};

export function useDecimalInputState(initialText: string): {
  state: DecimalInputState;
} & DecimalInputActions {
  const initialTextRef = useRef(initialText);
  const text = useSignal(initialTextRef.current);

  const setText = useCallback(
    (nextText: string) => {
      text.value = nextText;
    },
    [text],
  );

  const syncToValue = useCallback(
    (nextText: string) => {
      text.value = nextText;
    },
    [text],
  );

  return { state: { text }, setText, syncToValue };
}
