import { create } from 'zustand';

interface ReadyStateShape {
  completing: boolean;
}

type ReadyState = ReadyStateShape & {
  setCompleting: (completing: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: ReadyStateShape = { completing: false };

export const useReadyState = create<ReadyState>((set) => ({
  ...INITIAL_STATE,
  setCompleting: (completing) => set((s) => ({ ...s, completing })),
  reset: () => set(INITIAL_STATE),
}));
