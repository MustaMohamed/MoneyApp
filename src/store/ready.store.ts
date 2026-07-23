import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

export type AppStartupStatus = 'initializing' | 'ready' | 'fatalError';

interface AppReadyState {
  status: AppStartupStatus;
  generation: number;
  error: unknown | null;
}

const INITIAL_STATE: AppReadyState = {
  status: 'initializing',
  generation: 0,
  error: null,
};

type AppReadyStore = AppReadyState & {
  begin: () => number;
  resolveReady: (generation: number) => void;
  rejectFatal: (generation: number, error: unknown) => void;
  reset: () => void;
};

export const useAppReadyStore = createMoneyAppSelectors(
  create<AppReadyStore>((set, get) => ({
    ...INITIAL_STATE,
    begin: () => {
      const generation = get().generation + 1;
      set({ status: 'initializing', generation });
      return generation;
    },
    resolveReady: (generation) => {
      if (generation !== get().generation) return;
      set({ status: 'ready', error: null });
    },
    rejectFatal: (generation, error) => {
      if (generation !== get().generation) return;
      set({ status: 'fatalError', error });
    },
    reset: () =>
      set((state) => ({
        status: 'initializing',
        generation: state.generation + 1,
        error: null,
      })),
  })),
);
