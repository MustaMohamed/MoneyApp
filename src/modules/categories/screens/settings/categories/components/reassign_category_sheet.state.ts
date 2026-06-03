import { batch, type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

type ReassignCategorySheetState = {
  selectedId: Signal<string | null>;
  isLoading: Signal<boolean>;
};

type ReassignCategorySheetActions = {
  setSelectedId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  reset: () => void;
};

export function useReassignCategorySheetState(): {
  state: ReassignCategorySheetState;
} & ReassignCategorySheetActions {
  const selectedId = useSignal<string | null>(null);
  const isLoading = useSignal(false);

  const setSelectedId = useCallback(
    (id: string | null) => {
      selectedId.value = id;
    },
    [selectedId],
  );

  const setIsLoading = useCallback(
    (v: boolean) => {
      isLoading.value = v;
    },
    [isLoading],
  );

  const reset = useCallback(() => {
    batch(() => {
      selectedId.value = null;
      isLoading.value = false;
    });
  }, [isLoading, selectedId]);

  return {
    state: {
      selectedId,
      isLoading,
    },
    setSelectedId,
    setIsLoading,
    reset,
  };
}
