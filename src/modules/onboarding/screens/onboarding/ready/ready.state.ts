import { useSignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

export function useReadyScreenState() {
  useSignals();
  const completing = useSignal(false);

  const setCompleting = (nextCompleting: boolean) => {
    completing.value = nextCompleting;
  };

  return { state: { completing }, setCompleting };
}
