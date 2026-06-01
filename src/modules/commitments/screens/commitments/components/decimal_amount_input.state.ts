import { type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type DecimalInputState = {
  text: ReadonlySignal<string>;
};

type DecimalInputActions = {
  setText: (text: string) => void;
  syncToValue: (text: string) => void;
};

export function useDecimalInputState(initialText: string): {
  state: DecimalInputState;
} & DecimalInputActions {
  const text = useSignal(initialText);

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

  return {
    state: { text },
    setText,
    syncToValue,
  };
}
