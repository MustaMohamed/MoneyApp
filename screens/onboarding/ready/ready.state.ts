import { create } from 'zustand';

interface ReadyStateShape {
  completing: boolean;
}

interface ReadyState {
  state: ReadyStateShape;
  setCompleting: (completing: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: ReadyStateShape = { completing: false };

export const useReadyState = create<ReadyState>((set) => ({
  state: INITIAL_STATE,
  setCompleting: (completing) => set((s) => ({ state: { ...s.state, completing } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
